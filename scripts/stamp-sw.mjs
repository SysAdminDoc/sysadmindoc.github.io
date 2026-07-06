#!/usr/bin/env node
// Replace placeholders in the built service worker:
//   __BUILD_VERSION__ becomes the package.json version, so the cache name changes each release.
//   __PRECACHE_PLACEHOLDER__ becomes a JSON array of root-relative URLs generated from dist/.
// Runs after Astro build, minification, and Pagefind indexing as part of `npm run build:ci`.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = join(dirname(scriptPath), '..');

/**
 * Recursively collect all files under `dir`, returning root-relative URL paths.
 * @param {string} dir Absolute path to search.
 * @param {string} distRoot Absolute path to dist/.
 * @returns {string[]}
 */
export function collectFiles(dir, distRoot) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(abs, distRoot));
    } else if (entry.isFile()) {
      const rel = relative(distRoot, abs).split('\\').join('/');
      results.push('/' + rel);
    }
  }
  return results;
}

function searchPageRequiresPagefind(distRoot) {
  const searchHtmlPath = join(distRoot, 'search', 'index.html');
  if (!existsSync(searchHtmlPath)) return false;
  const searchHtml = readFileSync(searchHtmlPath, 'utf8');
  return /\/pagefind\/pagefind-component-ui\.(?:css|js)\b/.test(searchHtml);
}

export function buildPrecacheList(distRoot) {
  // Hashed Astro bundles (CSS + JS under _assets/).
  const assetFiles = collectFiles(join(distRoot, '_assets'), distRoot)
    .filter((p) => /\.(?:css|js)$/.test(p));

  // Public scripts (minified copies placed in dist/scripts/ by scripts:minify).
  const scriptFiles = collectFiles(join(distRoot, 'scripts'), distRoot)
    .filter((p) => /\.js$/.test(p));

  // Fonts (copied verbatim from public/fonts/ by Astro).
  const fontFiles = collectFiles(join(distRoot, 'fonts'), distRoot)
    .filter((p) => /\.woff2?$/.test(p));

  // Pagefind runtime and generated index files. The build pipeline runs
  // search:index before sw:stamp so first-install offline search can work.
  const pagefindFiles = collectFiles(join(distRoot, 'pagefind'), distRoot)
    .filter((p) => p.startsWith('/pagefind/'));

  if (searchPageRequiresPagefind(distRoot) && pagefindFiles.length === 0) {
    throw new Error('dist/search/index.html references Pagefind, but dist/pagefind is empty. Run search:index before sw:stamp.');
  }

  // Key shell URLs.
  const shellUrls = [
    '/',
    '/offline.html',
    '/styles/offline.css',
    '/search/',
    '/releases/',
    '/now/',
  ];

  // Static manifest / icons.
  const staticAssets = [
    '/manifest.json',
    '/favicon.svg',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/icon-512.png',
  ];

  // Feeds (present at root level of dist/).
  const feedFiles = [];
  for (const file of ['rss.xml', 'atom.xml']) {
    if (existsSync(join(distRoot, file))) feedFiles.push('/' + file);
  }

  // Assemble and deduplicate, preserving category order.
  const allEntries = [
    ...shellUrls,
    ...staticAssets,
    ...feedFiles,
    ...assetFiles.sort(),
    ...scriptFiles.sort(),
    ...fontFiles.sort(),
    ...pagefindFiles.sort(),
  ];

  const seen = new Set();
  return allEntries.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export function stampServiceWorker({ rootDir = defaultRoot, logger = console } = {}) {
  const swPath = join(rootDir, 'dist', 'sw.js');
  const packagePath = join(rootDir, 'package.json');
  const distRoot = join(rootDir, 'dist');
  const { version } = JSON.parse(readFileSync(packagePath, 'utf8'));

  let source;
  try {
    source = readFileSync(swPath, 'utf8');
  } catch {
    throw new Error(`${swPath} not found. Run "astro build" first.`);
  }

  if (!source.includes('__BUILD_VERSION__')) {
    logger.warn?.('stamp-sw: no __BUILD_VERSION__ placeholder found; nothing to stamp.');
    return { stamped: false, version, precacheList: [] };
  }

  const precacheList = buildPrecacheList(distRoot);
  const precacheJson = JSON.stringify(precacheList, null, 2);

  let stamped = source.replaceAll('__BUILD_VERSION__', version);

  if (!stamped.includes('__PRECACHE_PLACEHOLDER__')) {
    logger.warn?.('stamp-sw: no __PRECACHE_PLACEHOLDER__ found in dist/sw.js; skipping precache generation.');
  } else {
    stamped = stamped.replace('__PRECACHE_PLACEHOLDER__', precacheJson);
    logger.log?.(`stamp-sw: precache list generated with ${precacheList.length} entries`);
    if (precacheList.length > 0) {
      for (const url of precacheList) {
        logger.log?.(`  ${url}`);
      }
    }
  }

  writeFileSync(swPath, stamped);
  logger.log?.(`stamp-sw: dist/sw.js stamped with v${version}`);
  return { stamped: true, version, precacheList };
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  try {
    stampServiceWorker();
  } catch (error) {
    console.error(`stamp-sw: ${error.message}`);
    process.exit(1);
  }
}
