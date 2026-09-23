#!/usr/bin/env node
// The built stylesheets keep what the minifier once dropped: each prefixed
// backdrop-filter beside its standard property, and scroll timelines out of the
// animation shorthand. This runs in build:ci against the build it just made;
// npm test runs before the build in deploy:preflight, so a test reading dist/
// only ever saw the one before.
//
//   --dist <path>   build to check (default dist)
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { cssOutputProblems } from './lib/css-output-check.mjs';

const root = process.cwd();
const distArg = process.argv.indexOf('--dist');
const dist = path.resolve(root, distArg === -1 ? 'dist' : process.argv[distArg + 1]);
const assets = path.join(dist, '_assets');

if (!fs.existsSync(assets) || !fs.existsSync(path.join(dist, 'index.html'))) {
  console.error(`css-output audit: ${dist} has no build to check. Run the build first.`);
  process.exit(1);
}

const problems = [];
let prefixed = 0;
function check(label, css) {
  const result = cssOutputProblems(css);
  prefixed += result.prefixed;
  for (const problem of result.problems) problems.push(`${label}: ${problem}`);
}

for (const name of fs.readdirSync(assets).filter((file) => file.endsWith('.css')).sort()) {
  check(`_assets/${name}`, fs.readFileSync(path.join(assets, name), 'utf8'));
}
// The critical CSS every page inlines goes through the same minifier.
const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
for (const [index, match] of [...home.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].entries()) {
  check(`index.html <style> ${index + 1}`, match[1]);
}
if (prefixed === 0) problems.push('no built rule carries a prefixed backdrop blur, so this check saw nothing to check');

if (problems.length > 0) {
  console.error('CSS output audit failed:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`CSS output audit passed: ${prefixed} prefixed blurs, each beside its standard property, and no timeline in an animation shorthand.`);
