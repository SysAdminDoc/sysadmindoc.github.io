import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';

const root = process.cwd();

test('PWA manifest splits icon purpose into separate any and maskable entries', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'public', 'manifest.json'), 'utf8'));
  const icon512 = manifest.icons.filter((i) => i.sizes === '512x512');
  assert.equal(icon512.length, 2, 'expected two 512x512 icon entries');
  const purposes = icon512.map((i) => i.purpose).sort();
  assert.deepEqual(purposes, ['any', 'maskable']);
  for (const icon of icon512) {
    assert.equal(icon.src, '/icon-512.png');
    assert.equal(icon.type, 'image/png');
  }
});

test('PWA manifest exposes valid wide and narrow install screenshots', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'public', 'manifest.json'), 'utf8'));
  assert.ok(Array.isArray(manifest.screenshots), 'expected screenshots array');

  const formFactors = manifest.screenshots.map((screenshot) => screenshot.form_factor).sort();
  assert.deepEqual(formFactors, ['narrow', 'wide']);

  for (const screenshot of manifest.screenshots) {
    assert.match(screenshot.src, /^\/screenshots\/install\/[^/]+\.(jpg|jpeg|png|webp)$/i);
    assert.equal(typeof screenshot.label, 'string');
    assert.ok(screenshot.label.length >= 20, `${screenshot.src} needs useful accessible label copy`);
    assert.match(screenshot.sizes, /^\d+x\d+$/);

    const filePath = path.join(root, 'public', screenshot.src.slice(1));
    const metadata = await sharp(filePath).metadata();
    assert.equal(screenshot.sizes, `${metadata.width}x${metadata.height}`);
    assert.equal(screenshot.type, 'image/jpeg');

    const minDimension = Math.min(metadata.width, metadata.height);
    const maxDimension = Math.max(metadata.width, metadata.height);
    assert.ok(minDimension >= 320, `${screenshot.src} must be at least 320px on each side`);
    assert.ok(maxDimension <= 3840, `${screenshot.src} must stay within the 3840px install UI bound`);
    assert.ok(maxDimension / minDimension <= 2.3, `${screenshot.src} aspect ratio is too extreme for install UI`);

    if (screenshot.form_factor === 'wide') {
      assert.ok(metadata.width > metadata.height, `${screenshot.src} should be landscape`);
    } else {
      assert.equal(screenshot.form_factor, 'narrow');
      assert.ok(metadata.height > metadata.width, `${screenshot.src} should be portrait`);
    }
  }
});

test('PWA manifest exposes bounded install shortcuts with descriptions', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'public', 'manifest.json'), 'utf8'));

  assert.equal(manifest.id, '/?source=pwa');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.launch_handler, { client_mode: 'navigate-existing' });

  assert.equal(manifest.shortcuts.length, 4);
  assert.deepEqual(
    manifest.shortcuts.map((shortcut) => shortcut.name),
    ['Catalog', 'Search', 'Releases', 'Now'],
  );

  for (const shortcut of manifest.shortcuts) {
    assert.equal(typeof shortcut.short_name, 'string');
    assert.equal(typeof shortcut.description, 'string');
    assert.ok(shortcut.description.length >= 20, `${shortcut.name} shortcut needs useful description copy`);
    // Was: /^\/(search\/|releases\/|now\/|\?source=pwa)/. That allowlist accepted
    // the bare `/?source=pwa#catalog` the Catalog shortcut used, which since the
    // v0.26.0 catalog split lands on the homepage's top-84 preview slice rather
    // than the full archive its description promises. Require a real route path.
    assert.match(shortcut.url, /^\/[a-z-]+\/\?source=pwa$/, `${shortcut.name} shortcut must target a route path`);
  }
});

test('every PWA shortcut resolves to a built route', async (t) => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'public', 'manifest.json'), 'utf8'));
  const dist = path.join(root, 'dist');
  const built = await fs.access(dist).then(() => true, () => false);
  if (!built) {
    t.skip('dist/ not built — run npm run build to verify shortcut targets');
    return;
  }

  for (const shortcut of manifest.shortcuts) {
    const route = new URL(shortcut.url, 'https://example.invalid').pathname;
    const file = path.join(dist, route.replace(/^\/+/, ''), 'index.html');
    const exists = await fs.access(file).then(() => true, () => false);
    assert.ok(exists, `${shortcut.name} shortcut points at ${route}, which the build does not produce`);
  }

  // The Catalog shortcut says "full project catalog", so it has to land on the
  // route that renders every project, not the homepage preview slice.
  const catalog = manifest.shortcuts.find((shortcut) => shortcut.name === 'Catalog');
  assert.match(catalog.description, /full project catalog/i);
  assert.equal(new URL(catalog.url, 'https://example.invalid').pathname, '/catalog/');

  const homepage = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
  const full = await fs.readFile(path.join(dist, 'catalog', 'index.html'), 'utf8');
  const countEntries = (html) => (html.match(/data-f="/g) ?? []).length;
  assert.ok(
    countEntries(full) > countEntries(homepage),
    'the catalog route must render more projects than the homepage preview, or the shortcut is pointing at the wrong one',
  );
});
