import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root = process.cwd();
const owner = 'SysAdminDoc';
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const typesPath = path.join(root, 'src', 'data', 'types.ts');
const categoriesPath = path.join(root, 'src', 'data', 'categories.ts');
const policyPath = path.join(root, 'src', 'data', 'catalog-policy.json');
const screenshotsDir = path.join(root, 'public', 'screenshots');

const errors = [];

function sourceFile(filePath, sourceText) {
  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function location(source, node) {
  const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
  return `${path.relative(root, source.fileName)}:${line + 1}:${character + 1}`;
}

function fail(message) {
  errors.push(message);
}

function propertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function parseValue(node, source) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((element) => parseValue(element, source));
  if (ts.isObjectLiteralExpression(node)) {
    const result = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) {
        fail(`Unsupported object property in ${location(source, property)}.`);
        continue;
      }
      const key = propertyName(property.name);
      if (!key) {
        fail(`Unsupported property name in ${location(source, property.name)}.`);
        continue;
      }
      result[key] = parseValue(property.initializer, source);
    }
    return result;
  }

  fail(`Unsupported value syntax ${ts.SyntaxKind[node.kind]} in ${location(source, node)}.`);
  return undefined;
}

function exportedArray(source, exportName) {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportName) continue;
      if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
        fail(`Expected ${exportName} to be an array literal in ${location(source, declaration)}.`);
        return [];
      }
      return declaration.initializer.elements.map((element, index) => {
        if (!ts.isObjectLiteralExpression(element)) {
          fail(`Expected ${exportName}[${index}] to be an object literal in ${location(source, element)}.`);
          return {};
        }
        return parseValue(element, source);
      });
    }
  }

  fail(`Missing exported array ${exportName}.`);
  return [];
}

function exportedObject(source, exportName) {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportName) continue;
      if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) {
        fail(`Expected ${exportName} to be an object literal in ${location(source, declaration)}.`);
        return {};
      }
      return parseValue(declaration.initializer, source);
    }
  }

  fail(`Missing exported object ${exportName}.`);
  return {};
}

