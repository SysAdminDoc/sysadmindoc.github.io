#!/usr/bin/env node
// Replace placeholders in the built service worker:
//   __BUILD_VERSION__      → package.json version (cache name changes each release)
//   __PRECACHE_PLACEHOLDER__ → JSON array of root-relative URLs generated from dist/
// Runs after `astro build` + `scripts:minify` as part of `npm run build:ci`.
import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const swPath = join(root, 'dist', 'sw.js');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

let source;
try {
  source = readFileSync(swPath, 'utf8');
} catch {
  console.error(`stamp-sw: ${swPath} not found. Run "astro build" first.`);
  process.exit(1);
}

if (!source.includes('__BUILD_VERSION__')) {
  console.warn('stamp-sw: no __BUILD_VERSION__ placeholder found; nothing to stamp.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Build the precache list from dist/ contents
// ---------------------------------------------------------------------------

/**
 * Recursively collect all files under `dir`, returning root-relative URL paths.
 * @param {string} dir  Absolute path to search
 * @param {string} distRoot  Absolute path to dist/
 * @returns {string[]}
 */
function collectFiles(dir, distRoot) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(abs, distRoot));
    } else if (entry.isFile()) {
      // Convert Windows backslash path to a root-relative URL.
      const rel = relative(distRoot, abs).split('\\').join('/');
      results.push('/' + rel);
    }
  }
  return results;
}

const distRoot = join(root, 'dist');

// Hashed Astro bundles (CSS + JS under _assets/)
const assetFiles = collectFiles(join(distRoot, '_assets'), distRoot)
  .filter((p) => /\.(?:css|js)$/.test(p));

// Public scripts (minified copies placed in dist/scripts/ by scripts:minify)
const scriptFiles = collectFiles(join(distRoot, 'scripts'), distRoot)
  .filter((p) => /\.js$/.test(p));

// Fonts (copied verbatim from public/fonts/ by Astro)
const fontFiles = collectFiles(join(distRoot, 'fonts'), distRoot)
  .filter((p) => /\.woff2?$/.test(p));

// Pagefind runtime — only if the index already exists (it runs after sw:stamp
// in the build pipeline, so this fires on second+ stamps or if run standalone)
const pagefindEntries = [];
for (const file of ['pagefind.js', 'pagefind-ui.js']) {
  const abs = join(distRoot, 'pagefind', file);
  if (existsSync(abs)) pagefindEntries.push('/pagefind/' + file);
}

// Key shell URLs
const shellUrls = [
  '/',
  '/offline.html',
  '/styles/offline.css',
  '/search/',
  '/releases/',
  '/now/',
];

// Static manifest / icons
const staticAssets = [
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
];

// Feeds (present at root level of dist/)
const feedFiles = [];
for (const file of ['rss.xml', 'atom.xml']) {
  if (existsSync(join(distRoot, file))) feedFiles.push('/' + file);
}

// Assemble and deduplicate, preserving category order
const allEntries = [
  ...shellUrls,
  ...staticAssets,
  ...feedFiles,
  ...assetFiles.sort(),
  ...scriptFiles.sort(),
  ...fontFiles.sort(),
  ...pagefindEntries,
];

const seen = new Set();
const precacheList = allEntries.filter((url) => {
  if (seen.has(url)) return false;
  seen.add(url);
  return true;
});

const precacheJson = JSON.stringify(precacheList, null, 2);

// ---------------------------------------------------------------------------
// Stamp both placeholders in dist/sw.js
// ---------------------------------------------------------------------------

let stamped = source.replaceAll('__BUILD_VERSION__', version);

if (!stamped.includes('__PRECACHE_PLACEHOLDER__')) {
  console.warn('stamp-sw: no __PRECACHE_PLACEHOLDER__ found in dist/sw.js; skipping precache generation.');
} else {
  stamped = stamped.replace('__PRECACHE_PLACEHOLDER__', precacheJson);
  console.log(`stamp-sw: precache list generated with ${precacheList.length} entries`);
  if (precacheList.length > 0) {
    for (const url of precacheList) {
      console.log(`  ${url}`);
    }
  }
}

writeFileSync(swPath, stamped);
console.log(`stamp-sw: dist/sw.js stamped with v${version}`);
