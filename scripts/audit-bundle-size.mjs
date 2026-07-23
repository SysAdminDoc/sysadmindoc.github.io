#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const options = { distDir: 'dist' };

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg === '--dist') {
    index += 1;
    options.distDir = process.argv[index] ?? 'dist';
  } else if (arg.startsWith('--dist=')) {
    options.distDir = arg.slice('--dist='.length);
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node scripts/audit-bundle-size.mjs [--dist <dir>]');
    process.exit(0);
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

const budgets = {
  jsFileLimitBytes: 61_440,   // 60 KB per individual JS file
  jsTotalBytes: 153_600,      // 150 KB total JS
  cssFileLimitBytes: 122_880, // 120 KB per route/component CSS file
  cssGlobalFileLimitBytes: 163_840, // 160 KB for the shared shell, tokens, and cross-route UI primitives
  cssTotalBytes: 211_968,     // 207 KB total CSS (raised 202 → 207 when the /ai/ track route added its ~2.2 KB chunk)
};

const distDir = path.resolve(root, options.distDir);
const errors = [];

function fail(message) {
  errors.push(message);
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function collectFiles(dir, ext) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const results = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(ext)) {
      const filePath = path.join(dir, entry.name);
      const stat = await fs.stat(filePath);
      results.push({ name: entry.name, filePath, bytes: stat.size });
    }
  }
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

function printTable(label, files, totalBytes, fileLimitBytes, totalLimitBytes, fileLimitFor = () => fileLimitBytes) {
  const colWidths = { name: 40, size: 12, budget: 12, status: 6 };
  const pad = (str, width) => String(str).padEnd(width);
  const header = [
    pad('File', colWidths.name),
    pad('Size', colWidths.size),
    pad('Limit', colWidths.budget),
    'Status',
  ].join('  ');
  const divider = '-'.repeat(header.length);

  console.log(`\n${label}`);
  console.log(divider);
  console.log(header);
  console.log(divider);

  for (const file of files) {
    const limitBytes = fileLimitFor(file);
    const ok = file.bytes <= limitBytes;
    const status = ok ? 'PASS' : 'FAIL';
    console.log([
      pad(file.name, colWidths.name),
      pad(formatBytes(file.bytes), colWidths.size),
      pad(formatBytes(limitBytes), colWidths.budget),
      status,
    ].join('  '));
  }

  const totalOk = totalBytes <= totalLimitBytes;
  console.log(divider);
  console.log([
    pad('TOTAL', colWidths.name),
    pad(formatBytes(totalBytes), colWidths.size),
    pad(formatBytes(totalLimitBytes), colWidths.budget),
    totalOk ? 'PASS' : 'FAIL',
  ].join('  '));
}

const jsDir = path.join(distDir, 'scripts');
const cssDir = path.join(distDir, '_assets');

const [jsFiles, cssFiles] = await Promise.all([
  collectFiles(jsDir, '.js'),
  collectFiles(cssDir, '.css'),
]);

// Validate JS files
let jsTotalBytes = 0;
for (const file of jsFiles) {
  jsTotalBytes += file.bytes;
  if (file.bytes > budgets.jsFileLimitBytes) {
    fail(
      `dist/scripts/${file.name} is ${formatBytes(file.bytes)}; per-file JS budget is ${formatBytes(budgets.jsFileLimitBytes)}.`,
    );
  }
}
if (jsTotalBytes > budgets.jsTotalBytes) {
  fail(
    `Total JS size is ${formatBytes(jsTotalBytes)}; total JS budget is ${formatBytes(budgets.jsTotalBytes)}.`,
  );
}

// Validate CSS files
let cssTotalBytes = 0;
const cssFileLimitFor = (file) => file.name.startsWith('global.')
  ? budgets.cssGlobalFileLimitBytes
  : budgets.cssFileLimitBytes;

for (const file of cssFiles) {
  cssTotalBytes += file.bytes;
  const limitBytes = cssFileLimitFor(file);
  if (file.bytes > limitBytes) {
    const label = file.name.startsWith('global.') ? 'shared global CSS budget' : 'per-file CSS budget';
    fail(
      `dist/_assets/${file.name} is ${formatBytes(file.bytes)}; ${label} is ${formatBytes(limitBytes)}.`,
    );
  }
}
if (cssTotalBytes > budgets.cssTotalBytes) {
  fail(
    `Total CSS size is ${formatBytes(cssTotalBytes)}; total CSS budget is ${formatBytes(budgets.cssTotalBytes)}.`,
  );
}

// Print summary
console.log('Bundle size audit');
console.log(`  dist: ${path.relative(root, distDir) || distDir}`);

if (jsFiles.length === 0) {
  console.log('\nJS (dist/scripts/*.js): no files found');
} else {
  printTable(
    'JS (dist/scripts/*.js)',
    jsFiles,
    jsTotalBytes,
    budgets.jsFileLimitBytes,
    budgets.jsTotalBytes,
  );
}

if (cssFiles.length === 0) {
  console.log('\nCSS (dist/_assets/*.css): no files found');
} else {
  printTable(
    'CSS (dist/_assets/*.css)',
    cssFiles,
    cssTotalBytes,
    budgets.cssFileLimitBytes,
    budgets.cssTotalBytes,
    cssFileLimitFor,
  );
}

console.log('');

if (errors.length > 0) {
  console.error('Bundle size audit failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Bundle size audit passed.');