function exportedStringUnion(source, typeName) {
  for (const statement of source.statements) {
    if (!ts.isTypeAliasDeclaration(statement) || statement.name.text !== typeName) continue;
    if (!ts.isUnionTypeNode(statement.type)) {
      fail(`Expected ${typeName} to be a string union in ${location(source, statement)}.`);
      return [];
    }
    const values = [];
    for (const type of statement.type.types) {
      if (!ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal)) {
        fail(`Expected ${typeName} member to be a string literal in ${location(source, type)}.`);
        continue;
      }
      values.push(type.literal.text);
    }
    return values;
  }

  fail(`Missing type alias ${typeName}.`);
  return [];
}

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function requireString(section, index, record, key) {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${section}[${index}].${key} must be a non-empty string.`);
    return '';
  }
  return value;
}

function requireStringArray(section, index, record, key) {
  const value = record[key];
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
    fail(`${section}[${index}].${key} must be a non-empty string array.`);
    return [];
  }
  return value;
}

function validateRepoName(section, index, key, value) {
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    fail(`${section}[${index}].${key} must be a GitHub-safe slug, got "${value}".`);
  }
}

function validateHttpsUrl(section, index, key, value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') fail(`${section}[${index}].${key} must use https.`);
    return url;
  } catch {
    fail(`${section}[${index}].${key} must be a valid absolute URL, got "${value}".`);
    return null;
  }
}

function validateUnique(section, records, key) {
  const seen = new Map();
  records.forEach((record, index) => {
    const value = record[key];
    if (typeof value !== 'string') return;
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      fail(`${section}[${index}].${key} duplicates ${section}[${seen.get(normalized)}].${key}: "${value}".`);
    } else {
      seen.set(normalized, index);
    }
  });
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

const [projectsText, typesText, categoriesText, policyText] = await Promise.all([
  fs.readFile(projectsPath, 'utf8'),
  fs.readFile(typesPath, 'utf8'),
  fs.readFile(categoriesPath, 'utf8'),
  fs.readFile(policyPath, 'utf8'),
]);

const projectsSource = sourceFile(projectsPath, projectsText);
const typesSource = sourceFile(typesPath, typesText);
const categoriesSource = sourceFile(categoriesPath, categoriesText);
const policy = JSON.parse(policyText);

const allowedLangs = new Set(exportedStringUnion(typesSource, 'Lang'));
const categoryLabels = exportedObject(categoriesSource, 'categoryLabels');
const featured = exportedArray(projectsSource, 'featured');
const liveApps = exportedArray(projectsSource, 'liveApps');
const catalog = exportedArray(projectsSource, 'catalog');
const skills = exportedArray(projectsSource, 'skills');

validateUnique('featured', featured, 'repo');
validateUnique('liveApps', liveApps, 'slug');
validateUnique('catalog', catalog, 'repo');
validateUnique('skills', skills, 'code');

for (const lang of allowedLangs) {
  if (typeof categoryLabels[lang] !== 'string' || categoryLabels[lang].trim().length === 0) {
    fail(`categoryLabels must define a non-empty label for "${lang}".`);
  }
}

featured.forEach((record, index) => {
  const repo = requireString('featured', index, record, 'repo');
  validateRepoName('featured', index, 'repo', repo);
  requireString('featured', index, record, 'name');
  const lang = requireString('featured', index, record, 'lang');
  if (!allowedLangs.has(lang)) fail(`featured[${index}].lang "${lang}" is not in Lang.`);
  requireString('featured', index, record, 'langLabel');
  requireString('featured', index, record, 'desc');
  requireStringArray('featured', index, record, 'tags');
  if (hasOwn(record, 'bento') && !['hero', 'normal'].includes(record.bento)) {
    fail(`featured[${index}].bento must be "hero" or "normal".`);
  }
});

const liveSlugs = new Set();
for (const [index, record] of liveApps.entries()) {
  const slug = requireString('liveApps', index, record, 'slug');
  validateRepoName('liveApps', index, 'slug', slug);
  liveSlugs.add(slug);
  requireString('liveApps', index, record, 'name');
  requireString('liveApps', index, record, 'desc');
  const url = validateHttpsUrl('liveApps', index, 'url', requireString('liveApps', index, record, 'url'));
  if (url && (url.hostname !== 'sysadmindoc.github.io' || !url.pathname.startsWith(`/${slug}/`))) {
    fail(`liveApps[${index}].url must point at https://sysadmindoc.github.io/${slug}/.`);
  }
  const screenshotPath = path.join(screenshotsDir, `${slug}.jpg`);
  if (!(await fileExists(screenshotPath))) {
    fail(`liveApps[${index}] is missing tracked screenshot public/screenshots/${slug}.jpg.`);
  }
}

const catalogLive = new Set();
catalog.forEach((record, index) => {
  const repo = requireString('catalog', index, record, 'repo');
  validateRepoName('catalog', index, 'repo', repo);
  requireString('catalog', index, record, 'name');
  requireString('catalog', index, record, 'desc');
  const category = requireString('catalog', index, record, 'category');
  if (!allowedLangs.has(category)) fail(`catalog[${index}].category "${category}" is not in Lang.`);
  if (!categoryLabels[category]) fail(`catalog[${index}].category "${category}" has no command-palette label.`);
  const url = validateHttpsUrl('catalog', index, 'url', requireString('catalog', index, record, 'url'));
  if (record.live === true) {
    catalogLive.add(repo);
    if (!liveSlugs.has(repo)) fail(`catalog[${index}] is marked live but ${repo} is not in liveApps.`);
    if (url && (url.hostname !== 'sysadmindoc.github.io' || !url.pathname.startsWith(`/${repo}/`))) {
      fail(`catalog[${index}].url must point at https://sysadmindoc.github.io/${repo}/ when live is true.`);
    }
  } else if (url && (url.hostname !== 'github.com' || url.pathname !== `/${owner}/${repo}`)) {
    fail(`catalog[${index}].url must point at https://github.com/${owner}/${repo} unless live is true.`);
  }
  if (hasOwn(record, 'live') && typeof record.live !== 'boolean') {
    fail(`catalog[${index}].live must be boolean when present.`);
  }
});

for (const slug of liveSlugs) {
  if (!catalogLive.has(slug)) fail(`liveApps entry ${slug} must have a matching catalog entry marked live.`);
}

skills.forEach((record, index) => {
  requireString('skills', index, record, 'code');
  requireString('skills', index, record, 'name');
  requireString('skills', index, record, 'sub');
  if (typeof record.ringTarget !== 'number' || !Number.isFinite(record.ringTarget)) {
    fail(`skills[${index}].ringTarget must be a finite number.`);
  }
  const color = requireString('skills', index, record, 'color');
  if (!/^--[a-z0-9-]+$/i.test(color)) fail(`skills[${index}].color must be a CSS custom property name.`);
});

