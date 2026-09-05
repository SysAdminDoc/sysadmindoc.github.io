#!/usr/bin/env node
// Structural assertion over built HTML, kept permanently rather than as a
// version-specific workaround.
//
// It exists because an Astro 6 build once emitted a stray </html> right after
// </head>, which put <body> outside <html>. Nothing failed loudly: the pages
// looked fine and Pagefind quietly mis-parsed them, so search degraded without
// a single error. Output has been structurally correct since (verified on Astro
// 7.2.4, 2026-08-20), so this runs assert/no-op on every build and costs
// milliseconds. That is cheap insurance against a silent search regression.
//
// Use --repair only as an explicit recovery tool for legacy output.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const defaultDist = join(dirname(scriptPath), '..', 'dist');

export function parseArgs(args = []) {
  const options = {
    dist: defaultDist,
    repair: false,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--repair') {
      options.repair = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dist') {
      const value = args[i + 1];
      if (!value) throw new Error('--dist requires a path');
      options.dist = resolve(value);
      i += 1;
    } else if (arg.startsWith('--dist=')) {
      options.dist = resolve(arg.slice('--dist='.length));
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return options;
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

function normalizePath(file, dist) {
  return file.replace(dist, '').replace(/\\/g, '/') || '/';
}

export function inspectHtml(html) {
  const bodyIdx = html.indexOf('<body');
  if (bodyIdx < 0) {
    return {
      hasBody: false,
      hasEarlyHtmlClose: false,
      missingFinalHtmlClose: false,
      dependentWithoutShared: false,
      dependentBeforeShared: false,
    };
  }

  const head = html.slice(0, bodyIdx);
  const sharedIdx = html.indexOf('/scripts/shared.js');
  // Scripts that read `window.SafeDOM`, which shared.js defines. Keep this list
  // in step with the SafeDOM consumers under public/scripts/ — a consumer that is
  // not listed here is not protected by this guard.
  const dependentIndexes = [...html.matchAll(/\/scripts\/cmdk(?:-loader)?\.js/g)].map((match) => match.index);

  return {
    hasBody: true,
    hasEarlyHtmlClose: /<\/html>/i.test(head),
    missingFinalHtmlClose: !/<\/html>\s*$/i.test(html),
    // Was keyed on /scripts/main.js, which was deleted in the homepage runtime
    // split — test/homepage-runtime.test.mjs asserts its absence. Both checks
    // were therefore permanently false on every built page while looking green.
    // The dependency that actually exists is cmdk.js needing window.SafeDOM from
    // shared.js, so that is what is guarded.
    dependentWithoutShared: dependentIndexes.length > 0 && sharedIdx < 0,
    dependentBeforeShared: sharedIdx >= 0 && dependentIndexes.some((index) => index < sharedIdx),
  };
}

export function repairHtml(html) {
  const bodyIdx = html.indexOf('<body');
  if (bodyIdx < 0) return html;
  const head = html.slice(0, bodyIdx).replace(/<\/html>\s*/i, '');
  let rest = html.slice(bodyIdx);
  if (!/<\/html>\s*$/i.test(rest)) rest = rest.replace(/\s*$/, '') + '</html>';
  return head + rest;
}

export function auditDist(dist = defaultDist, options = {}) {
  if (!existsSync(dist)) {
    throw new Error(`dist not found: ${dist}. Run "astro build" first.`);
  }

  const repair = Boolean(options.repair);
  const orderViolations = [];
  const structuralViolations = [];
  let fixed = 0;
  let scanned = 0;

  for (const file of walk(dist)) {
    scanned += 1;
    const html = readFileSync(file, 'utf8');
    const inspection = inspectHtml(html);
    if (!inspection.hasBody) continue;

    const relative = normalizePath(file, dist);
    if (inspection.dependentWithoutShared || inspection.dependentBeforeShared) {
      orderViolations.push(relative);
    }

    if (inspection.hasEarlyHtmlClose || inspection.missingFinalHtmlClose) {
      structuralViolations.push(relative);
      if (repair) {
        writeFileSync(file, repairHtml(html));
        fixed += 1;
      }
    }
  }

  return {
    scanned,
    fixed,
    orderViolations,
    structuralViolations,
  };
}

function printHelp() {
  console.log(`Usage: node scripts/fix-html-structure.mjs [--dist path] [--repair]

Default mode verifies built HTML structure and does not mutate dist/.
--repair removes the legacy early </html> quirk and appends a final close tag.`);
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`fix-html-structure: ${error.message}`);
    process.exit(2);
  }

  if (options.help) {
    printHelp();
    return;
  }

  let result;
  try {
    result = auditDist(options.dist, { repair: options.repair });
  } catch (error) {
    console.error(`fix-html-structure: ${error.message}`);
    process.exit(1);
  }

  if (result.orderViolations.length) {
    console.error('fix-html-structure: homepage scripts load before their shared/core dependencies in:');
    for (const violation of result.orderViolations) console.error(`  - ${violation}`);
    process.exit(1);
  }

  if (result.structuralViolations.length && !options.repair) {
    console.error('fix-html-structure: invalid HTML closing order detected in:');
    for (const violation of result.structuralViolations) console.error(`  - ${violation}`);
    console.error('fix-html-structure: build output was not modified; run with --repair only for legacy-output recovery.');
    process.exit(1);
  }

  const mode = options.repair ? 'repair' : 'verify';
  console.log(
    `fix-html-structure: ${mode} OK; scanned ${result.scanned} file(s); repaired ${result.fixed} file(s); script order OK`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main();
}
