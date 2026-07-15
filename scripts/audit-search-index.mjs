import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.cwd();
const distDir = path.resolve(root, process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist');
const pagefindDir = path.join(distDir, 'pagefind');
const requiredScopeLabels = [
  'Archive',
  'Healthcare IT',
  'Home',
  'Language Lane',
  'Now',
  'Releases',
  'Resume',
  'Screenshots',
  'Search',
  'Status',
  'Timeline',
  'Uses',
];
const nonContentRoutes = new Set(['/404.html', '/offline.html']);
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const errors = [];

function fail(message) {
  errors.push(message);
}

async function collectHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtmlFiles(filePath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(filePath);
  }
  return files;
}

function routeFromHtmlFile(filePath) {
  const relative = path.relative(distDir, filePath).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function decodeHtmlAttribute(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|apos|quot|lt|gt);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();
    if (normalized === 'amp') return '&';
    if (normalized === 'apos') return "'";
    if (normalized === 'quot') return '"';
    if (normalized === 'lt') return '<';
    if (normalized === 'gt') return '>';
    if (normalized.startsWith('#x')) return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    if (normalized.startsWith('#')) return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    return match;
  });
}

function normalizeLabel(value) {
  return decodeHtmlAttribute(value).replace(/\s+/g, ' ').trim();
}

