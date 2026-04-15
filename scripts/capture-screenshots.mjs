#!/usr/bin/env node
// Capture screenshots of every live web app using Playwright.
// Writes public/screenshots/<slug>.jpg (~800x500, JPEG q=75).
//
// Usage:
//   npm install --no-save playwright   # one-time install
//   npx playwright install chromium    # one-time install
//   npm run capture-screenshots
//
// Why separate script (not CI): Chromium is ~170MB; running in GH Actions on every
// build wastes minutes. Capture locally, commit the JPGs, ship them. Only need to
// re-run when UI changes significantly or new live apps are added.

import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const projectsSrc = readFileSync(join(root, 'src', 'data', 'projects.ts'), 'utf8');
const liveBlock = projectsSrc.match(/export\s+const\s+liveApps(?:\s*:\s*LiveApp\[\])?\s*=\s*\[([\s\S]*?)\n\];/);

if (!liveBlock) {
  console.error('Could not parse liveApps from src/data/projects.ts');
  process.exit(1);
}

const entries = [...liveBlock[1].matchAll(/\{\s*slug:\s*"([^"]+)"[\s\S]*?\burl:\s*"([^"]+)"/g)]
  .map((match) => ({ slug: match[1], url: match[2] }))
  .filter((entry) => entry.slug && /^https?:\/\//.test(entry.url));

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
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1.25,
  colorScheme: 'dark',
});

let ok = 0;
let fail = 0;
const CONCURRENCY = 4;

async function captureOne({ slug, url }) {
  const out = join(outDir, `${slug}.jpg`);
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

    await page.screenshot({ path: out, type: 'jpeg', quality: 75, fullPage: false });
    ok += 1;
    console.log(`✓ ${slug}`);
  } catch (error) {
    fail += 1;
    const kept = existsSync(out) ? ' (kept previous screenshot)' : '';
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
console.log(`\nDone: ${ok} captured, ${fail} failed.`);
if (fail > 0) process.exit(1);
