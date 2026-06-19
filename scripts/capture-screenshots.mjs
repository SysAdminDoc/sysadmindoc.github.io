#!/usr/bin/env node
// Capture screenshots of every live web app using Playwright.
// Writes public/screenshots/<slug>.jpg as the detail capture,
// public/screenshots/thumbs/<slug>.jpg as the stable public card thumbnail, and
// src/assets/screenshots/thumbs/<slug>.jpg as the Astro-managed <Picture> input.
//
// Usage:
//   npm install --no-save playwright   # one-time install
//   npx playwright install chromium    # one-time install
//   npm run capture-screenshots
//
// Why separate script (not CI): Chromium is ~170MB; running in GH Actions on every
// build wastes minutes. Capture locally, commit the JPGs, ship them. Only need to
// re-run when UI changes significantly or new live apps are added.

import { mkdirSync, readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ts from 'typescript';
import { stringProperty } from './lib/ts-data-utils.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const projectsPath = join(root, 'src', 'data', 'projects.ts');

function collectLiveEntries() {
  const sourceText = readFileSync(projectsPath, 'utf8');
  const source = ts.createSourceFile(projectsPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const results = [];

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'liveApps') continue;
      if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) continue;
      for (const element of declaration.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        const slug = stringProperty(element, 'slug');
        const url = stringProperty(element, 'url');
        if (slug && url) results.push({ slug, url });
      }
    }
  }

  return results;
}

const entries = collectLiveEntries().filter((entry) => /^https?:\/\//.test(entry.url));

if (entries.length === 0) {
  console.error('No live app entries were parsed from src/data/projects.ts');
  process.exit(1);
}

console.log(`Capturing ${entries.length} live apps...`);

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright not installed.\nRun: npm install --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const outDir = join(root, 'public', 'screenshots');
const thumbDir = join(outDir, 'thumbs');
const astroThumbDir = join(root, 'src', 'assets', 'screenshots', 'thumbs');
const manifestPath = join(outDir, 'manifest.json');
mkdirSync(outDir, { recursive: true });
mkdirSync(thumbDir, { recursive: true });
mkdirSync(astroThumbDir, { recursive: true });

const VIEWPORT = { width: 1280, height: 800 };
const DEVICE_SCALE = 1.25;
const COLOR_SCHEME = 'dark';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: DEVICE_SCALE,
  colorScheme: COLOR_SCHEME,
});

const manifest = [];

let ok = 0;
let fail = 0;
const CONCURRENCY = 4;

async function captureOne({ slug, url }) {
  const out = join(outDir, `${slug}.jpg`);
  const thumb = join(thumbDir, `${slug}.jpg`);
  const astroThumb = join(astroThumbDir, `${slug}.jpg`);
  const page = await ctx.newPage();
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response) {
      throw new Error('No response received');
    }
    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()}`);
    }

    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      // Some live apps keep background work active. Continue after a short settle delay.
    }

    await page.waitForTimeout(1500);

    const title = await page.title().catch(() => '');
    const bodyText = await page.locator('body').textContent().catch(() => '');
    const errorHint = `${title} ${bodyText}`.slice(0, 400);
    if (/\b(404|not found|cannot reach|failed to load|this site can.t be reached)\b/i.test(errorHint)) {
      throw new Error('Detected error-page content');
    }

    const screenshot = await page.screenshot({ type: 'jpeg', quality: 78, fullPage: false });
    writeFileSync(out, screenshot);
    const thumbnail = await sharp(screenshot)
      .resize({ width: 640, height: 400, fit: 'cover' })
      .jpeg({ quality: 68, mozjpeg: true })
      .toBuffer();
    writeFileSync(thumb, thumbnail);
    writeFileSync(astroThumb, thumbnail);
    const meta = await sharp(screenshot).metadata();
    manifest.push({
      slug,
      url,
      capturedAt: new Date().toISOString(),
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE,
      colorScheme: COLOR_SCHEME,
      dimensions: { width: meta.width, height: meta.height },
      thumbDimensions: { width: 640, height: 400 },
      bytes: screenshot.length,
      thumbBytes: thumbnail.length,
      sha256: createHash('sha256').update(screenshot).digest('hex'),
      result: 'ok',
    });
    ok += 1;
    console.log(`✓ ${slug}`);
  } catch (error) {
    manifest.push({
      slug,
      url,
      capturedAt: new Date().toISOString(),
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE,
      colorScheme: COLOR_SCHEME,
      result: 'fail',
      error: error.message,
    });
    fail += 1;
    const kept = existsSync(out) ? ' (kept previous screenshot assets)' : '';
    console.error(`✗ ${slug} — ${error.message}${kept}`);
  } finally {
    await page.close().catch(() => {});
  }
}

// Process entries with bounded concurrency for ~4x faster capture
let cursor = 0;
async function worker() {
  while (cursor < entries.length) {
    const index = cursor;
    cursor += 1;
    await captureOne(entries[index]);
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));

await browser.close();

writeFileSync(manifestPath, JSON.stringify({
  schema: 'sysadmindoc.screenshot-manifest.v1',
  generatedAt: new Date().toISOString(),
  viewport: VIEWPORT,
  deviceScaleFactor: DEVICE_SCALE,
  colorScheme: COLOR_SCHEME,
  captures: manifest,
}, null, 2) + '\n');
console.log(`Wrote ${manifestPath}: ${manifest.length} entries.`);

console.log(`\nDone: ${ok} captured, ${fail} failed.`);
if (fail > 0) process.exit(1);
