#!/usr/bin/env node
// Remove dist/ before a build.
//
// `astro build` writes into an existing dist/ without removing what a previous
// build left there, and scripts/deploy-vps.mjs tars the whole directory
// (`tar -czf ... -C distDir .`), so any leftover file ships. Observed 2026-09-05:
// a `dist/.prerender/chunks/server_*.mjs` from an interrupted build survived into
// a later dist/ and failed the CSP audit on a createContextualFragment sink. That
// one was caught; a stale file that happens to contain no sink would have
// deployed silently, and a stale HTML page would have been served indefinitely.
//
// The image cache is not in here — Astro keeps it under node_modules/.astro — so
// removing dist/ costs nothing but the render.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const distDir = path.join(root, 'dist');

// Refuse to delete anything unless the cwd really is this repo.
//
// The previous guard compared path.dirname(distDir) against root and
// path.basename(distDir) against 'dist', but distDir is built as
// path.join(root, 'dist'), so both comparisons were tautologically false and the
// guard could never fire — including in the one case it existed for, a wrong
// cwd. What actually needs checking is root, not the path derived from it.
function assertRepoRoot() {
  const manifestPath = path.join(root, 'package.json');
  let name;
  try {
    ({ name } = JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  } catch {
    console.error(`clean-dist: refusing to remove ${distDir}; no readable package.json at ${manifestPath}.`);
    process.exit(1);
  }
  if (name !== 'sysadmindoc-portfolio') {
    console.error(`clean-dist: refusing to remove ${distDir}; ${manifestPath} declares "${name}", not this repo.`);
    process.exit(1);
  }
  if (!fs.existsSync(path.join(root, '.git'))) {
    console.error(`clean-dist: refusing to remove ${distDir}; ${root} is not a git working tree.`);
    process.exit(1);
  }
}

assertRepoRoot();

if (!fs.existsSync(distDir)) {
  console.log('clean-dist: dist/ does not exist; nothing to remove.');
  process.exit(0);
}

const before = fs.readdirSync(distDir).length;
fs.rmSync(distDir, { recursive: true, force: true });
if (fs.existsSync(distDir)) {
  console.error('clean-dist: dist/ still exists after removal.');
  process.exit(1);
}
console.log(`clean-dist: removed dist/ (${before} top-level entr${before === 1 ? 'y' : 'ies'}).`);
