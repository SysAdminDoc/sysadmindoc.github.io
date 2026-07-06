import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { collectLiveSlugs } from './lib/ts-data-utils.mjs';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const manifestPath = path.join(publicDir, 'manifest.json');
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const screenshotsDir = path.join(publicDir, 'screenshots');
const installScreenshotsDir = path.join(screenshotsDir, 'install');
const screenshotThumbsDir = path.join(screenshotsDir, 'thumbs');
const astroScreenshotThumbsDir = path.join(root, 'src', 'assets', 'screenshots', 'thumbs');
const publicScriptsDir = path.join(publicDir, 'scripts');
const componentsDir = path.join(root, 'src', 'components');
const dataDir = path.join(root, 'src', 'data');
const manifestScreenshotTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

const errors = [];

function fail(message) {
  errors.push(message);
}

async function listFiles(dir, predicate = () => true) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
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

function publicPathFromManifestSrc(src, label) {
  if (typeof src !== 'string' || src.length === 0) {
    fail(`${label} must be a non-empty string`);
    return null;
  }
  if (!src.startsWith('/')) {
    fail(`${label} must be root-relative: ${src}`);
    return null;
  }
  if (src.includes('\\')) {
    fail(`${label} must use forward slashes: ${src}`);
    return null;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(src.split(/[?#]/, 1)[0]);
  } catch {
    fail(`${label} contains invalid URL encoding: ${src}`);
    return null;
  }

  const filePath = path.resolve(publicDir, decodedPath.replace(/^\/+/, ''));
  const relative = path.relative(publicDir, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`${label} resolves outside public/: ${src}`);
    return null;
  }
  return filePath;
}

async function auditManifestScreenshots() {
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (error) {
    fail(`PWA manifest must be valid JSON: ${error.message}`);
    return { count: 0, formFactors: [], files: new Set() };
  }

  if (!Array.isArray(manifest.screenshots)) {
    fail('PWA manifest must include a screenshots array for install previews');
    return { count: 0, formFactors: [], files: new Set() };
  }

  const formFactors = new Set();
  const files = new Set();
  for (const [index, screenshot] of manifest.screenshots.entries()) {
    const label = `manifest screenshots[${index}]`;
    if (!screenshot || typeof screenshot !== 'object' || Array.isArray(screenshot)) {
      fail(`${label} must be an object`);
      continue;
    }

    const filePath = publicPathFromManifestSrc(screenshot.src, `${label}.src`);
    if (typeof screenshot.label !== 'string' || screenshot.label.trim().length < 20) {
      fail(`${label}.label must provide descriptive accessible text`);
    }
    if (!['wide', 'narrow'].includes(screenshot.form_factor)) {
      fail(`${label}.form_factor must be "wide" or "narrow"`);
    } else {
      formFactors.add(screenshot.form_factor);
    }
    if (typeof screenshot.sizes !== 'string' || !/^\d+x\d+$/.test(screenshot.sizes)) {
      fail(`${label}.sizes must use WIDTHxHEIGHT syntax`);
    }

    if (!filePath) continue;
    files.add(filePath);

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) {
      fail(`${label}.src does not exist: ${path.relative(root, filePath)}`);
      continue;
    }

    const expectedType = manifestScreenshotTypes.get(path.extname(filePath).toLowerCase());
    if (!expectedType) {
      fail(`${label}.src must be a PNG, WebP, or JPEG image: ${screenshot.src}`);
    } else if (screenshot.type !== expectedType) {
      fail(`${label}.type must be ${expectedType} for ${screenshot.src}`);
    }

    let metadata;
    try {
      metadata = await sharp(filePath).metadata();
    } catch (error) {
      fail(`${label}.src could not be inspected: ${error.message}`);
      continue;
    }

    const width = metadata.width;
    const height = metadata.height;
    if (!width || !height) {
      fail(`${label}.src is missing readable image dimensions: ${screenshot.src}`);
      continue;
    }

    const actualSizes = `${width}x${height}`;
    if (screenshot.sizes !== actualSizes) {
      fail(`${label}.sizes is ${screenshot.sizes}, expected ${actualSizes}`);
    }

    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);
    if (minDimension < 320 || maxDimension > 3840) {
      fail(`${label}.src dimensions ${actualSizes} must stay within Chrome install UI bounds of 320-3840px`);
    }
    if (maxDimension / minDimension > 2.3) {
      fail(`${label}.src aspect ratio ${actualSizes} is too extreme for Chrome install UI`);
    }
    if (screenshot.form_factor === 'wide' && width <= height) {
      fail(`${label}.src must be landscape for form_factor "wide"`);
    }
    if (screenshot.form_factor === 'narrow' && height <= width) {
      fail(`${label}.src must be portrait for form_factor "narrow"`);
    }
  }

  for (const required of ['wide', 'narrow']) {
    if (!formFactors.has(required)) fail(`PWA manifest screenshots must include a ${required} form_factor entry`);
  }

  const installScreenshotFiles = await listFiles(installScreenshotsDir, (filePath) => /\.(jpe?g|png|webp)$/i.test(filePath));
  for (const filePath of installScreenshotFiles) {
    if (!files.has(filePath)) {
      fail(`Unreferenced PWA install screenshot: ${path.relative(root, filePath)}`);
    }
  }

  return { count: manifest.screenshots.length, formFactors: [...formFactors].sort(), files };
}

