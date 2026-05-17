import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
import sharp from 'sharp';

const root = process.cwd();
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const screenshotsDir = path.join(root, 'public', 'screenshots');
const thumbsDir = path.join(screenshotsDir, 'thumbs');

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
        throw new Error('Expected liveApps to be an array literal in src/data/projects.ts.');
      }
      for (const element of declaration.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        const slug = stringProperty(element, 'slug');
        if (slug) slugs.push(slug);
      }
    }
  }

  if (slugs.length === 0) throw new Error('No live app slugs found in src/data/projects.ts.');
  return slugs;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

await fs.mkdir(thumbsDir, { recursive: true });

const slugs = await collectLiveSlugs();
let fullBytes = 0;
let thumbBytes = 0;
let generated = 0;

for (const slug of slugs) {
  const source = path.join(screenshotsDir, `${slug}.jpg`);
  const target = path.join(thumbsDir, `${slug}.jpg`);
  const sourceStat = await fs.stat(source).catch(() => null);
  if (!sourceStat) {
    console.error(`Missing source screenshot: public/screenshots/${slug}.jpg`);
    process.exitCode = 1;
    continue;
  }

  await sharp(source)
    .resize({ width: 640, height: 400, fit: 'cover' })
    .jpeg({ quality: 68, mozjpeg: true })
    .toFile(target);

  const targetStat = await fs.stat(target);
  fullBytes += sourceStat.size;
  thumbBytes += targetStat.size;
  generated += 1;
}

if (process.exitCode) process.exit(process.exitCode);

console.log('Screenshot thumbnails generated');
console.log(`  thumbnails: ${generated}`);
console.log(`  full screenshot total: ${formatBytes(fullBytes)}`);
console.log(`  thumbnail total: ${formatBytes(thumbBytes)}`);
console.log(`  thumbnail ratio: ${((thumbBytes / fullBytes) * 100).toFixed(1)}%`);
