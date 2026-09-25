#!/usr/bin/env node
// The built stylesheets keep what the minifier once dropped: each prefixed
// backdrop-filter beside its standard property, and scroll timelines out of the
// animation shorthand. And none keeps a light-dark(), which the older target
// browsers can't read. This runs in build:ci against the build it just made;
// npm test runs before the build in deploy:preflight, so a test reading dist/
// only ever saw the one before.
//
//   --dist <path>   build to check (default dist)
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { cssOutputProblems, embeddedCss, scriptCarriesLightDark, svgUnreadable } from './lib/css-output-check.mjs';

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

/** Every file under `dir` whose name ends with `suffix`, as paths relative to dist. */
function builtFiles(dir, suffix) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...builtFiles(full, suffix));
    else if (entry.name.endsWith(suffix)) found.push(full);
  }
  return found;
}
const relative = (file) => path.relative(dist, file).replaceAll('\\', '/');

// Every stylesheet the build ships, not just the bundled ones: the offline
// page's and Pagefind's too (eighth drain review).
for (const file of builtFiles(dist, '.css').sort()) {
  check(relative(file), fs.readFileSync(file, 'utf8'));
}
// The <style> blocks, style attributes, data: stylesheet links and inline
// scripts of every page and SVG, read from the tree parse5 builds, which
// tokenizes as a browser does. The critical CSS each page inlines goes
// through the same minifier, and a page or an image can carry CSS of its own
// (twelfth, thirteenth and fifteenth drain reviews).
for (const file of [...builtFiles(dist, '.html'), ...builtFiles(dist, '.svg')].sort()) {
  const text = fs.readFileSync(file, 'utf8');
  const unreadable = file.endsWith('.svg') ? svgUnreadable(text) : null;
  if (unreadable) problems.push(`${relative(file)}: ${unreadable}`);
  for (const piece of embeddedCss(text, { svg: file.endsWith('.svg') })) {
    if (!piece.script) check(`${relative(file)} ${piece.label}`, piece.css);
    else if (scriptCarriesLightDark(piece.css)) problems.push(`${relative(file)} ${piece.label}: a script carries a light-dark() it could put on the page`);
  }
}
// CSS a script puts on the page never passes through the minifier, so a
// light-dark() written in one, however its string escapes spell it, would
// reach browsers as is.
for (const file of builtFiles(dist, '.js').sort()) {
  if (scriptCarriesLightDark(fs.readFileSync(file, 'utf8'))) problems.push(`${relative(file)}: a script carries a light-dark() it could put on the page`);
}
if (prefixed === 0) problems.push('no built rule carries a prefixed backdrop blur, so this check saw nothing to check');

if (problems.length > 0) {
  console.error('CSS output audit failed:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`CSS output audit passed: ${prefixed} prefixed blurs, each beside its standard property, no timeline in an animation shorthand, and no light-dark() left, across every built stylesheet, the styles in every page and SVG, and every script.`);
