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
// build wastes minutes. Capture locally, commit the PNGs, ship them. Only need to
// re-run when UI changes significantly or new live apps are added.

import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Parse live apps directly from the compiled TS data file (avoids TS import hassle)
const projectsSrc = readFileSync(join(root, 'src', 'data', 'projects.ts'), 'utf8');
const liveBlock = projectsSrc.match(/liveApps:\s*LiveApp\[\]\s*=\s*\[([\s\S]*?)\];/);
if (!liveBlock) {
  console.error('Could not parse liveApps from src/data/projects.ts');
  process.exit(1);
}
const entries = [...liveBlock[1].matchAll(/slug:\s*"([^"]+)"[^}]*?url:\s*"([^"]+)"/g)]
  .map((m) => ({ slug: m[1], url: m[2] }));

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

let ok = 0, fail = 0;
for (const { slug, url } of entries) {
  const out = join(outDir, `${slug}.jpg`);
  try {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    // Give late-loading map tiles / canvases a moment
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out, type: 'jpeg', quality: 75, fullPage: false });
    await page.close();
    ok++;
    console.log(`✓ ${slug}`);
  } catch (e) {
    fail++;
    console.error(`✗ ${slug} — ${e.message}`);
  }
}

await browser.close();
console.log(`\nDone: ${ok} captured, ${fail} failed.`);
if (fail > 0) process.exit(1);
