#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const root = process.cwd();
const sourcePath = path.join(root, 'public', 'favicon.svg');
const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

const source = await fs.readFile(sourcePath);

for (const target of targets) {
  const outputPath = path.join(root, 'public', target.file);
  await sharp(source, { density: 384 })
    .resize(target.size, target.size, { fit: 'fill' })
    .png({ compressionLevel: 9, palette: true })
    .toFile(outputPath);
  const metadata = await sharp(outputPath).metadata();
  if (metadata.width !== target.size || metadata.height !== target.size) {
    throw new Error(`${target.file} rendered at ${metadata.width}x${metadata.height}; expected ${target.size}x${target.size}.`);
  }
  console.log(`brand-assets: ${target.file} (${target.size}x${target.size})`);
}
