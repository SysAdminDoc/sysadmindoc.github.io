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

const budgets = {
  homepageHtmlBytes: 460_800,
  catalogSectionBytes: 266_240,
  catalogDomNodes: 2_300,
  catalogCards: 220,
  averageCardNodes: 13,
  maxCardNodes: 18,
  averageCardBytes: 1_500,
  maxCardBytes: 2_600,
};
const smallCatalogBudgets = {
  maxCatalogCards: 50,
  averageCardNodes: 16,
  averageCardBytes: 1_900,
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

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function checkBudget(label, actual, max, formatter = String) {
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

if (catalogCards !== projects.length) {
  fail(`Homepage catalog renders ${catalogCards} cards; dist/projects.json exposes ${projects.length} projects.`);
}
checkBudget('Homepage HTML size', homepageHtmlBytes, activeBudgets.homepageHtmlBytes, formatBytes);
checkBudget('Catalog section size', catalogSectionBytes, activeBudgets.catalogSectionBytes, formatBytes);
checkBudget('Catalog DOM nodes', catalogDomNodes, activeBudgets.catalogDomNodes);
checkBudget('Catalog cards', catalogCards, activeBudgets.catalogCards);
checkBudget('Average card DOM nodes', averageCardNodes, activeBudgets.averageCardNodes, (value) => value.toFixed(2));
checkBudget('Max card DOM nodes', maxCardNodes, activeBudgets.maxCardNodes);
checkBudget('Average card bytes', averageCardBytes, activeBudgets.averageCardBytes, formatBytes);
checkBudget('Max card bytes', maxCardBytes, activeBudgets.maxCardBytes, formatBytes);

console.log('DOM size audit');
console.log(`  dist: ${path.relative(root, distDir) || distDir}`);
console.log(`  budget mode: ${activeBudgets.mode}`);
console.log(`  homepage HTML: ${formatBytes(homepageHtmlBytes)} / ${formatBytes(activeBudgets.homepageHtmlBytes)}`);
console.log(`  catalog section: ${formatBytes(catalogSectionBytes)} / ${formatBytes(activeBudgets.catalogSectionBytes)}`);
console.log(`  catalog cards: ${catalogCards} / ${activeBudgets.catalogCards}`);
console.log(`  catalog DOM nodes: ${catalogDomNodes} / ${activeBudgets.catalogDomNodes}`);
console.log(`  average card DOM nodes: ${averageCardNodes.toFixed(2)} / ${activeBudgets.averageCardNodes}`);
console.log(`  max card DOM nodes: ${maxCardNodes} / ${activeBudgets.maxCardNodes}`);
console.log(`  average card bytes: ${formatBytes(averageCardBytes)} / ${formatBytes(activeBudgets.averageCardBytes)}`);
console.log(`  max card bytes: ${formatBytes(maxCardBytes)} / ${formatBytes(activeBudgets.maxCardBytes)}`);

if (errors.length > 0) {
  console.error('DOM size audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('DOM size audit passed.');
