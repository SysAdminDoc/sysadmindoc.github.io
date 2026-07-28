import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';

const root = process.cwd();

test('brand assets use the MP Technical Service Bureau identity', async () => {
  const [favicon, manifest, homepageOg, interiorOg, renderer] = await Promise.all([
    fs.readFile(path.join(root, 'public', 'favicon.svg'), 'utf8'),
    fs.readFile(path.join(root, 'public', 'manifest.json'), 'utf8'),
    fs.readFile(path.join(root, 'src', 'pages', 'og.png.ts'), 'utf8'),
    fs.readFile(path.join(root, 'src', 'pages', 'og', '[slug].png.ts'), 'utf8'),
    fs.readFile(path.join(root, 'src', 'data', 'og-card.ts'), 'utf8'),
  ]);
  const combined = `${favicon}\n${manifest}\n${homepageOg}\n${interiorOg}\n${renderer}`;

  assert.match(favicon, />MP<\/text>/);
  assert.match(favicon, /#1648dc/i);
  assert.match(manifest, /Technical Service Bureau/);
  assert.match(renderer, /INDEPENDENT TECHNICAL PRACTICE/);
  assert.doesNotMatch(combined, /matt@sysadmin|~\$|#050913|#4ade80/i);
});

test('build:ci runs the rendered OG-card raster gate', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['build:ci'], /npm run dom:audit && npm run og-cards:audit && npm run search:index/);
  assert.equal(pkg.scripts['og-cards:audit'], 'node scripts/audit-og-cards.mjs');
  await fs.access(path.join(root, 'scripts', 'audit-og-cards.mjs'));
});

test('generated app icons match their declared dimensions', async () => {
  const iconSizes = {
    'icon-192.png': 192,
    'icon-512.png': 512,
    'apple-touch-icon.png': 180,
  };

  for (const [file, size] of Object.entries(iconSizes)) {
    const metadata = await sharp(path.join(root, 'public', file)).metadata();
    assert.equal(metadata.width, size, `${file} width`);
    assert.equal(metadata.height, size, `${file} height`);
    assert.equal(metadata.format, 'png', `${file} format`);
  }
});
