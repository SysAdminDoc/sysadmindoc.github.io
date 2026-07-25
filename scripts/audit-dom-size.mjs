#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const options = { distDir: 'dist' };

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg === '--dist') {
    index += 1;
    options.distDir = process.argv[index] ?? 'dist';
  } else if (arg.startsWith('--dist=')) {
    options.distDir = arg.slice('--dist='.length);
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node scripts/audit-dom-size.mjs [--dist <dir>]');
    process.exit(0);
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

// Timeline page budget: ~200 events × ~18 nodes/event + surrounding chrome.
// All events are rendered in the HTML (no-JS/SEO), so the full list counts.
// 15 000 element budget gives ~10-15% headroom over current event counts.
const timelineBudget = {
  route: '/timeline/',
  domElements: 15_000,
};

// The homepage now renders a ranked PREVIEW slice of the catalog (see
// HOMEPAGE_CATALOG_LIMIT in src/data/catalog-render.ts); the complete list lives
// at the static /catalog/ route. These budgets gate the small homepage preview
// section — the aspirational <=1,400-node homepage catalog budget from the
// roadmap. The /catalog/ page carries the full list and is gated separately for
// complete no-JS reachability below.
const budgets = {
  homepageHtmlBytes: 512_000,
  catalogSectionBytes: 200_000,
  catalogDomNodes: 1_400,
  catalogCards: 96,
  averageCardNodes: 15,
  maxCardNodes: 18,
  averageCardBytes: 1_843,
  maxCardBytes: 2_600,
};
const smallCatalogBudgets = {
  maxCatalogCards: 50,
  averageCardNodes: 16,
  averageCardBytes: 1_900,
};
// The full static catalog section (/catalog/) renders every project; its node
// count is naturally larger. It is gated for completeness (every project
// present) plus a generous structural ceiling.
const catalogPageBudget = {
  route: '/catalog/',
  domNodes: 3_200,
};

const distDir = path.resolve(root, options.distDir);
const errors = [];

function fail(message) {
  errors.push(message);
}

function countTags(html) {
  return Array.from(html.matchAll(/<[A-Za-z][\w:-]*(?:\s|>|\/)/g)).length;
}

function countBytes(value) {
  return Buffer.byteLength(value, 'utf8');
}

function extractCatalogSection(html) {
  const startMatch = /<section\b[^>]*\bid=(["'])catalog\1/i.exec(html);
  if (!startMatch) return '';
  const start = startMatch.index;
  const rest = html.slice(start);
  const nextMatch = /<section\b[^>]*\bid=(["'])/i.exec(rest.slice(1));
  return nextMatch ? rest.slice(0, nextMatch.index + 1) : rest;
}

/** @param {number} bytes */
function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function checkBudget(label, actual, max, formatter = (value) => String(value)) {
  if (actual > max) fail(`${label} is ${formatter(actual)}; budget is ${formatter(max)}.`);
}

function budgetsForCatalog(cardCount) {
  if (cardCount > 0 && cardCount < smallCatalogBudgets.maxCatalogCards) {
    return {
      ...budgets,
      averageCardNodes: smallCatalogBudgets.averageCardNodes,
      averageCardBytes: smallCatalogBudgets.averageCardBytes,
      mode: 'small-catalog',
    };
  }
  return { ...budgets, mode: 'standard' };
}

const indexPath = path.join(distDir, 'index.html');
const projectsPath = path.join(distDir, 'projects.json');
const indexHtml = await fs.readFile(indexPath, 'utf8').catch((error) => {
  throw new Error(`Unable to read ${path.relative(root, indexPath)}: ${error.message}`);
});
const projectsData = JSON.parse(await fs.readFile(projectsPath, 'utf8').catch((error) => {
  throw new Error(`Unable to read ${path.relative(root, projectsPath)}: ${error.message}`);
}));
const projects = Array.isArray(projectsData.projects) ? projectsData.projects : [];
if (projects.length === 0) fail('dist/projects.json contains no projects.');

const catalogHtml = extractCatalogSection(indexHtml);
if (!catalogHtml) fail('dist/index.html is missing the #catalog section.');

const cardPattern = /<a\b(?=[^>]*\bclass=(["'])[^"']*\bca\b[^"']*\1)(?=[^>]*\bdata-repo=)[^>]*>[\s\S]*?<\/a>/gi;
const cardBlocks = Array.from(catalogHtml.matchAll(cardPattern), (match) => match[0]);
const homepageHtmlBytes = countBytes(indexHtml);
const catalogSectionBytes = countBytes(catalogHtml);
const catalogDomNodes = countTags(catalogHtml);
const catalogCards = cardBlocks.length;
let totalCardNodes = 0;
let totalCardBytes = 0;
let maxCardNodes = 0;
let maxCardBytes = 0;

for (const card of cardBlocks) {
  const cardNodes = countTags(card);
  const cardBytes = countBytes(card);
  totalCardNodes += cardNodes;
  totalCardBytes += cardBytes;
  maxCardNodes = Math.max(maxCardNodes, cardNodes);
  maxCardBytes = Math.max(maxCardBytes, cardBytes);
}

const averageCardNodes = catalogCards > 0 ? totalCardNodes / catalogCards : 0;
const averageCardBytes = catalogCards > 0 ? totalCardBytes / catalogCards : 0;
const activeBudgets = budgetsForCatalog(catalogCards);

// The homepage preview renders min(HOMEPAGE_CATALOG_LIMIT, total) ranked cards.
// Read the limit from the shared source so this audit tracks the rendered slice
// without a hardcoded drift risk. This guards against a broken/empty preview
// (too few) or a regression that re-renders the whole catalog (too many).
const catalogRenderSrc = await fs
  .readFile(path.join(root, 'src', 'data', 'catalog-render.ts'), 'utf8')
  .catch(() => '');
const limitMatch = /HOMEPAGE_CATALOG_LIMIT\s*=\s*(\d+)/.exec(catalogRenderSrc);
const homepageCardLimit = limitMatch ? Number(limitMatch[1]) : 84;
const expectedHomepageCards = Math.min(homepageCardLimit, projects.length);
if (catalogCards !== expectedHomepageCards) {
  fail(
    `Homepage renders ${catalogCards} catalog preview cards; expected ${expectedHomepageCards} `
    + `(min of the ${homepageCardLimit}-card preview limit and ${projects.length} projects).`,
  );
}
checkBudget('Homepage HTML size', homepageHtmlBytes, activeBudgets.homepageHtmlBytes, formatBytes);
checkBudget('Catalog section size', catalogSectionBytes, activeBudgets.catalogSectionBytes, formatBytes);
checkBudget('Catalog DOM nodes', catalogDomNodes, activeBudgets.catalogDomNodes);
checkBudget('Catalog cards', catalogCards, activeBudgets.catalogCards);
checkBudget('Average card DOM nodes', averageCardNodes, activeBudgets.averageCardNodes, (value) => value.toFixed(2));
checkBudget('Max card DOM nodes', maxCardNodes, activeBudgets.maxCardNodes);
checkBudget('Average card bytes', averageCardBytes, activeBudgets.averageCardBytes, formatBytes);
checkBudget('Max card bytes', maxCardBytes, activeBudgets.maxCardBytes, formatBytes);

// --- Full static catalog page audit (/catalog/) ---
// The homepage only previews a slice, so the full static list at /catalog/ is
// what guarantees every reviewed project stays reachable with JavaScript
// disabled and indexable by crawlers/Pagefind. It must be complete.
const catalogPagePath = path.join(distDir, 'catalog', 'index.html');
const catalogPageHtml = await fs.readFile(catalogPagePath, 'utf8').catch(() => null);
let catalogPageCards = null;
let catalogPageDomNodes = null;
if (catalogPageHtml) {
  const catalogPageSection = extractCatalogSection(catalogPageHtml);
  if (!catalogPageSection) {
    fail(`${catalogPageBudget.route} is missing the #catalog section.`);
  } else {
    catalogPageDomNodes = countTags(catalogPageSection);
    catalogPageCards = Array.from(catalogPageSection.matchAll(cardPattern), (match) => match[0]).length;
    if (catalogPageCards !== projects.length) {
      fail(
        `${catalogPageBudget.route} renders ${catalogPageCards} project links; dist/projects.json exposes `
        + `${projects.length} projects. The full catalog must stay complete for no-JS reachability and indexing.`,
      );
    }
    checkBudget(`Catalog page DOM nodes (${catalogPageBudget.route})`, catalogPageDomNodes, catalogPageBudget.domNodes);
  }
} else {
  fail(`${catalogPageBudget.route} (dist/catalog/index.html) is missing; the full static catalog route must exist for no-JS reachability.`);
}

// --- Timeline page audit ---
const timelinePath = path.join(distDir, 'timeline', 'index.html');
const timelineHtml = await fs.readFile(timelinePath, 'utf8').catch(() => null);
let timelineDomElements = null;
if (timelineHtml) {
  timelineDomElements = countTags(timelineHtml);
  checkBudget(`Timeline DOM elements (${timelineBudget.route})`, timelineDomElements, timelineBudget.domElements);
} else {
  console.warn(`  [warn] ${timelineBudget.route} not found in dist — timeline audit skipped.`);
}

console.log('DOM size audit');
console.log(`  dist: ${path.relative(root, distDir) || distDir}`);
console.log(`  budget mode: ${activeBudgets.mode}`);
console.log(`  homepage HTML: ${formatBytes(homepageHtmlBytes)} / ${formatBytes(activeBudgets.homepageHtmlBytes)}`);
console.log(`  catalog section: ${formatBytes(catalogSectionBytes)} / ${formatBytes(activeBudgets.catalogSectionBytes)}`);
console.log(`  homepage preview cards: ${catalogCards} / ${activeBudgets.catalogCards} (expected ${expectedHomepageCards})`);
console.log(`  homepage catalog DOM nodes: ${catalogDomNodes} / ${activeBudgets.catalogDomNodes}`);
if (catalogPageCards !== null) {
  console.log(`  /catalog/ project links: ${catalogPageCards} / ${projects.length} (full coverage)`);
  console.log(`  /catalog/ DOM nodes: ${catalogPageDomNodes} / ${catalogPageBudget.domNodes}`);
}
console.log(`  average card DOM nodes: ${averageCardNodes.toFixed(2)} / ${activeBudgets.averageCardNodes}`);
console.log(`  max card DOM nodes: ${maxCardNodes} / ${activeBudgets.maxCardNodes}`);
console.log(`  average card bytes: ${formatBytes(averageCardBytes)} / ${formatBytes(activeBudgets.averageCardBytes)}`);
console.log(`  max card bytes: ${formatBytes(maxCardBytes)} / ${formatBytes(activeBudgets.maxCardBytes)}`);
if (timelineDomElements !== null) {
  console.log(`  timeline DOM elements: ${timelineDomElements} / ${timelineBudget.domElements}`);
}

if (errors.length > 0) {
  console.error('DOM size audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('DOM size audit passed.');