const liveSlugs = await collectLiveSlugs(projectsPath, fail);
const liveSlugSet = new Set(liveSlugs);
const screenshotFiles = await listFiles(screenshotsDir, (filePath) => path.dirname(filePath) === screenshotsDir && /\.jpg$/i.test(filePath));
const screenshotThumbFiles = await listFiles(screenshotThumbsDir, (filePath) => /\.jpg$/i.test(filePath));
const astroScreenshotThumbFiles = await listFiles(astroScreenshotThumbsDir, (filePath) => /\.jpg$/i.test(filePath));
const screenshotSlugs = new Set(screenshotFiles.map((filePath) => path.basename(filePath, path.extname(filePath))));
const screenshotThumbSlugs = new Set(screenshotThumbFiles.map((filePath) => path.basename(filePath, path.extname(filePath))));
const astroScreenshotThumbSlugs = new Set(astroScreenshotThumbFiles.map((filePath) => path.basename(filePath, path.extname(filePath))));

const missingScreenshots = liveSlugs.filter((slug) => !screenshotSlugs.has(slug));
const missingThumbs = liveSlugs.filter((slug) => !screenshotThumbSlugs.has(slug));
const missingAstroThumbs = liveSlugs.filter((slug) => !astroScreenshotThumbSlugs.has(slug));
const staleScreenshots = [...screenshotSlugs].filter((slug) => !liveSlugSet.has(slug)).sort((a, b) => a.localeCompare(b));
const staleThumbs = [...screenshotThumbSlugs].filter((slug) => !liveSlugSet.has(slug)).sort((a, b) => a.localeCompare(b));
const staleAstroThumbs = [...astroScreenshotThumbSlugs].filter((slug) => !liveSlugSet.has(slug)).sort((a, b) => a.localeCompare(b));

for (const slug of missingScreenshots) {
  fail(`Missing live app screenshot: public/screenshots/${slug}.jpg`);
}
for (const slug of staleScreenshots) {
  fail(`Stale screenshot is not tied to a live app: public/screenshots/${slug}.jpg`);
}
for (const slug of missingThumbs) {
  fail(`Missing live app screenshot thumbnail: public/screenshots/thumbs/${slug}.jpg`);
}
for (const slug of staleThumbs) {
  fail(`Stale screenshot thumbnail is not tied to a live app: public/screenshots/thumbs/${slug}.jpg`);
}
for (const slug of missingAstroThumbs) {
  fail(`Missing Astro asset screenshot thumbnail: src/assets/screenshots/thumbs/${slug}.jpg`);
}
for (const slug of staleAstroThumbs) {
  fail(`Stale Astro asset screenshot thumbnail is not tied to a live app: src/assets/screenshots/thumbs/${slug}.jpg`);
}

const manifestScreenshotAudit = await auditManifestScreenshots();
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
  // .d.ts files are ambient type declarations, not runtime-imported modules.
  return /\.(ts|json)$/i.test(filePath) && !/\.d\.ts$/i.test(name) && !/^_.*\.json$/i.test(name);
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
console.log(`  tracked screenshot masters: ${screenshotSlugs.size}`);
console.log(`  tracked screenshot thumbnails: ${screenshotThumbSlugs.size}`);
console.log(`  tracked Astro asset thumbnails: ${astroScreenshotThumbSlugs.size}`);
console.log(`  PWA manifest screenshots checked: ${manifestScreenshotAudit.count} (${manifestScreenshotAudit.formFactors.join(', ') || 'none'})`);
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
