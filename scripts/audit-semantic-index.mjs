import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
import { parseValue, exportedArray } from './lib/ts-data-utils.mjs';

const root = process.cwd();
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const readmesPath = path.join(root, 'src', 'data', '_readmes.json');
const minScore = Number(process.argv.includes('--min-score') ? process.argv[process.argv.indexOf('--min-score') + 1] : 0.42);
const reportLimit = Number(process.argv.includes('--limit') ? process.argv[process.argv.indexOf('--limit') + 1] : 12);
const strictMode = process.argv.includes('--strict');
const fixtureMode = process.env.PROFILE_PROJECTS_OFFLINE === '1' || process.argv.includes('--fixture');

const README_COVERAGE_THRESHOLD = 50; // minimum % of projects that must have a README text in strict mode

const stopwords = new Set([
  'about', 'across', 'after', 'also', 'android', 'app', 'apps', 'based', 'built', 'client', 'code', 'custom',
  'data', 'desktop', 'docs', 'file', 'for', 'from', 'github', 'gui', 'into', 'local', 'manager', 'modern',
  'open', 'powered', 'privacy', 'project', 'projects', 'repo', 'script', 'source', 'suite', 'system',
  'that', 'the', 'this', 'tool', 'tools', 'using', 'with', 'windows',
]);

function cleanText(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[`*_~()[\]{}|\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeToken(token) {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function tokenize(text) {
  return cleanText(text)
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/g)
    .map(normalizeToken)
    .filter((token) => token.length >= 3 && !stopwords.has(token) && !/^\d+$/.test(token));
}

function addTokens(vector, text, weight = 1) {
  for (const token of tokenize(text)) vector.set(token, (vector.get(token) || 0) + weight);
}

function cosine(a, b) {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (const value of a.values()) aMag += value * value;
  for (const value of b.values()) bMag += value * value;
  for (const [token, value] of a.entries()) dot += value * (b.get(token) || 0);
  if (!aMag || !bMag) return 0;
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}

const sourceText = await fs.readFile(projectsPath, 'utf8');
const source = ts.createSourceFile(projectsPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const featured = exportedArray(source, 'featured');
const liveApps = exportedArray(source, 'liveApps');
const catalog = exportedArray(source, 'catalog');

let readmes = {};
try {
  readmes = JSON.parse(await fs.readFile(readmesPath, 'utf8'));
} catch {}

const projects = new Map();
for (const project of featured) {
  projects.set(project.repo, {
    slug: project.repo,
    name: project.name ?? project.repo,
    category: project.lang ?? 'featured',
    description: project.desc ?? '',
    tags: project.tags ?? [],
    featured: true,
    live: false,
  });
}
for (const app of liveApps) {
  const existing = projects.get(app.slug) || {};
  projects.set(app.slug, {
    slug: app.slug,
    name: existing.name ?? app.name ?? app.slug,
    category: existing.category ?? 'web',
    description: existing.description ?? app.desc ?? '',
    tags: existing.tags ?? [],
    featured: Boolean(existing.featured),
    live: true,
  });
}
for (const entry of catalog) {
  const existing = projects.get(entry.repo) || {};
  projects.set(entry.repo, {
    slug: entry.repo,
    name: existing.name ?? entry.name ?? entry.repo,
    category: entry.category ?? existing.category ?? 'other',
    description: existing.description ?? entry.desc ?? '',
    tags: existing.tags ?? [],
    featured: Boolean(existing.featured),
    live: Boolean(existing.live || entry.live),
  });
}

const docs = Array.from(projects.values()).map((project) => {
  const readme = cleanText(readmes[project.slug] || '').slice(0, 4000);
  const vector = new Map();
  addTokens(vector, project.name, 4);
  addTokens(vector, project.description, 3);
  addTokens(vector, project.category, 2);
  addTokens(vector, project.tags.join(' '), 2);
  addTokens(vector, readme, 1);
  return { ...project, readmePresent: readme.length > 0, vector };
});

const pairs = [];
for (let i = 0; i < docs.length; i += 1) {
  for (let j = i + 1; j < docs.length; j += 1) {
    const score = cosine(docs[i].vector, docs[j].vector);
    if (score >= minScore) {
      pairs.push({
        score,
        a: docs[i],
        b: docs[j],
        sameCategory: docs[i].category === docs[j].category,
      });
    }
  }
}
pairs.sort((a, b) => b.score - a.score || a.a.slug.localeCompare(b.a.slug));

const categoryMismatches = pairs.filter((pair) => !pair.sameCategory).slice(0, reportLimit);
const topPairs = pairs.slice(0, reportLimit);
const readmeCount = docs.filter((doc) => doc.readmePresent).length;

const readmeCoverage = docs.length > 0 ? (readmeCount / docs.length) * 100 : 0;
const readmeCoverageLabel = fixtureMode
  ? `${readmeCoverage.toFixed(1)}% (fixture mode)`
  : `${readmeCoverage.toFixed(1)}%`;

console.log('Semantic project audit');
console.log(`  projects: ${docs.length}`);
console.log(`  README texts available: ${readmeCount}`);
console.log(`  README corpus coverage: ${readmeCoverageLabel}`);
console.log(`  min score: ${minScore}`);
console.log('');
console.log('Top similar pairs:');
for (const pair of topPairs) {
  console.log(`  ${pair.score.toFixed(3)} ${pair.a.slug} [${pair.a.category}] <> ${pair.b.slug} [${pair.b.category}]`);
}
console.log('');
console.log('Cross-category review candidates:');
if (categoryMismatches.length === 0) {
  console.log('  none above threshold');
} else {
  for (const pair of categoryMismatches) {
    console.log(`  ${pair.score.toFixed(3)} ${pair.a.slug} [${pair.a.category}] <> ${pair.b.slug} [${pair.b.category}]`);
  }
}

console.log('');
console.log('Semantic project audit completed. This report is advisory and does not add runtime tracking or hosted inference.');

if (!fixtureMode && strictMode && readmeCoverage < README_COVERAGE_THRESHOLD) {
  console.error(
    `README coverage gate failed: ${readmeCoverage.toFixed(1)}% < ${README_COVERAGE_THRESHOLD}% threshold (${readmeCount}/${docs.length} projects). Run without --strict or increase corpus coverage.`,
  );
  process.exit(1);
}
