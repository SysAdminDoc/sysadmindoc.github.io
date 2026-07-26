#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const root = process.cwd();
const baseUrl = process.env.PORTFOLIO_PREVIEW_URL || 'http://127.0.0.1:4321';
const outputDir = path.join(root, 'public', 'screenshots', 'install');
const captures = [
  { file: 'wide.jpg', width: 1600, height: 1000 },
  { file: 'narrow.jpg', width: 390, height: 844 },
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();

try {
  for (const capture of captures) {
    const context = await browser.newContext({
      viewport: { width: capture.width, height: capture.height },
      colorScheme: 'light',
      serviceWorkers: 'block',
    });
    await context.addInitScript(() => {
      localStorage.setItem('theme-pref', 'light');
    });
    const page = await context.newPage();
    await page.route('https://api.github.com/**', (route) =>
      route.fulfill({ contentType: 'application/json; charset=utf-8', body: '[]' }));
    await page.route('**/__capture-install.css', (route) =>
      route.fulfill({
        contentType: 'text/css; charset=utf-8',
        body: `
          *,*::before,*::after{animation:none!important;transition:none!important}
          html{scrollbar-width:none;caret-color:transparent!important}
          body::-webkit-scrollbar{display:none}
          .rv,.card-enter{opacity:1!important;transform:none!important}
        `,
      }));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.addStyleTag({
      url: new URL('/__capture-install.css', baseUrl).href,
    });
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await document.fonts.ready;
    });
    const outputPath = path.join(outputDir, capture.file);
    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 88,
      fullPage: false,
    });
    console.log(`install-screenshot: ${path.relative(root, outputPath)} (${capture.width}x${capture.height})`);
    await context.close();
  }
} finally {
  await browser.close();
}
