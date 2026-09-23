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

// favicon.ico: browsers, feed readers and crawlers ask for it whatever the
// page links, and it was a steady 404. An ICO may carry PNG images, so the same
// renders are packed into one: a 6-byte header, a 16-byte entry per image,
// then the PNGs.
const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(
  icoSizes.map((size) =>
    sharp(source, { density: 384 }).resize(size, size, { fit: 'fill' }).png({ compressionLevel: 9 }).toBuffer(),
  ),
);
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(icoImages.length, 4);
let icoOffset = icoHeader.length + 16 * icoImages.length;
const icoEntries = icoImages.map((image, index) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(icoSizes[index], 0);
  entry.writeUInt8(icoSizes[index], 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(image.length, 8);
  entry.writeUInt32LE(icoOffset, 12);
  icoOffset += image.length;
  return entry;
});
await fs.writeFile(path.join(root, 'public', 'favicon.ico'), Buffer.concat([icoHeader, ...icoEntries, ...icoImages]));
console.log(`brand-assets: favicon.ico (${icoSizes.join(', ')} px)`);
