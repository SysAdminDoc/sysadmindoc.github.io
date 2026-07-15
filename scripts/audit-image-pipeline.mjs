import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { collectLiveSlugs, exportedArray, sourceFile } from './lib/ts-data-utils.mjs';

const root = process.cwd();
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const interiorOgPagesPath = path.join(root, 'src', 'data', 'interior-og-pages.ts');
const screenshotsDir = path.join(root, 'public', 'screenshots');
const thumbsDir = path.join(screenshotsDir, 'thumbs');
const astroThumbsDir = path.join(root, 'src', 'assets', 'screenshots', 'thumbs');
const ogEndpointPath = path.join(root, 'src', 'pages', 'og', '[slug].png.ts');
const baseLayoutPath = path.join(root, 'src', 'layouts', 'Base.astro');
const maxFullBytes = 350_000;
const maxThumbBytes = 80_000;
const requiredInteriorOgSlugs = ['uses', 'resume', 'search', 'timeline', 'archive', 'now', 'healthcare-it', 'releases'];
const errors = [];

function fail(message) {
  errors.push(message);
}

async function listJpegs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  return entries
    .filter((entry) => entry.isFile() && /\.jpe?g$/i.test(entry.name))
    .map((entry) => path.join(dir, entry.name));
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function fileSlug(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

async function inspectImage(filePath) {
  const [stat, meta] = await Promise.all([fs.stat(filePath), sharp(filePath).metadata()]);
  return { bytes: stat.size, width: meta.width ?? 0, height: meta.height ?? 0 };
}

const liveSlugs = await collectLiveSlugs(projectsPath, fail);
const liveSlugSet = new Set(liveSlugs);
const fullFiles = await listJpegs(screenshotsDir);
const thumbFiles = await listJpegs(thumbsDir);
const astroThumbFiles = await listJpegs(astroThumbsDir);
const fullSlugSet = new Set(fullFiles.map(fileSlug));
const thumbSlugSet = new Set(thumbFiles.map(fileSlug));
const astroThumbSlugSet = new Set(astroThumbFiles.map(fileSlug));

for (const slug of liveSlugs) {
  if (!fullSlugSet.has(slug)) fail(`Missing full screenshot: public/screenshots/${slug}.jpg`);
  if (!thumbSlugSet.has(slug)) fail(`Missing thumbnail screenshot: public/screenshots/thumbs/${slug}.jpg`);
  if (!astroThumbSlugSet.has(slug)) fail(`Missing Astro asset thumbnail: src/assets/screenshots/thumbs/${slug}.jpg`);
}

for (const slug of [...fullSlugSet].filter((slug) => !liveSlugSet.has(slug)).sort()) {
  fail(`Stale full screenshot is not tied to a live app: public/screenshots/${slug}.jpg`);
}
for (const slug of [...thumbSlugSet].filter((slug) => !liveSlugSet.has(slug)).sort()) {
  fail(`Stale thumbnail is not tied to a live app: public/screenshots/thumbs/${slug}.jpg`);
}
for (const slug of [...astroThumbSlugSet].filter((slug) => !liveSlugSet.has(slug)).sort()) {
  fail(`Stale Astro asset thumbnail is not tied to a live app: src/assets/screenshots/thumbs/${slug}.jpg`);
}

let fullTotal = 0;
let thumbTotal = 0;
let largestFull = { slug: '', bytes: 0 };
let largestThumb = { slug: '', bytes: 0 };

for (const slug of liveSlugs) {
  const fullPath = path.join(screenshotsDir, `${slug}.jpg`);
  const thumbPath = path.join(thumbsDir, `${slug}.jpg`);
  const astroThumbPath = path.join(astroThumbsDir, `${slug}.jpg`);

  if (fullSlugSet.has(slug)) {
    const full = await inspectImage(fullPath);
    fullTotal += full.bytes;
    if (full.bytes > largestFull.bytes) largestFull = { slug, bytes: full.bytes };
    if (full.bytes > maxFullBytes) fail(`Full screenshot exceeds ${formatBytes(maxFullBytes)}: public/screenshots/${slug}.jpg (${formatBytes(full.bytes)})`);
    if (full.width < 1200 || full.height < 750) fail(`Full screenshot is too small: public/screenshots/${slug}.jpg (${full.width}x${full.height})`);
    const ratio = full.width / full.height;
    if (ratio < 1.5 || ratio > 1.7) fail(`Full screenshot aspect ratio is not close to the expected card/detail frame: public/screenshots/${slug}.jpg (${full.width}x${full.height})`);
  }

  if (thumbSlugSet.has(slug)) {
    const thumb = await inspectImage(thumbPath);
    thumbTotal += thumb.bytes;
    if (thumb.bytes > largestThumb.bytes) largestThumb = { slug, bytes: thumb.bytes };
    if (thumb.bytes > maxThumbBytes) fail(`Thumbnail exceeds ${formatBytes(maxThumbBytes)}: public/screenshots/thumbs/${slug}.jpg (${formatBytes(thumb.bytes)})`);
    if (thumb.width !== 640 || thumb.height !== 400) fail(`Thumbnail must be 640x400: public/screenshots/thumbs/${slug}.jpg (${thumb.width}x${thumb.height})`);
  }

  if (astroThumbSlugSet.has(slug)) {
    const astroThumb = await inspectImage(astroThumbPath);
    if (astroThumb.bytes > maxThumbBytes) fail(`Astro asset thumbnail exceeds ${formatBytes(maxThumbBytes)}: src/assets/screenshots/thumbs/${slug}.jpg (${formatBytes(astroThumb.bytes)})`);
    if (astroThumb.width !== 640 || astroThumb.height !== 400) fail(`Astro asset thumbnail must be 640x400: src/assets/screenshots/thumbs/${slug}.jpg (${astroThumb.width}x${astroThumb.height})`);
    if (thumbSlugSet.has(slug)) {
      const [publicThumb, assetThumb] = await Promise.all([fs.readFile(thumbPath), fs.readFile(astroThumbPath)]);
      if (!publicThumb.equals(assetThumb)) fail(`Astro asset thumbnail differs from public thumbnail: src/assets/screenshots/thumbs/${slug}.jpg`);
    }
  }
}

const ogSource = await fs.readFile(ogEndpointPath, 'utf8');
const baseSource = await fs.readFile(baseLayoutPath, 'utf8');
const interiorOgSourceText = await fs.readFile(interiorOgPagesPath, 'utf8');
const interiorOgPages = exportedArray(sourceFile(interiorOgPagesPath, interiorOgSourceText), 'interiorOgPages');
const interiorOgSlugSet = new Set(interiorOgPages.map((page) => page.slug));

for (const slug of requiredInteriorOgSlugs) {
  if (!interiorOgSlugSet.has(slug)) fail(`Missing required interior OG page slug: ${slug}`);
}

for (const page of interiorOgPages) {
  if (!page.slug || !page.route || !page.title || !page.description || !page.label || !page.accent || !page.command || !page.ogImage || !page.ogImageAlt) {
    fail(`Interior OG page is missing required metadata: ${page.slug || '(missing slug)'}`);
    continue;
  }
  if (page.ogImage !== `/og/${page.slug}.png`) fail(`Interior OG image path must match slug for ${page.slug}: ${page.ogImage}`);
  const routePath = path.join(root, 'src', 'pages', `${String(page.route).replace(/^\/|\/$/g, '')}.astro`);
  const routeSource = await fs.readFile(routePath, 'utf8').catch(() => null);
  if (!routeSource) {
    fail(`Interior OG route file is missing for ${page.route}`);
    continue;
  }
  if (!routeSource.includes('interiorOgPageBySlug')) fail(`Interior route does not import shared OG metadata: ${page.route}`);
  if (!routeSource.includes('ogImage={pageOg.ogImage}') || !routeSource.includes('ogImageAlt={pageOg.ogImageAlt}')) {
    fail(`Interior route does not pass generated OG metadata into Base: ${page.route}`);
  }
}

if (!/satori/i.test(ogSource) || !/new\s+Resvg/.test(ogSource)) {
  fail('OG endpoint must continue using Satori + Resvg for static PNG generation.');
}
if (!/interiorOgPages/.test(ogSource) || !/getInteriorOgPage/.test(ogSource)) {
  fail('OG endpoint must include interior page social-card paths.');
}
if (!/width:\s*1200/.test(ogSource) || !/height:\s*630/.test(ogSource)) {
  fail('OG endpoint must keep 1200x630 social-card dimensions.');
}
if (!/['"]Content-Type['"]\s*:\s*['"]image\/png['"]/.test(ogSource) && !/imageEndpointHeaders\(['"]image\/png['"]\)/.test(ogSource)) {
  fail('OG endpoint must return Content-Type: image/png.');
}
if (!/property="og:image:type"\s+content="image\/png"/.test(baseSource)) {
  fail('Base layout must advertise generated social cards as image/png.');
}
if (!/property="og:image:alt"/.test(baseSource) || !/name="twitter:image:alt"/.test(baseSource)) {
  fail('Base layout must emit alt text for Open Graph and Twitter card images.');
}

console.log('Image pipeline audit');
console.log(`  live apps checked: ${liveSlugs.length}`);
console.log(`  full screenshot total: ${formatBytes(fullTotal)}`);
console.log(`  thumbnail total: ${formatBytes(thumbTotal)}`);
console.log(`  Astro asset thumbnails: ${astroThumbSlugSet.size}`);
console.log(`  largest full: ${largestFull.slug} (${formatBytes(largestFull.bytes)})`);
console.log(`  largest thumbnail: ${largestThumb.slug} (${formatBytes(largestThumb.bytes)})`);
console.log(`  interior OG pages: ${interiorOgPages.length}`);
console.log('  OG endpoint: 1200x630 PNG via Satori + Resvg');
console.log('  social metadata: image/png with alt text');

if (errors.length > 0) {
  console.error('');
  console.error('Image pipeline audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Image pipeline audit passed.');