const policyEntries = [
  ...(policy.intentionallySkippedPublicRepos ?? []),
  ...(policy.privacyReviewRequired ?? []),
];
validateUnique('catalog-policy entries', policyEntries, 'repo');
const portfolioRefs = new Set([
  ...featured.map((project) => project.repo),
  ...liveApps.map((app) => app.slug),
  ...catalog.map((entry) => entry.repo),
].filter((value) => typeof value === 'string'));

for (const [index, entry] of policyEntries.entries()) {
  const repo = requireString('catalog-policy entries', index, entry, 'repo');
  validateRepoName('catalog-policy entries', index, 'repo', repo);
  requireString('catalog-policy entries', index, entry, 'reason');
  if (portfolioRefs.has(repo)) fail(`Policy exception ${repo} must not also appear in project data.`);
}

for (const [index, entry] of (policy.privacyReviewRequired ?? []).entries()) {
  const repo = requireString('privacyReviewRequired', index, entry, 'repo');
  const screenshotPath = path.join(screenshotsDir, `${repo}.jpg`);
  if (await fileExists(screenshotPath)) {
    fail(`Privacy-review repo ${repo} must not have public screenshot artifact public/screenshots/${repo}.jpg.`);
  }
}

const routeSlugs = new Map();
for (const slug of portfolioRefs) {
  const normalized = slug.toLowerCase();
  const existing = routeSlugs.get(normalized);
  if (existing && existing !== slug) {
    fail(`Project route slug collision: "${existing}" and "${slug}" differ only by case.`);
  }
  routeSlugs.set(normalized, slug);
}

const commandPaletteProjects = new Map();
function upsertCommandPalette(slug, next) {
  const existing = commandPaletteProjects.get(slug) ?? {};
  const searchTerms = [...new Set([...(existing.searchTerms ?? []), ...(next.searchTerms ?? [])].filter(Boolean))];
  commandPaletteProjects.set(slug, { ...existing, ...next, searchTerms });
}
for (const entry of catalog) {
  upsertCommandPalette(entry.repo, {
    slug: entry.repo,
    name: entry.name,
    desc: entry.desc,
    type: 'catalog',
    url: `/projects/${entry.repo}/`,
    category: entry.category,
    categoryLabel: categoryLabels[entry.category],
    searchTerms: [entry.category, categoryLabels[entry.category]],
  });
}
for (const app of liveApps) {
  upsertCommandPalette(app.slug, {
    slug: app.slug,
    name: app.name,
    desc: app.desc,
    type: 'live',
    url: `/projects/${app.slug}/`,
    searchTerms: ['Live Apps', 'Live App', 'Browser'],
  });
}
for (const project of featured) {
  upsertCommandPalette(project.repo, {
    slug: project.repo,
    name: project.name,
    desc: project.desc,
    type: 'featured',
    url: `/projects/${project.repo}/`,
    searchTerms: project.tags,
  });
}

if (commandPaletteProjects.size !== portfolioRefs.size) {
  fail(`Command palette project count ${commandPaletteProjects.size} must match unique project route count ${portfolioRefs.size}.`);
}
for (const slug of portfolioRefs) {
  const item = commandPaletteProjects.get(slug);
  if (!item) {
    fail(`Command palette data is missing ${slug}.`);
    continue;
  }
  if (item.url !== `/projects/${slug}/`) fail(`Command palette URL for ${slug} must be /projects/${slug}/.`);
  if (typeof item.name !== 'string' || item.name.trim().length === 0) fail(`Command palette item ${slug} is missing a name.`);
  if (typeof item.desc !== 'string' || item.desc.trim().length === 0) fail(`Command palette item ${slug} is missing a description.`);
}

console.log('Project data validation');
console.log(`  featured: ${featured.length}`);
console.log(`  live apps: ${liveApps.length}`);
console.log(`  catalog: ${catalog.length}`);
console.log(`  unique project routes: ${portfolioRefs.size}`);
console.log(`  command palette projects: ${commandPaletteProjects.size}`);
console.log(`  screenshots checked: ${liveApps.length}`);

if (errors.length > 0) {
  console.error('');
  console.error('Project data validation failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Project data validation passed.');
