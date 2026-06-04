import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const distDir = path.resolve(root, process.argv.includes('--dist') ? process.argv[process.argv.indexOf('--dist') + 1] : 'dist');
const siteUrl = 'https://sysadmindoc.github.io';
const personId = `${siteUrl}/#matt-parker`;
const websiteId = `${siteUrl}/#website`;

const representativeRoutes = new Map([
  ['/', {
    types: ['WebSite', 'Person', 'ProfilePage'],
    checks: checkHomeRoute,
  }],
  ['/lang/powershell/', {
    types: ['WebSite', 'Person', 'CollectionPage', 'BreadcrumbList'],
    checks: checkLanguageRoute,
  }],
  ['/projects/win11-nvme-driver-patcher/', {
    types: ['WebSite', 'Person', 'SoftwareSourceCode', 'BreadcrumbList'],
    checks: checkProjectRoute,
  }],
  ['/projects/StormviewRadar/', {
    types: ['WebSite', 'Person', 'SoftwareSourceCode', 'SoftwareApplication', 'BreadcrumbList'],
    checks: checkLiveProjectRoute,
  }],
  ['/uses/', {
    types: ['WebSite', 'Person', 'WebPage'],
    checks: checkReviewedInteriorRoute,
  }],
  ['/resume/', {
    types: ['WebSite', 'Person', 'ProfilePage', 'WebPage'],
    checks: checkReviewedInteriorRoute,
  }],
  ['/search/', {
    types: ['WebSite', 'Person', 'SearchResultsPage', 'WebPage'],
    checks: checkReviewedInteriorRoute,
  }],
  ['/timeline/', {
    types: ['WebSite', 'Person', 'CollectionPage', 'WebPage'],
    checks: checkReviewedInteriorRoute,
  }],
  ['/archive/', {
    types: ['WebSite', 'Person', 'CollectionPage', 'WebPage'],
    checks: checkReviewedInteriorRoute,
  }],
  ['/now/', {
    types: ['WebSite', 'Person', 'WebPage'],
    checks: checkReviewedInteriorRoute,
  }],
  ['/healthcare-it/', {
    types: ['WebSite', 'Person', 'AboutPage', 'WebPage'],
    checks: checkReviewedInteriorRoute,
  }],
  ['/releases/', {
    types: ['WebSite', 'Person', 'CollectionPage', 'WebPage'],
    checks: checkReviewedInteriorRoute,
  }],
]);

