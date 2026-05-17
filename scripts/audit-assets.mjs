import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root = process.cwd();
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const screenshotsDir = path.join(root, 'public', 'screenshots');
const publicScriptsDir = path.join(root, 'public', 'scripts');
const componentsDir = path.join(root, 'src', 'components');
const dataDir = path.join(root, 'src', 'data');

const errors = [];

function fail(message) {
  errors.push(message);
}

function propertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function stringProperty(objectLiteral, key) {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (propertyName(property.name) !== key) continue;
    const value = property.initializer;
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  }
  return null;
}

async function collectLiveSlugs() {
  const sourceText = await fs.readFile(projectsPath, 'utf8');
  const source = ts.createSourceFile(projectsPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const slugs = [];

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'liveApps') continue;
      if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
        fail('Expected liveApps to be an array literal in src/data/projects.ts.');
        return slugs;
      }
      for (const element of declaration.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        const slug = stringProperty(element, 'slug');
        if (slug) slugs.push(slug);
      }
    }
  }

  if (slugs.length === 0) fail('No live app slugs found in src/data/projects.ts.');
  return slugs;
}

async function listFiles(dir, predicate = () => true) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(filePath, predicate)));
    } else if (entry.isFile() && predicate(filePath)) {
      files.push(filePath);
    }
  }
  return files;
}

async function readTextFiles() {
  const files = [
    ...(await listFiles(path.join(root, 'src'), (filePath) => {
      if (/src[\\/]data[\\/]_.*\.json$/i.test(filePath)) return false;
      return /\.(astro|css|js|json|mjs|ts)$/i.test(filePath);
    })),
    ...(await listFiles(path.join(root, 'public'), (filePath) => /\.(html|js|json|svg|txt|webmanifest)$/i.test(filePath))),
    ...(await listFiles(path.join(root, 'scripts'), (filePath) => /\.(js|mjs)$/i.test(filePath))),
  ];

  const texts = new Map();
  for (const filePath of files) {
    texts.set(filePath, await fs.readFile(filePath, 'utf8'));
  }
  return texts;
}

function referencedSomewhere(texts, targetFile, regexes) {
  for (const [filePath, text] of texts.entries()) {
    if (filePath === targetFile) continue;
    if (regexes.some((regex) => regex.test(text))) return true;
  }
  return false;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function moduleImportRegex(moduleBase) {
  const escaped = escapeRegex(moduleBase);
  return new RegExp(`(?:from\\s+|import\\s*\\()["'][^"']*${escaped}(?:\\.[a-z]+)?["']`, 'm');
}

const liveSlugs = await collectLiveSlugs();
const liveSlugSet = new Set(liveSlugs);
const screenshotFiles = await listFiles(screenshotsDir, (filePath) => /\.jpg$/i.test(filePath));
const screenshotSlugs = new Set(screenshotFiles.map((filePath) => path.basename(filePath, path.extname(filePath))));

const missingScreenshots = liveSlugs.filter((slug) => !screenshotSlugs.has(slug));
const staleScreenshots = [...screenshotSlugs].filter((slug) => !liveSlugSet.has(slug)).sort((a, b) => a.localeCompare(b));

for (const slug of missingScreenshots) {
  fail(`Missing live app screenshot: public/screenshots/${slug}.jpg`);
}
for (const slug of staleScreenshots) {
  fail(`Stale screenshot is not tied to a live app: public/screenshots/${slug}.jpg`);
}

const sourceTexts = await readTextFiles();

const publicScripts = await listFiles(publicScriptsDir, (filePath) => /\.js$/i.test(filePath));
for (const filePath of publicScripts) {
  const fileName = path.basename(filePath);
  const escaped = escapeRegex(fileName);
  const regexes = [
    new RegExp(`["']/scripts/${escaped}["']`),
    new RegExp(`["']\\.\\/scripts/${escaped}["']`),
  ];
  if (!referencedSomewhere(sourceTexts, filePath, regexes)) {
    fail(`Unreferenced public script: public/scripts/${fileName}`);
  }
}

const components = await listFiles(componentsDir, (filePath) => /\.astro$/i.test(filePath));
for (const filePath of components) {
  const fileName = path.basename(filePath);
  const escaped = escapeRegex(fileName);
  const regexes = [
    new RegExp(`from\\s+["'][^"']*components/${escaped}["']`),
    new RegExp(`import\\s*\\(["'][^"']*components/${escaped}["']\\)`),
  ];
  if (!referencedSomewhere(sourceTexts, filePath, regexes)) {
    fail(`Unreferenced component: src/components/${fileName}`);
  }
}

const dataModules = await listFiles(dataDir, (filePath) => {
  const name = path.basename(filePath);
  return /\.(ts|json)$/i.test(filePath) && !/^_.*\.json$/i.test(name);
});
for (const filePath of dataModules) {
  const ext = path.extname(filePath);
  const moduleBase = path.basename(filePath, ext);
  if (moduleBase === 'catalog-policy') {
    const regexes = [new RegExp(`["']src/data/${escapeRegex(path.basename(filePath))}["']`), new RegExp(`["']catalog-policy\\.json["']`)];
    if (!referencedSomewhere(sourceTexts, filePath, regexes)) {
      fail(`Unreferenced data policy file: src/data/${path.basename(filePath)}`);
    }
    continue;
  }
  if (!referencedSomewhere(sourceTexts, filePath, [moduleImportRegex(moduleBase)])) {
    fail(`Unreferenced data module: src/data/${path.basename(filePath)}`);
  }
}

console.log('Asset and reference audit');
console.log(`  live app screenshots expected: ${liveSlugs.length}`);
console.log(`  tracked screenshots: ${screenshotSlugs.size}`);
console.log(`  public scripts checked: ${publicScripts.length}`);
console.log(`  components checked: ${components.length}`);
console.log(`  data modules checked: ${dataModules.length}`);

if (errors.length > 0) {
  console.error('');
  console.error('Asset and reference audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Asset and reference audit passed.');
