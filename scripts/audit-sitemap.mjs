import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const distDir = path.resolve(root, process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist');
const siteUrl = 'https://sysadmindoc.github.io';
const errors = [];

const requiredRoutes = [
  '/',
  '/search/',
  '/releases/',
  '/now/',
  '/uses/',
  '/resume/',
  '/healthcare-it/',
  '/ai/',
  '/timeline/',
  '/archive/',
];

function fail(message) {
  errors.push(message);
}

async function readDistFile(relativePath) {
  try {
    return await fs.readFile(path.join(distDir, relativePath), 'utf8');
  } catch (error) {
    fail(`dist/${relativePath} is missing or unreadable: ${error.message}`);
    return null;
  }
}

function extractLocValues(xml) {
  const locs = [];
  for (const match of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    locs.push(match[1].trim());
  }
  return locs;
}

function isWellFormedXml(xml, label) {
  // Verify XML declaration present
  if (!xml.trimStart().startsWith('<?xml')) {
    fail(`${label} does not start with an XML declaration.`);
    return false;
  }
  // Verify no unescaped bare & outside of entity references or CDATA
  if (/&(?!amp;|lt;|gt;|apos;|quot;|#\d+;|#x[0-9a-fA-F]+;)[^;]*(?:;|$)/m.test(xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, ''))) {
    fail(`${label} contains unescaped '&' characters.`);
    return false;
  }
  return true;
}

function urlToDistPath(url) {
  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  // Trailing-slash pages map to index.html
  if (pathname.endsWith('/')) return pathname + 'index.html';
  return pathname;
}

async function distPathExists(distRelPath) {
  try {
    await fs.access(path.join(distDir, distRelPath));
    return true;
  } catch {
    return false;
  }
}

// ── Read and validate sitemap-index.xml ──────────────────────────────────────

const indexXml = await readDistFile('sitemap-index.xml');
if (indexXml === null) {
  console.error('Sitemap audit failed:');
  console.error('  - dist/sitemap-index.xml is missing; cannot continue.');
  process.exit(1);
}

isWellFormedXml(indexXml, 'sitemap-index.xml');

if (!indexXml.includes('<sitemapindex')) {
  fail('sitemap-index.xml does not contain a <sitemapindex> root element.');
}

const indexLocs = extractLocValues(indexXml);
if (indexLocs.length === 0) {
  fail('sitemap-index.xml contains no <loc> entries.');
}

// ── Process each child sitemap ────────────────────────────────────────────────

const allPageUrls = [];

for (const loc of indexLocs) {
  let sitemapPathname;
  try {
    const parsed = new URL(loc);
    if (parsed.origin !== siteUrl) {
      fail(`sitemap-index.xml <loc> "${loc}" does not use the expected origin ${siteUrl}.`);
      continue;
    }
    sitemapPathname = parsed.pathname;
  } catch {
    fail(`sitemap-index.xml <loc> "${loc}" is not a valid URL.`);
    continue;
  }

  // pathname is e.g. /sitemap-0.xml — strip leading slash to get dist-relative path
  const distRelative = sitemapPathname.replace(/^\//, '');
  const childXml = await readDistFile(distRelative);
  if (childXml === null) continue;

  isWellFormedXml(childXml, distRelative);

  if (!childXml.includes('<urlset')) {
    fail(`${distRelative} does not contain a <urlset> root element.`);
    continue;
  }

  const pageLocs = extractLocValues(childXml);
  if (pageLocs.length === 0) {
    fail(`${distRelative} contains no <url><loc> entries.`);
    continue;
  }

  for (const pageUrl of pageLocs) {
    // Verify correct site origin
    let parsed;
    try {
      parsed = new URL(pageUrl);
    } catch {
      fail(`${distRelative}: "${pageUrl}" is not a valid URL.`);
      continue;
    }
    if (parsed.origin !== siteUrl) {
      fail(`${distRelative}: "${pageUrl}" uses wrong origin (expected ${siteUrl}).`);
      continue;
    }

    // Verify the path resolves to a file in dist/
    const distPath = urlToDistPath(pageUrl);
    if (!distPath) {
      fail(`${distRelative}: could not derive dist path from "${pageUrl}".`);
      continue;
    }
    const exists = await distPathExists(distPath);
    if (!exists) {
      fail(`${distRelative}: "${pageUrl}" maps to dist${distPath} which does not exist.`);
    }

    allPageUrls.push(pageUrl);
  }
}

// ── Check required routes ─────────────────────────────────────────────────────

const allPathnames = allPageUrls.map((url) => {
  try { return new URL(url).pathname; } catch { return ''; }
});

for (const route of requiredRoutes) {
  if (!allPathnames.includes(route)) {
    fail(`Sitemap is missing required route "${route}".`);
  }
}

// Local project detail routes were retired; repository links now point to GitHub.
const projectRoutes = allPathnames.filter((p) => /^\/projects\/[^/]+\/$/.test(p));
if (projectRoutes.length > 0) {
  fail(`Sitemap still contains removed project routes: ${projectRoutes.join(', ')}.`);
}

// At least some /lang/* routes
const langRoutes = allPathnames.filter((p) => /^\/lang\/[^/]+\/$/.test(p));
if (langRoutes.length === 0) {
  fail('Sitemap contains no /lang/* routes.');
}

// ── Report ────────────────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error('Sitemap audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Sitemap audit');
console.log(`  sitemap index entries: ${indexLocs.length}`);
console.log(`  total URLs: ${allPageUrls.length}`);
console.log(`  required routes checked: ${requiredRoutes.length}`);
console.log(`  removed /projects/* routes: ${projectRoutes.length}`);
console.log(`  /lang/* routes: ${langRoutes.length}`);
console.log('Sitemap audit passed.');
