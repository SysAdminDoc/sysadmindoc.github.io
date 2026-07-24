#!/usr/bin/env node
// Replace placeholders in the built service worker:
//   __BUILD_VERSION__ becomes the package.json version, so the cache name changes each release.
//   __PRECACHE_PLACEHOLDER__ becomes a JSON array of root-relative URLs generated from dist/.
// Runs after Astro build, minification, and Pagefind indexing as part of `npm run build:ci`.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Explicit first-install precache budget. The service worker downloads every
// precache entry on install, so cap the total so route/asset growth cannot
// silently bloat the offline install. Raise deliberately if a build legitimately
// needs more, so the change is reviewed.
export const PRECACHE_BUDGET_BYTES = 12 * 1024 * 1024;

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

/**
 * Collect every rendered HTML route from dist/ so a fresh service-worker
 * install can open the full reviewed public route set offline, not just the
 * homepage. `<dir>/index.html` maps to `/<dir>/` and standalone pages (404)
 * map to their own URL.
 * @param {string} distRoot Absolute path to dist/.
 * @returns {string[]}
 */
export function collectHtmlRoutes(distRoot) {
  const routes = new Set();
  for (const file of collectFiles(distRoot, distRoot)) {
    if (!/\.html$/.test(file)) continue;
    if (file.endsWith('/index.html')) {
      const route = file.slice(0, -'index.html'.length);
      routes.add(route === '' ? '/' : route);
    } else {
      routes.add(file);
    }
  }
  return [...routes].sort();
}

function precacheBytes(distRoot, urls) {
  let total = 0;
  for (const url of urls) {
    // Route URLs ("/", "/resume/") are served by their index.html; asset URLs
    // map to the file directly. Resolve to the concrete file so a directory stat
    // does not undercount the HTML routes.
    const relPath = url.endsWith('/') ? `${url.slice(1)}index.html` : url.slice(1);
    const abs = join(distRoot, relPath.split('/').join(sep));
    try {
      const stats = statSync(abs);
      if (stats.isFile()) total += stats.size;
    } catch { /* missing file: skip, resilientPrecache tolerates it */ }
  }
  return total;
}

function searchPageRequiresPagefind(distRoot) {
  const searchHtmlPath = join(distRoot, 'search', 'index.html');
  if (!existsSync(searchHtmlPath)) return false;
  const searchHtml = readFileSync(searchHtmlPath, 'utf8');
  return /\/pagefind\/pagefind-component-ui\.(?:css|js)\b/.test(searchHtml);
}

export function buildPrecacheList(distRoot, budgetBytes = PRECACHE_BUDGET_BYTES) {
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

  // Key shell URLs plus every rendered HTML route, so the whole reviewed public
  // route set (resume, status, timeline, screenshots, healthcare, archive, 404,
  // language lanes, ...) is available on first-install offline, not just home.
  const shellUrls = [
    '/',
    '/offline.html',
    '/styles/offline.css',
    ...collectHtmlRoutes(distRoot),
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
  const list = allEntries.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  const totalBytes = precacheBytes(distRoot, list);
  if (totalBytes > budgetBytes) {
    throw new Error(
      `Service-worker precache is ${(totalBytes / 1024 / 1024).toFixed(2)} MB, over the ${(budgetBytes / 1024 / 1024).toFixed(2)} MB budget. Trim precached routes/assets or raise PRECACHE_BUDGET_BYTES deliberately.`,
    );
  }

  return list;
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
