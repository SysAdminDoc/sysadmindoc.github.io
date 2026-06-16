import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.cwd();
const distDir = path.resolve(root, process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist');
const pagefindDir = path.join(distDir, 'pagefind');
const requiredCategoryLabels = [
  'Android',
  'Desktop',
  'Extensions',
  'Guides',
  'Media',
  'Other',
  'PowerShell',
  'Python',
  'Security',
  'Web Apps',
];
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const projectFilterLabelsByCategory = {
  ps: 'PowerShell',
  py: 'Python',
  web: 'Web Apps',
  ext: 'Extensions',
  kt: 'Android',
  sec: 'Security',
  media: 'Media',
  cs: 'Desktop',
  guide: 'Guides',
  fork: 'Forks',
  other: 'Other',
  cpp: 'C++',
};
const nonContentRoutes = new Set(['/404.html', '/offline.html']);

const errors = [];

function fail(message) {
  errors.push(message);
}

async function collectHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectHtmlFiles(filePath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(filePath);
    }
  }
  return files;
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

function sortedEntries(map) {
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function compareCounts(label, actual, expected) {
  const keys = new Set([...actual.keys(), ...expected.keys()]);
  for (const key of Array.from(keys).sort()) {
    const actualCount = actual.get(key) ?? 0;
    const expectedCount = expected.get(key) ?? 0;
    if (actualCount !== expectedCount) {
      fail(`${label} count for ${key} is ${actualCount}; expected ${expectedCount}.`);
    }
  }
}

function routeSlugFromProjectFile(filePath) {
  const relative = path.relative(path.join(distDir, 'projects'), filePath).replaceAll(path.sep, '/');
  if (relative.startsWith('../') || relative === '..') return null;
  const match = /^([^/]+)\/index\.html$/.exec(relative);
  return match?.[1] ?? null;
}

function routeFromHtmlFile(filePath) {
  const relative = path.relative(distDir, filePath).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
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

    if (url.protocol === 'file:') {
      return new Response(await fs.readFile(fileURLToPath(url)));
    }
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
const projectFiles = htmlFiles.filter((filePath) => routeSlugFromProjectFile(filePath));
const pagefindBodyFiles = htmlFiles.filter((filePath) => /\bdata-pagefind-body\b/i.test(htmlByFile.get(filePath) ?? ''));
const expectedSearchFiles = htmlFiles.filter((filePath) => !nonContentRoutes.has(routeFromHtmlFile(filePath)));
const missingPagefindBodies = expectedSearchFiles
  .filter((filePath) => !pagefindBodyFiles.includes(filePath))
  .map(routeFromHtmlFile)
  .sort();
const unexpectedPagefindBodies = htmlFiles
  .filter((filePath) => nonContentRoutes.has(routeFromHtmlFile(filePath)) && pagefindBodyFiles.includes(filePath))
  .map(routeFromHtmlFile);
if (missingPagefindBodies.length > 0) {
  fail(`HTML routes missing data-pagefind-body: ${missingPagefindBodies.join(', ')}.`);
}
if (unexpectedPagefindBodies.length > 0) {
  fail(`Non-content routes should not expose data-pagefind-body: ${unexpectedPagefindBodies.join(', ')}.`);
}
const pagefindEntry = await readJson(path.join(pagefindDir, 'pagefind-entry.json'), 'dist/pagefind/pagefind-entry.json');
const indexedPageCount = Object.values(pagefindEntry?.languages ?? {}).reduce((sum, language) => sum + Number(language?.page_count ?? 0), 0);
if (indexedPageCount !== pagefindBodyFiles.length) {
  fail(`Pagefind entry reports ${indexedPageCount} indexed pages; dist contains ${pagefindBodyFiles.length} data-pagefind-body HTML pages.`);
}

const searchHtml = htmlByFile.get(path.join(distDir, 'search', 'index.html')) ?? '';
if (!/<pagefind-results\b[^>]*\bshow-images\b/i.test(searchHtml)) {
  fail('/search/ must enable Pagefind result images.');
}
if (!/\bportfolio-result-meta\b/.test(searchHtml)) {
  fail('/search/ must include the portfolio metadata result template.');
}

const renderedCategoryCounts = new Map();
const renderedProjectSlugs = new Set();
const categoryBySlug = new Map();
for (const filePath of projectFiles) {
  const slug = routeSlugFromProjectFile(filePath);
  if (!slug) continue;
  renderedProjectSlugs.add(slug);
  const html = htmlByFile.get(filePath) ?? '';
  const labels = new Set();
  for (const match of html.matchAll(/\bdata-pagefind-filter=(["'])Category:([\s\S]*?)\1/gi)) {
    const label = normalizeLabel(match[2]);
    if (label) labels.add(label);
  }
  if (labels.size !== 1) {
    fail(`/projects/${slug}/ must expose exactly one Category Pagefind filter; found ${labels.size}.`);
    continue;
  }
  const [label] = labels;
  categoryBySlug.set(slug, label);
  increment(renderedCategoryCounts, label);
}

const indexPath = path.join(distDir, 'index.html');
const indexHtml = htmlByFile.get(indexPath) ?? await fs.readFile(indexPath, 'utf8').catch((error) => {
  fail(`dist/index.html is missing or unreadable: ${error.message}`);
  return '';
});
const catalogCategoryCounts = new Map();
const catalogSlugs = new Set();
for (const match of indexHtml.matchAll(/<a\b[^>]*\bclass=(["'])[^"']*\bca\b[^"']*\1[^>]*>/gi)) {
  const tag = match[0];
  const repo = extractAttribute(tag, 'data-repo');
  const category = extractAttribute(tag, 'data-f');
  if (!repo || !category) continue;
  catalogSlugs.add(repo);
  const label = projectFilterLabelsByCategory[category];
  if (!label) {
    fail(`Homepage catalog card ${repo} has unsupported category code ${category}.`);
    continue;
  }
  increment(catalogCategoryCounts, label);
}

const missingProjectRoutes = Array.from(catalogSlugs).filter((slug) => !renderedProjectSlugs.has(slug)).sort();
const missingCatalogCards = Array.from(renderedProjectSlugs).filter((slug) => !catalogSlugs.has(slug)).sort();
if (missingProjectRoutes.length > 0) fail(`Catalog cards without rendered project routes: ${missingProjectRoutes.join(', ')}.`);
if (missingCatalogCards.length > 0) fail(`Rendered project routes without catalog cards: ${missingCatalogCards.join(', ')}.`);
compareCounts('Homepage catalog', catalogCategoryCounts, renderedCategoryCounts);

const pagefind = await loadPagefind().catch((error) => {
  fail(`Unable to load generated Pagefind API: ${error.message}`);
  return null;
});
const pagefindFilters = pagefind ? await pagefind.filters().catch((error) => {
  fail(`Unable to read generated Pagefind filters: ${error.message}`);
  return null;
}) : null;
const pagefindCategoryCounts = new Map(Object.entries(pagefindFilters?.Category ?? {}).map(([key, value]) => [key, Number(value)]));
if (pagefindCategoryCounts.size === 0) {
  fail('Generated Pagefind index does not expose a Category filter.');
}
compareCounts('Pagefind Category filter', pagefindCategoryCounts, renderedCategoryCounts);

for (const label of requiredCategoryLabels) {
  if (!renderedCategoryCounts.has(label)) {
    fail(`Rendered project pages are missing expected Category label ${label}.`);
  }
  if (!pagefindCategoryCounts.has(label)) {
    fail(`Generated Pagefind index is missing expected Category label ${label}.`);
  }
}

let filteredResultCount = 0;
let projectMetadataResultCount = 0;
let archiveMetadataResultCount = 0;
if (pagefind && pagefindCategoryCounts.size > 0) {
  for (const [label, expectedCount] of sortedEntries(renderedCategoryCounts)) {
    const result = await pagefind.search(null, { filters: { Category: label } }).catch((error) => {
      fail(`Filtered empty search for Category:${label} failed: ${error.message}`);
      return null;
    });
    if (!result) continue;
    if (result.results.length !== expectedCount) {
      fail(`Filtered empty search for Category:${label} returned ${result.results.length} results; expected ${expectedCount}.`);
      continue;
    }
    const urls = new Set();
    for (const item of result.results) {
      const data = await item.data();
      const url = String(data?.url ?? '');
      const match = /^\/projects\/([^/]+)\/?$/.exec(url);
      if (!match) {
        fail(`Filtered empty search for Category:${label} returned non-project URL ${url || '(missing)'}.`);
        continue;
      }
      if (!renderedProjectSlugs.has(match[1])) {
        fail(`Filtered empty search for Category:${label} returned unknown project route ${url}.`);
      }
      if (categoryBySlug.get(match[1]) !== label) {
        fail(`Filtered empty search for Category:${label} returned ${url}, which is rendered as ${categoryBySlug.get(match[1])}.`);
      }
      const meta = data?.meta ?? {};
      if (meta.route_type !== 'Project') {
        fail(`${url} metadata route_type is ${meta.route_type || '(missing)'}; expected Project.`);
      }
      if (!['Project', 'Live app'].includes(meta.type)) {
        fail(`${url} metadata type is ${meta.type || '(missing)'}; expected Project or Live app.`);
      }
      if (meta.category !== label) {
        fail(`${url} metadata category is ${meta.category || '(missing)'}; expected ${label}.`);
      }
      if (!isoDatePattern.test(String(meta.updated ?? ''))) {
        fail(`${url} metadata updated is ${meta.updated || '(missing)'}; expected YYYY-MM-DD.`);
      }
      if (!/^\/(?:og|screenshots)\//.test(String(meta.image ?? ''))) {
        fail(`${url} metadata image is ${meta.image || '(missing)'}; expected /og/ or /screenshots/ path.`);
      }
      if (!String(meta.image_alt ?? '').trim()) {
        fail(`${url} metadata image_alt is missing.`);
      }
      projectMetadataResultCount += 1;
      urls.add(url);
    }
    if (urls.size !== expectedCount) {
      fail(`Filtered empty search for Category:${label} returned ${urls.size} unique project URLs; expected ${expectedCount}.`);
    }
    filteredResultCount += result.results.length;
  }

  const archiveResult = await pagefind.search('archive').catch((error) => {
    fail(`Archive metadata search failed: ${error.message}`);
    return null;
  });
  if (archiveResult) {
    let foundArchive = false;
    for (const item of archiveResult.results) {
      const data = await item.data();
      const url = String(data?.url ?? '');
      if (url !== '/archive/' && url !== '/archive') continue;
      foundArchive = true;
      const meta = data?.meta ?? {};
      if (meta.route_type !== 'Archive') {
        fail('/archive/ metadata route_type must be Archive.');
      }
      if (meta.type !== 'Archive') {
        fail('/archive/ metadata type must be Archive.');
      }
      if (meta.category !== 'Portfolio') {
        fail(`/archive/ metadata category is ${meta.category || '(missing)'}; expected Portfolio.`);
      }
      if (!isoDatePattern.test(String(meta.updated ?? ''))) {
        fail(`/archive/ metadata updated is ${meta.updated || '(missing)'}; expected YYYY-MM-DD.`);
      }
      if (meta.image !== '/og/archive.png') {
        fail(`/archive/ metadata image is ${meta.image || '(missing)'}; expected /og/archive.png.`);
      }
      if (!String(meta.image_alt ?? '').trim()) {
        fail('/archive/ metadata image_alt is missing.');
      }
      archiveMetadataResultCount += 1;
      break;
    }
    if (!foundArchive) {
      fail('Search for "archive" did not return the /archive/ route.');
    }
  }
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
console.log(`  Rendered project pages: ${renderedProjectSlugs.size}`);
console.log(`  Homepage catalog cards: ${catalogSlugs.size}`);
console.log(`  Category filters checked: ${pagefindCategoryCounts.size}`);
console.log(`  Filtered project results checked: ${filteredResultCount}`);
console.log(`  Project metadata results checked: ${projectMetadataResultCount}`);
console.log(`  Archive metadata results checked: ${archiveMetadataResultCount}`);
console.log('  Category counts:');
for (const [label, count] of sortedEntries(renderedCategoryCounts)) {
  console.log(`    ${label}: ${count}`);
}
console.log('Search index audit passed.');
