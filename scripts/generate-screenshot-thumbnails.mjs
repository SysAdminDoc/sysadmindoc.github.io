import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { collectLiveSlugs } from './lib/ts-data-utils.mjs';

const root = process.cwd();
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const screenshotsDir = path.join(root, 'public', 'screenshots');
const thumbsDir = path.join(screenshotsDir, 'thumbs');

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

await fs.mkdir(thumbsDir, { recursive: true });

const slugs = await collectLiveSlugs(projectsPath, (msg) => { throw new Error(msg); });
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
