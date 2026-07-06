#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const outPath = join(distDir, 'resume.pdf');

if (!existsSync(distDir)) {
  console.error('generate-resume-pdf: dist/ not found. Run Astro build before generating the PDF.');
  process.exit(1);
}

const port = parseInt(process.env.RESUME_PDF_PORT || '4326', 10);

async function generate() {
  const { chromium } = await import('playwright');
  const { createServer } = await import('node:http');
  const { readFileSync, statSync } = await import('node:fs');
  const path = await import('node:path');

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    let filePath = resolve(distDir, `.${pathname}`);
    const resolvedDist = resolve(distDir);
    const relPath = relative(resolvedDist, filePath);
    if (relPath.startsWith('..') || relPath === '..' || path.isAbsolute(relPath)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (statSync(filePath, { throwIfNoEntry: false })?.isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
    const relFilePath = relative(resolvedDist, filePath);
    if (relFilePath.startsWith('..') || relFilePath === '..' || path.isAbsolute(relFilePath)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(readFileSync(filePath));
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/resume/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts?.ready);

    await page.pdf({
      path: outPath,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
    });

    console.log(`resume PDF generated: ${outPath}`);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

generate().catch((err) => {
  console.error('generate-resume-pdf failed:', err.message);
  process.exit(1);
});
