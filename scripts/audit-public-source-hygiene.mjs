import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const scriptPath = fileURLToPath(import.meta.url);
const selfTest = process.argv.includes('--self-test');

const publicMarkdownAllowlist = new Set(['README.md']);
const localOnlyMarkdownNames = [
  'AUTONOMOUS-LOOP-STATE.md',
  'CHANGELOG.md',
  'COMPLETED.md',
  'HANDOFF.md',
  'PROJECT_CONTEXT.md',
  'RESEARCH.md',
  'ROADMAP.md',
  'SESSION_SUMMARY.md',
  'TODO.md',
];
const scannedDirectories = ['src', 'public', 'scripts'];
const scannedRootFiles = ['astro.config.mjs', 'package.json'];
const scannedExtensions = new Set(['.astro', '.css', '.html', '.js', '.json', '.mjs', '.ts', '.txt', '.webmanifest', '.xml']);

function normalizePath(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listFiles(dir, predicate = () => true) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(filePath, predicate)));
    } else if (entry.isFile() && predicate(filePath)) {
      files.push(filePath);
    }
  }
  return files;
}

async function rootMarkdownNames() {
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => entry.name)
    .filter((name) => !publicMarkdownAllowlist.has(name));
}

async function scannedSourceFiles() {
  const files = [];
  for (const dir of scannedDirectories) {
    files.push(...(await listFiles(path.join(root, dir), (filePath) => {
      if (path.resolve(filePath) === path.resolve(scriptPath)) return false;
      if (/src[\\/]data[\\/]_.*\.json$/i.test(filePath)) return false;
      return scannedExtensions.has(path.extname(filePath).toLowerCase());
    })));
  }
  for (const fileName of scannedRootFiles) {
    const filePath = path.join(root, fileName);
    if (await fs.stat(filePath).then((stat) => stat.isFile(), () => false)) files.push(filePath);
  }
  return files;
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

export function auditPublicSourceHygiene(sourceTexts, forbiddenNames) {
  const findings = [];
  const patterns = forbiddenNames.map((name) => ({
    name,
    regex: new RegExp(`(?<![A-Za-z0-9._/-])${escapeRegex(name)}(?![A-Za-z0-9._/-])`, 'gi'),
  }));

  for (const [relativePath, text] of sourceTexts.entries()) {
    for (const { name, regex } of patterns) {
      for (const match of text.matchAll(regex)) {
        findings.push({
          file: relativePath,
          line: lineNumberForIndex(text, match.index ?? 0),
          name,
        });
      }
    }
  }
  return findings;
}

function runSelfTest() {
  const findings = auditPublicSourceHygiene(
    new Map([
      ['src/pages/example.astro', "const path = 'CHANGELOG.md';"],
      ['src/pages/allowed.astro', "const path = 'README.md';"],
    ]),
    ['CHANGELOG.md', 'ROADMAP.md'],
  );
  if (findings.length !== 1 || findings[0].file !== 'src/pages/example.astro' || findings[0].line !== 1) {
    console.error('Public source hygiene self-test failed.');
    process.exit(1);
  }
  console.log('Public source hygiene self-test passed.');
}

if (selfTest) runSelfTest();

const forbiddenNames = [...new Set([...(await rootMarkdownNames()), ...localOnlyMarkdownNames])]
  .filter((name) => !publicMarkdownAllowlist.has(name))
  .sort((a, b) => a.localeCompare(b));
const sourceFiles = await scannedSourceFiles();
const sourceTexts = new Map();
for (const filePath of sourceFiles) {
  sourceTexts.set(normalizePath(filePath), await fs.readFile(filePath, 'utf8'));
}

const findings = auditPublicSourceHygiene(sourceTexts, forbiddenNames);

console.log('Public source hygiene audit');
console.log(`  source files checked: ${sourceTexts.size}`);
console.log(`  local-only markdown names checked: ${forbiddenNames.length}`);

if (findings.length > 0) {
  console.error('');
  console.error('Public source hygiene audit failed:');
  for (const finding of findings) {
    console.error(`  - ${finding.file}:${finding.line} references local-only ${finding.name}.`);
  }
  process.exit(1);
}

console.log('Public source hygiene audit passed.');

// Verify the built dist/index.html declares the referrer policy meta tag.
const distIndexPath = path.join(root, 'dist', 'index.html');
const distIndexText = await fs.readFile(distIndexPath, 'utf8').catch(() => null);
if (distIndexText === null) {
  console.log('');
  console.log('Referrer policy meta check: dist/index.html not found — skipped (run build first).');
} else {
  const hasReferrerMeta = distIndexText.includes('name="referrer"') && distIndexText.includes('strict-origin-when-cross-origin');
  console.log('');
  console.log('Referrer policy meta check');
  if (hasReferrerMeta) {
    console.log('  dist/index.html referrer policy meta tag: present.');
  } else {
    console.error('  dist/index.html is missing <meta name="referrer" content="strict-origin-when-cross-origin">.');
    process.exit(1);
  }
}
