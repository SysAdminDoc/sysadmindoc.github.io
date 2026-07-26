import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { exportedArray, sourceFile } from '../scripts/lib/ts-data-utils.mjs';
import {
  MIN_FONT_BYTES,
  loadCachedFont,
  validateFontBuffer,
} from '../src/data/og-font-cache.ts';

const root = process.cwd();
const interiorOgPagesPath = path.join(root, 'src', 'data', 'interior-og-pages.ts');
const ogEndpointPath = path.join(root, 'src', 'pages', 'og', '[slug].png.ts');
const homepageOgEndpointPath = path.join(root, 'src', 'pages', 'og.png.ts');
const ogRendererPath = path.join(root, 'src', 'data', 'og-card.ts');
const requiredSlugs = ['uses', 'resume', 'search', 'timeline', 'archive', 'now', 'healthcare-it', 'releases'];

function fakeFont(signature = Buffer.from([0x00, 0x01, 0x00, 0x00])) {
  const buffer = Buffer.alloc(MIN_FONT_BYTES);
  signature.copy(buffer);
  return buffer;
}

function fontResponse(buffer) {
  return {
    ok: true,
    status: 200,
    async arrayBuffer() {
      return new Uint8Array(buffer).buffer;
    },
  };
}

async function loadInteriorOgPages() {
  const text = await fs.readFile(interiorOgPagesPath, 'utf8');
  return exportedArray(sourceFile(interiorOgPagesPath, text), 'interiorOgPages');
}

test('interior OG metadata covers the key secondary routes', async () => {
  const pages = await loadInteriorOgPages();
  const slugs = new Set(pages.map((page) => page.slug));

  assert.equal(slugs.size, pages.length, 'interior OG slugs should be unique');
  for (const slug of requiredSlugs) {
    assert.equal(slugs.has(slug), true, `missing interior OG slug ${slug}`);
  }

  for (const page of pages) {
    assert.equal(page.ogImage, `/og/${page.slug}.png`);
    assert.match(page.route, /^\/[a-z0-9-]+\/$/);
    assert.ok(page.title.length >= 3);
    assert.ok(page.description.length >= 40);
    assert.ok(page.ogImageAlt.endsWith('social preview card'));
  }
});

test('interior pages pass generated OG metadata through Base', async () => {
  const pages = await loadInteriorOgPages();

  for (const page of pages) {
    const routePath = path.join(root, 'src', 'pages', `${page.route.replace(/^\/|\/$/g, '')}.astro`);
    const source = await fs.readFile(routePath, 'utf8');

    assert.match(source, /interiorOgPageBySlug/, `${page.route} should import shared OG metadata`);
    assert.match(source, /ogImage=\{pageOg\.ogImage\}/, `${page.route} should use generated ogImage`);
    assert.match(source, /ogImageAlt=\{pageOg\.ogImageAlt\}/, `${page.route} should use generated ogImageAlt`);
  }
});

test('OG endpoint generates only reviewed interior social-card routes', async () => {
  const source = await fs.readFile(ogEndpointPath, 'utf8');

  assert.match(source, /interiorOgPages\.map/, 'getStaticPaths should map interior page slugs');
  assert.match(source, /getInteriorOgPage/, 'GET should resolve interior page card metadata');
  assert.doesNotMatch(source, /featured\.forEach|liveApps\.forEach|catalog\.forEach/);
});

test('OG endpoint returns exact cached font buffers to Satori', async () => {
  const [renderer, helper] = await Promise.all([
    fs.readFile(ogRendererPath, 'utf8'),
    fs.readFile(path.join(root, 'src', 'data', 'og-font-cache.ts'), 'utf8'),
  ]);

  assert.match(renderer, /loadCachedFont\(join\(FONT_CACHE,/);
  assert.match(helper, /function bufferToExactArrayBuffer\(buffer: Buffer\): ArrayBuffer/);
  assert.match(helper, /new Uint8Array\(buffer\)\.buffer/);
  assert.doesNotMatch(renderer, /readFileSync\(cachePath\)\.buffer as ArrayBuffer/);
});

test('social cards use the Technical Service Bureau identity and live data', async () => {
  const [interiorSource, homepageSource, rendererSource] = await Promise.all([
    fs.readFile(ogEndpointPath, 'utf8'),
    fs.readFile(homepageOgEndpointPath, 'utf8'),
    fs.readFile(ogRendererPath, 'utf8'),
  ]);
  const combined = `${interiorSource}\n${homepageSource}\n${rendererSource}`;

  assert.match(rendererSource, /SYSADMINDOC/);
  assert.match(rendererSource, /INDEPENDENT TECHNICAL PRACTICE/);
  assert.match(rendererSource, /#f4f0e7/i);
  assert.match(rendererSource, /#1648dc/i);
  assert.match(rendererSource, /renderQueue/, 'Satori/Resvg renders should remain serialized');
  assert.match(homepageSource, /catalog\.length/);
  assert.match(homepageSource, /liveApps\.length/);
  assert.doesNotMatch(combined, /matt@sysadmin|~\$|#050913|#4ade80/i);
});

test('OG font validation accepts supported signatures and rejects truncated or HTML payloads', () => {
  for (const signature of [
    Buffer.from([0x00, 0x01, 0x00, 0x00]),
    Buffer.from('OTTO'),
    Buffer.from('wOFF'),
    Buffer.from('wOF2'),
  ]) {
    assert.doesNotThrow(() => validateFontBuffer(fakeFont(signature)));
  }
  assert.throws(() => validateFontBuffer(Buffer.from([0x00, 0x01, 0x00, 0x00])), /outside/);
  assert.throws(() => validateFontBuffer(Buffer.alloc(MIN_FONT_BYTES, '<')), /signature/);
});

test('a truncated OG font cache is discarded, fetched once, and atomically replaced', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'og-font-cache-'));
  const cachePath = path.join(tmp, 'jetbrains-mono-400.ttf');
  const downloaded = fakeFont();
  let fetchCalls = 0;

  try {
    await fs.writeFile(cachePath, Buffer.from([0x00, 0x01, 0x00, 0x00]));
    const first = await loadCachedFont(cachePath, 'https://example.test/font.ttf', async () => {
      fetchCalls += 1;
      return fontResponse(downloaded);
    });
    const second = await loadCachedFont(cachePath, 'https://example.test/font.ttf', async () => {
      throw new Error('valid cache should avoid a second fetch');
    });

    assert.equal(fetchCalls, 1);
    assert.deepEqual(Buffer.from(first), downloaded);
    assert.deepEqual(Buffer.from(second), downloaded);
    assert.deepEqual(await fs.readFile(cachePath), downloaded);
    assert.equal((await fs.readdir(tmp)).some((name) => name.endsWith('.tmp')), false);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('a successful HTML font response is rejected without poisoning the cache', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'og-font-html-'));
  const cachePath = path.join(tmp, 'jetbrains-mono-700.ttf');
  const html = Buffer.alloc(MIN_FONT_BYTES, '<');

  try {
    await assert.rejects(
      loadCachedFont(cachePath, 'https://example.test/font.ttf', async () => fontResponse(html)),
      /unsupported font signature/,
    );
    await assert.rejects(fs.access(cachePath));
    assert.equal((await fs.readdir(tmp)).some((name) => name.endsWith('.tmp')), false);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
