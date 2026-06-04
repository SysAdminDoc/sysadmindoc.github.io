#!/usr/bin/env node
// Static accessibility audit over the built site (dist/**/*.html).
//
// This is a dependency-free, advisory subset of WCAG checks that are reliably
// detectable from static HTML (no browser required): document language, image
// text alternatives, page titles, tab-order hazards, focusable-but-hidden
// elements, and duplicate ids. It is intentionally conservative to keep false
// positives low. A full axe-core / Playwright pass (interactive states, computed
// contrast, ARIA semantics) is the planned next upgrade — see TODO.md.
//
// Usage:
//   node scripts/audit-a11y.mjs            # advisory, always exits 0
//   node scripts/audit-a11y.mjs --strict   # blocking subset, exits 1 if any violation is found
//
// `npm run a11y:audit` intentionally runs with --strict so CI/deploy fail on
// this conservative static subset. Use `npm run a11y:audit:advisory` for local
// inventory-only runs while expanding the rule set.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const strict = process.argv.includes('--strict');

if (!existsSync(distDir)) {
  console.error('a11y audit: dist/ not found. Run "npm run build" first.');
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

// Each rule returns an array of human-readable issue strings for one document.
const rules = {
  'html-has-lang': (html) =>
    /<html[^>]*\blang=/.test(html) ? [] : ['<html> is missing a lang attribute'],

  'document-title': (html) =>
    /<title[^>]*>[^<]*\S[^<]*<\/title>/.test(html) ? [] : ['document has no non-empty <title>'],

  'img-has-alt': (html) => {
    const issues = [];
    const imgs = html.match(/<img\b[^>]*>/gi) || [];
    for (const tag of imgs) {
      if (!/\balt=/.test(tag)) issues.push(`<img> without alt: ${squash(tag)}`);
    }
    return issues;
  },

  'no-positive-tabindex': (html) => {
    const issues = [];
    const matches = html.match(/tabindex=["']?(\d+)/gi) || [];
    for (const m of matches) {
      const n = Number(m.replace(/[^\d]/g, ''));
      if (n > 0) issues.push(`positive tabindex (${n}) harms tab order`);
    }
    return issues;
  },

  'no-aria-hidden-focusable': (html) => {
    // Elements that are both aria-hidden and natively focusable confuse AT.
    const issues = [];
    const re = /<(a|button|input|select|textarea)\b[^>]*aria-hidden=["']?true[^>]*>/gi;
    let m;
    while ((m = re.exec(html))) {
      if (!/\btabindex=["']?-1/.test(m[0])) {
        issues.push(`focusable <${m[1]}> with aria-hidden="true" and no tabindex="-1"`);
      }
    }
    return issues;
  },

  'no-duplicate-id': (html) => {
    const ids = new Map();
    const re = /\sid=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html))) ids.set(m[1], (ids.get(m[1]) || 0) + 1);
    return [...ids.entries()]
      .filter(([, n]) => n > 1)
      .map(([id, n]) => `duplicate id "${id}" (${n}×)`);
  },
};

function squash(s) {
  return s.replace(/\s+/g, ' ').slice(0, 120);
}

const files = walk(distDir);
const totals = Object.fromEntries(Object.keys(rules).map((k) => [k, 0]));
const examples = Object.fromEntries(Object.keys(rules).map((k) => [k, []]));
let totalIssues = 0;

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(distDir, file).replace(/\\/g, '/');
  for (const [name, run] of Object.entries(rules)) {
    const issues = run(html);
    if (issues.length) {
      totals[name] += issues.length;
      totalIssues += issues.length;
      if (examples[name].length < 3) examples[name].push(`${rel}: ${issues[0]}`);
    }
  }
}

console.log('Static accessibility audit');
console.log(`  pages scanned: ${files.length}`);
for (const name of Object.keys(rules)) {
  const status = totals[name] === 0 ? 'ok' : `${totals[name]} issue(s)`;
  console.log(`  ${name}: ${status}`);
  for (const ex of examples[name]) console.log(`      - ${ex}`);
}

if (totalIssues === 0) {
  console.log('Static accessibility audit passed.');
  process.exit(0);
}
console.log(`Static accessibility audit found ${totalIssues} issue(s)${strict ? '' : ' (advisory)'}.`);
process.exit(strict ? 1 : 0);
