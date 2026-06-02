#!/usr/bin/env node
// Repair a structural quirk in the Astro 6 build output: the single </html>
// closing tag is emitted right after </head> (so <body> ends up outside <html>
// and there is no closing </html> at the end). Browsers tolerate it, but it is
// invalid and breaks the Pagefind HTML parser (0 pages indexed).
//
// This walks dist/**/*.html and, for any file where </html> appears before
// <body>, removes that stray tag and re-appends </html> at the end.
//
// TODO: root-cause the Astro 6 renderer placement and drop this step if fixed.
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(dist)) {
  console.error('fix-html-structure: dist/ not found. Run "astro build" first.');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

let fixed = 0;
const orderViolations = [];
for (const file of walk(dist)) {
  const html = readFileSync(file, 'utf8');
  const bodyIdx = html.indexOf('<body');
  if (bodyIdx < 0) continue;

  // Guard: main.js reads globals defined in shared.js at top level, so shared.js
  // MUST load first. If main.js ever precedes shared.js the whole homepage
  // interactive layer throws a ReferenceError (silent — masked by SSR fallbacks).
  const mainIdx = html.indexOf('/scripts/main.js');
  const sharedIdx = html.indexOf('/scripts/shared.js');
  if (mainIdx >= 0 && (sharedIdx < 0 || mainIdx < sharedIdx)) {
    orderViolations.push(file.replace(dist, '').replace(/\\/g, '/'));
  }

  const head = html.slice(0, bodyIdx);
  if (!head.includes('</html>')) continue;
  const newHead = head.replace(/<\/html>\s*/i, '');
  let rest = html.slice(bodyIdx);
  if (!/<\/html>\s*$/i.test(rest)) rest = rest.replace(/\s*$/, '') + '</html>';
  writeFileSync(file, newHead + rest);
  fixed += 1;
}

if (orderViolations.length) {
  console.error('fix-html-structure: main.js loads before shared.js (would ReferenceError) in:');
  for (const v of orderViolations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log(`fix-html-structure: repaired ${fixed} file(s); script order OK`);