function extractAttribute(tag, name) {
  const pattern = new RegExp(`\\b${name}=("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = pattern.exec(tag);
  return match ? decodeHtmlAttribute(match[2] ?? match[3] ?? match[4] ?? '') : null;
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function compareCounts(label, actual, expected) {
  const keys = new Set([...actual.keys(), ...expected.keys()]);
  for (const key of Array.from(keys).sort()) {
    const actualCount = actual.get(key) ?? 0;
    const expectedCount = expected.get(key) ?? 0;
    if (actualCount !== expectedCount) fail(`${label} count for ${key} is ${actualCount}; expected ${expectedCount}.`);
  }
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    fail(`${label} is missing or invalid: ${error.message}`);
    return null;
  }
}

async function loadPagefind() {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (resource) => {
    const url = resource instanceof URL
      ? resource
      : new URL(typeof resource === 'object' && resource && 'url' in resource ? resource.url : String(resource));
    if (url.protocol === 'file:') return new Response(await fs.readFile(fileURLToPath(url)));
    if (typeof nativeFetch === 'function') return nativeFetch(resource);
    throw new Error(`Pagefind audit cannot fetch ${url.href}`);
  };

  const pagefindPath = path.join(pagefindDir, 'pagefind.js');
  const pagefindBasePath = pathToFileURL(`${pagefindDir}${path.sep}`).href;
  const pagefind = await import(pathToFileURL(pagefindPath).href);
  await pagefind.options({ basePath: pagefindBasePath, baseUrl: '/' });
  await pagefind.init();
  return pagefind;
}

const htmlFiles = await collectHtmlFiles(distDir).catch((error) => {
  fail(`Unable to scan ${path.relative(root, distDir) || distDir}: ${error.message}`);
  return [];
});
const htmlByFile = new Map();
for (const filePath of htmlFiles) {
  try {
    htmlByFile.set(filePath, await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    fail(`${routeFromHtmlFile(filePath)} is unreadable: ${error.message}`);
    htmlByFile.set(filePath, '');
  }
}

const removedProjectRoutes = htmlFiles.map(routeFromHtmlFile).filter((route) => /^\/projects\/[^/]+\/$/.test(route));
if (removedProjectRoutes.length > 0) fail(`Removed project routes were rendered: ${removedProjectRoutes.join(', ')}.`);
for (const [filePath, html] of htmlByFile) {
  if (/\/projects\/[^\s"'<]+/i.test(html)) fail(`${routeFromHtmlFile(filePath)} still references a removed /projects/* route.`);
}

const pagefindBodyFiles = htmlFiles.filter((filePath) => /\bdata-pagefind-body\b/i.test(htmlByFile.get(filePath) ?? ''));
const expectedSearchFiles = htmlFiles.filter((filePath) => !nonContentRoutes.has(routeFromHtmlFile(filePath)));
const missingPagefindBodies = expectedSearchFiles
  .filter((filePath) => !pagefindBodyFiles.includes(filePath))
  .map(routeFromHtmlFile)
  .sort();
if (missingPagefindBodies.length > 0) fail(`HTML routes missing data-pagefind-body: ${missingPagefindBodies.join(', ')}.`);

const pagefindEntry = await readJson(path.join(pagefindDir, 'pagefind-entry.json'), 'dist/pagefind/pagefind-entry.json');
const indexedPageCount = Object.values(pagefindEntry?.languages ?? {}).reduce((sum, language) => sum + Number(language?.page_count ?? 0), 0);
if (indexedPageCount !== pagefindBodyFiles.length) {
  fail(`Pagefind entry reports ${indexedPageCount} indexed pages; dist contains ${pagefindBodyFiles.length} data-pagefind-body HTML pages.`);
}

const searchHtml = htmlByFile.get(path.join(distDir, 'search', 'index.html')) ?? '';
if (!/<pagefind-results\b[^>]*\bshow-images\b/i.test(searchHtml)) fail('/search/ must enable Pagefind result images.');
if (!/\bportfolio-result-meta\b/.test(searchHtml)) fail('/search/ must include the portfolio metadata result template.');
if (!/<pagefind-filter-pane\b[^>]*\bopen=(["'])scope\1/i.test(searchHtml)) fail('/search/ must expose the Scope Pagefind filter.');
if (/<pagefind-filter-pane\b[^>]*\bopen=(["'])[^"']*category/i.test(searchHtml)) fail('/search/ must not advertise a retired project Category filter.');

const renderedScopeCounts = new Map();
for (const filePath of pagefindBodyFiles) {
  const route = routeFromHtmlFile(filePath);
  const html = htmlByFile.get(filePath) ?? '';
  const labels = new Set();
  for (const match of html.matchAll(/\bdata-pagefind-filter=(["'])Scope:([\s\S]*?)\1/gi)) {
    const label = normalizeLabel(match[2]);
    if (label) labels.add(label);
  }
  if (labels.size !== 1) {
    fail(`${route} must expose exactly one Scope Pagefind filter; found ${labels.size}.`);
    continue;
  }
  increment(renderedScopeCounts, Array.from(labels)[0]);
}

const indexHtml = htmlByFile.get(path.join(distDir, 'index.html')) ?? '';
let catalogLinkCount = 0;
for (const match of indexHtml.matchAll(/<a\b[^>]*\bclass=(["'])[^"']*\bca\b[^"']*\1[^>]*>/gi)) {
  const tag = match[0];
  const repo = extractAttribute(tag, 'data-repo');
  const href = extractAttribute(tag, 'href');
  const target = extractAttribute(tag, 'target');
  const rel = extractAttribute(tag, 'rel') ?? '';
  if (!repo) continue;
  catalogLinkCount += 1;
  if (href !== `https://github.com/SysAdminDoc/${repo}`) fail(`Homepage catalog card ${repo} must link directly to its GitHub repository.`);
  if (target !== '_blank') fail(`Homepage catalog card ${repo} must open GitHub in a new tab.`);
  if (!rel.split(/\s+/).includes('noopener')) fail(`Homepage catalog card ${repo} must use rel=noopener.`);
}
if (catalogLinkCount === 0) fail('Homepage catalog contains no project links.');

const pagefind = await loadPagefind().catch((error) => {
  fail(`Unable to load generated Pagefind API: ${error.message}`);
  return null;
});
const pagefindFilters = pagefind ? await pagefind.filters().catch((error) => {
  fail(`Unable to read generated Pagefind filters: ${error.message}`);
  return null;
}) : null;
const pagefindScopeCounts = new Map(Object.entries(pagefindFilters?.Scope ?? {}).map(([key, value]) => [key, Number(value)]));
if (pagefindScopeCounts.size === 0) fail('Generated Pagefind index does not expose a Scope filter.');
if (pagefindScopeCounts.has('Project')) fail('Generated Pagefind index still exposes the removed Project scope.');
compareCounts('Pagefind Scope filter', pagefindScopeCounts, renderedScopeCounts);

for (const label of requiredScopeLabels) {
  if (!renderedScopeCounts.has(label)) fail(`Rendered pages are missing expected Scope label ${label}.`);
  if (!pagefindScopeCounts.has(label)) fail(`Generated Pagefind index is missing expected Scope label ${label}.`);
}

let filteredResultCount = 0;
if (pagefind) {
  for (const [label, expectedCount] of Array.from(renderedScopeCounts.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const result = await pagefind.search(null, { filters: { Scope: label } }).catch((error) => {
      fail(`Filtered empty search for Scope:${label} failed: ${error.message}`);
      return null;
    });
    if (!result) continue;
    if (result.results.length !== expectedCount) {
      fail(`Filtered empty search for Scope:${label} returned ${result.results.length} results; expected ${expectedCount}.`);
    }
    for (const item of result.results) {
      const data = await item.data();
      const url = String(data?.url ?? '');
      if (/^\/projects\//.test(url)) fail(`Scope:${label} returned removed project route ${url}.`);
    }
    filteredResultCount += result.results.length;
  }

  const archiveResult = await pagefind.search('archive').catch((error) => {
    fail(`Archive metadata search failed: ${error.message}`);
    return null;
  });
  let foundArchive = false;
  for (const item of archiveResult?.results ?? []) {
    const data = await item.data();
    const url = String(data?.url ?? '');
    if (url !== '/archive/' && url !== '/archive') continue;
    foundArchive = true;
    const meta = data?.meta ?? {};
    if (meta.route_type !== 'Archive') fail('/archive/ metadata route_type must be Archive.');
    if (meta.type !== 'Archive') fail('/archive/ metadata type must be Archive.');
    if (meta.category !== 'Portfolio') fail(`/archive/ metadata category is ${meta.category || '(missing)'}; expected Portfolio.`);
    if (!isoDatePattern.test(String(meta.updated ?? ''))) fail(`/archive/ metadata updated is ${meta.updated || '(missing)'}; expected YYYY-MM-DD.`);
    if (meta.image !== '/og/archive.png') fail(`/archive/ metadata image is ${meta.image || '(missing)'}; expected /og/archive.png.`);
    if (!String(meta.image_alt ?? '').trim()) fail('/archive/ metadata image_alt is missing.');
    break;
  }
  if (!foundArchive) fail('Search for "archive" did not return the /archive/ route.');
}
await pagefind?.destroy?.();

if (errors.length > 0) {
  console.error('Search index audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Search index audit');
console.log(`  HTML pages scanned: ${htmlFiles.length}`);
console.log(`  data-pagefind-body pages indexed: ${indexedPageCount}`);
console.log(`  removed project routes: ${removedProjectRoutes.length}`);
console.log(`  homepage GitHub project links: ${catalogLinkCount}`);
console.log(`  Scope filters checked: ${pagefindScopeCounts.size}`);
console.log(`  filtered route results checked: ${filteredResultCount}`);
console.log('  Scope counts:');
for (const [label, count] of Array.from(renderedScopeCounts.entries()).sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`    ${label}: ${count}`);
}
console.log('Search index audit passed.');