function fail(message) {
  throw new Error(message);
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

function routeFromFile(filePath) {
  const relative = path.relative(distDir, filePath).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const pattern = /<script\b(?=[^>]*\btype=(["'])application\/ld\+json\1)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    blocks.push(match[2].trim());
  }
  return blocks;
}

function parseJsonLd(block, route, index) {
  try {
    return JSON.parse(block);
  } catch (error) {
    fail(`${route} JSON-LD block ${index + 1} is not valid JSON: ${error.message}`);
  }
}

function nodeTypes(node) {
  const type = node?.['@type'];
  return Array.isArray(type) ? type : [type].filter(Boolean);
}

function graphNodes(doc) {
  if (Array.isArray(doc?.['@graph'])) return doc['@graph'];
  return [doc].filter(Boolean);
}

function hasType(nodes, type) {
  return nodes.some((node) => nodeTypes(node).includes(type));
}

function findType(nodes, type) {
  return nodes.find((node) => nodeTypes(node).includes(type));
}

function requireType(nodes, type, route) {
  const node = findType(nodes, type);
  if (!node) fail(`${route} is missing JSON-LD type ${type}`);
  return node;
}

function requireSchemaContext(docs, route) {
  for (const [index, doc] of docs.entries()) {
    if (doc?.['@context'] !== 'https://schema.org') {
      fail(`${route} JSON-LD block ${index + 1} must use https://schema.org context`);
    }
    const graph = graphNodes(doc);
    if (graph.length === 0) fail(`${route} JSON-LD block ${index + 1} has no graph nodes`);
    for (const node of graph) {
      if (nodeTypes(node).length === 0) fail(`${route} JSON-LD block ${index + 1} has a node without @type`);
    }
  }
}

function requireBaseGraph(nodes, route) {
  const website = requireType(nodes, 'WebSite', route);
  const person = requireType(nodes, 'Person', route);
  if (website['@id'] !== websiteId) fail(`${route} WebSite @id drifted from ${websiteId}`);
  if (website.publisher?.['@id'] !== personId) fail(`${route} WebSite publisher must reference ${personId}`);
  if (person['@id'] !== personId) fail(`${route} Person @id drifted from ${personId}`);
}

function requireContiguousListItems(items, route, label) {
  if (!Array.isArray(items) || items.length === 0) fail(`${route} ${label} must have list items`);
  items.forEach((item, index) => {
    if (item?.['@type'] !== 'ListItem') fail(`${route} ${label} item ${index + 1} must be ListItem`);
    if (item.position !== index + 1) fail(`${route} ${label} item ${index + 1} has non-contiguous position`);
    if (!item.name || typeof item.name !== 'string') fail(`${route} ${label} item ${index + 1} is missing name`);
  });
}

function checkHomeRoute(nodes, route) {
  requireBaseGraph(nodes, route);
  const profile = requireType(nodes, 'ProfilePage', route);
  if (profile['@id'] !== `${siteUrl}/#profile`) fail(`${route} ProfilePage @id drifted`);
  if (profile.url !== `${siteUrl}/`) fail(`${route} ProfilePage url drifted`);
  if (profile.mainEntity?.['@id'] !== personId) fail(`${route} ProfilePage mainEntity must reference ${personId}`);
}

function checkLanguageRoute(nodes, route) {
  requireBaseGraph(nodes, route);
  const collection = requireType(nodes, 'CollectionPage', route);
  const breadcrumb = requireType(nodes, 'BreadcrumbList', route);
  if (collection.url !== `${siteUrl}${route}`) fail(`${route} CollectionPage url drifted`);
  if (collection.about?.['@id'] !== personId) fail(`${route} CollectionPage about must reference ${personId}`);
  if (collection.mainEntity?.['@type'] !== 'ItemList') fail(`${route} CollectionPage mainEntity must be ItemList`);
  const items = collection.mainEntity.itemListElement;
  requireContiguousListItems(items, route, 'CollectionPage ItemList');
  if (collection.mainEntity.numberOfItems !== items.length) {
    fail(`${route} CollectionPage numberOfItems must match itemListElement length`);
  }
  if (!items.every((item) => typeof item.url === 'string' && item.url.startsWith(`${siteUrl}/projects/`))) {
    fail(`${route} CollectionPage items must link to project routes`);
  }
  requireContiguousListItems(breadcrumb.itemListElement, route, 'BreadcrumbList');
}

function checkProjectRoute(nodes, route) {
  requireBaseGraph(nodes, route);
  const sourceCode = requireType(nodes, 'SoftwareSourceCode', route);
  const breadcrumb = requireType(nodes, 'BreadcrumbList', route);
  if (sourceCode['@id'] !== `${siteUrl}${route}#source`) fail(`${route} SoftwareSourceCode @id drifted`);
  if (sourceCode.author?.['@id'] !== personId) fail(`${route} SoftwareSourceCode author must reference ${personId}`);
  if (!String(sourceCode.codeRepository ?? '').startsWith('https://github.com/SysAdminDoc/')) {
    fail(`${route} SoftwareSourceCode codeRepository must point at SysAdminDoc GitHub`);
  }
  if (!String(sourceCode.image ?? '').startsWith(`${siteUrl}/og/`)) {
    fail(`${route} SoftwareSourceCode image must be an absolute site OG URL`);
  }
  if (sourceCode.datePublished && Number.isNaN(new Date(sourceCode.datePublished).getTime())) {
    fail(`${route} SoftwareSourceCode datePublished is not parseable`);
  }
  if (sourceCode.dateModified && Number.isNaN(new Date(sourceCode.dateModified).getTime())) {
    fail(`${route} SoftwareSourceCode dateModified is not parseable`);
  }
  if (sourceCode.license && !String(sourceCode.license).startsWith('https://spdx.org/licenses/')) {
    fail(`${route} SoftwareSourceCode license must be an SPDX URL`);
  }
  requireContiguousListItems(breadcrumb.itemListElement, route, 'BreadcrumbList');
  const leaf = breadcrumb.itemListElement.at(-1);
  if (leaf?.item !== `${siteUrl}${route}`) fail(`${route} BreadcrumbList leaf item must match route`);
}

function checkLiveProjectRoute(nodes, route) {
  checkProjectRoute(nodes, route);
  const sourceCode = requireType(nodes, 'SoftwareSourceCode', route);
  const softwareApplication = requireType(nodes, 'SoftwareApplication', route);
  const expectedAppId = `${siteUrl}${route}#software-application`;
  if (softwareApplication['@id'] !== expectedAppId) fail(`${route} SoftwareApplication @id drifted`);
  if (sourceCode.targetProduct?.['@id'] !== expectedAppId) {
    fail(`${route} SoftwareSourceCode targetProduct must reference ${expectedAppId}`);
  }
  if (softwareApplication.author?.['@id'] !== personId) {
    fail(`${route} SoftwareApplication author must reference ${personId}`);
  }
  if (!String(softwareApplication.url ?? '').startsWith('https://')) {
    fail(`${route} SoftwareApplication url must be an absolute HTTPS URL`);
  }
  if (!String(softwareApplication.applicationCategory ?? '').trim()) {
    fail(`${route} SoftwareApplication applicationCategory is missing`);
  }
  if (softwareApplication.operatingSystem !== 'Web') {
    fail(`${route} SoftwareApplication operatingSystem must be Web`);
  }
  if (softwareApplication.isAccessibleForFree !== true) {
    fail(`${route} SoftwareApplication must be marked free to access`);
  }
  if (softwareApplication.offers?.['@type'] !== 'Offer') {
    fail(`${route} SoftwareApplication offers must be an Offer`);
  }
  if (Number(softwareApplication.offers?.price) !== 0 || softwareApplication.offers?.priceCurrency !== 'USD') {
    fail(`${route} SoftwareApplication offers must advertise price 0 USD`);
  }
  if (!sourceCode.datePublished || Number.isNaN(new Date(sourceCode.datePublished).getTime())) {
    fail(`${route} SoftwareSourceCode datePublished is missing or not parseable`);
  }
  if (!softwareApplication.datePublished || Number.isNaN(new Date(softwareApplication.datePublished).getTime())) {
    fail(`${route} SoftwareApplication datePublished is missing or not parseable`);
  }
  if (sourceCode.datePublished !== softwareApplication.datePublished) {
    fail(`${route} SoftwareApplication datePublished must match SoftwareSourceCode`);
  }
  if (!sourceCode.license || !String(sourceCode.license).startsWith('https://spdx.org/licenses/')) {
    fail(`${route} SoftwareSourceCode license is missing or not an SPDX URL`);
  }
  if (softwareApplication.license !== sourceCode.license) {
    fail(`${route} SoftwareApplication license must match SoftwareSourceCode`);
  }
}

function checkReviewedInteriorRoute(nodes, route) {
  requireBaseGraph(nodes, route);
  const webPage = requireType(nodes, 'WebPage', route);
  if (webPage['@id'] !== `${siteUrl}${route}#webpage`) fail(`${route} WebPage @id drifted`);
  if (webPage.url !== `${siteUrl}${route}`) fail(`${route} WebPage url drifted`);
  if (webPage.isPartOf?.['@id'] !== websiteId) fail(`${route} WebPage isPartOf must reference ${websiteId}`);
  if (webPage.about?.['@id'] !== personId) fail(`${route} WebPage about must reference ${personId}`);
  if (webPage.reviewedBy?.['@id'] !== personId) fail(`${route} WebPage reviewedBy must reference ${personId}`);
  if (hasType([webPage], 'ProfilePage') && webPage.mainEntity?.['@id'] !== personId) {
    fail(`${route} ProfilePage mainEntity must reference ${personId}`);
  }
  if (!webPage.dateModified || Number.isNaN(new Date(webPage.dateModified).getTime())) {
    fail(`${route} WebPage dateModified is missing or not parseable`);
  }
}

const htmlFiles = await collectHtmlFiles(distDir);
if (htmlFiles.length === 0) fail(`No built HTML files found under ${path.relative(root, distDir) || distDir}`);

let jsonLdBlockCount = 0;
let graphNodeCount = 0;
let pagesWithBaseGraph = 0;
const routeGraphs = new Map();
const errors = [];

for (const filePath of htmlFiles) {
  const route = routeFromFile(filePath);
  const html = await fs.readFile(filePath, 'utf8');
  const blocks = extractJsonLdBlocks(html);
  if (blocks.length === 0) {
    errors.push(`${route} has no application/ld+json blocks`);
    continue;
  }

  const docs = blocks.map((block, index) => parseJsonLd(block, route, index));
  try {
    requireSchemaContext(docs, route);
  } catch (error) {
    errors.push(error.message);
  }
  const nodes = docs.flatMap(graphNodes);
  jsonLdBlockCount += blocks.length;
  graphNodeCount += nodes.length;
  if (hasType(nodes, 'WebSite') && hasType(nodes, 'Person')) pagesWithBaseGraph += 1;
  routeGraphs.set(route, nodes);
}

for (const [route, expectation] of representativeRoutes) {
  const nodes = routeGraphs.get(route);
  if (!nodes) {
    errors.push(`${route} was not found in built HTML output`);
    continue;
  }
  for (const type of expectation.types) {
    if (!hasType(nodes, type)) errors.push(`${route} is missing representative type ${type}`);
  }
  try {
    expectation.checks(nodes, route);
  } catch (error) {
    errors.push(error.message);
  }
}

if (errors.length > 0) {
  console.error('Rendered JSON-LD audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Rendered JSON-LD audit');
console.log(`  HTML pages scanned: ${htmlFiles.length}`);
console.log(`  JSON-LD blocks parsed: ${jsonLdBlockCount}`);
console.log(`  Graph nodes parsed: ${graphNodeCount}`);
console.log(`  Pages with base WebSite/Person graph: ${pagesWithBaseGraph}`);
console.log(`  Representative routes checked: ${representativeRoutes.size}`);
console.log('Rendered JSON-LD audit passed.');
