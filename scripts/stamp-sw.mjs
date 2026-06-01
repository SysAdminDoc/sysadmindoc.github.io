#!/usr/bin/env node
// Replace the __BUILD_VERSION__ placeholder in the built service worker with the
// package version so the cache name changes on every release. Runs after `astro
// build` as part of `npm run build`.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const swPath = join(root, 'dist', 'sw.js');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

let source;
try {
  source = readFileSync(swPath, 'utf8');
} catch {
  console.error(`stamp-sw: ${swPath} not found. Run "astro build" first.`);
  process.exit(1);
}

if (!source.includes('__BUILD_VERSION__')) {
  console.warn('stamp-sw: no __BUILD_VERSION__ placeholder found; nothing to stamp.');
  process.exit(0);
}

writeFileSync(swPath, source.replaceAll('__BUILD_VERSION__', version));
console.log(`stamp-sw: dist/sw.js stamped with v${version}`);
