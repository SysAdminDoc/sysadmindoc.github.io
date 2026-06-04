import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

async function listJavaScriptFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  return entries
    .filter((entry) => entry.isFile() && /\.js$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function readRequired(filePath) {
  return fs.readFile(filePath, 'utf8').catch((error) => {
    throw new Error(`${filePath} is missing or unreadable: ${error.message}`);
  });
}

export async function minifyPublicScripts({
  rootDir = process.cwd(),
  publicScriptsDir = path.join(rootDir, 'public', 'scripts'),
  distScriptsDir = path.join(rootDir, 'dist', 'scripts'),
} = {}) {
  const scriptNames = await listJavaScriptFiles(publicScriptsDir);
  if (scriptNames.length === 0) {
    throw new Error(`No public scripts found in ${publicScriptsDir}`);
  }

  const rows = [];
  for (const scriptName of scriptNames) {
    const distPath = path.join(distScriptsDir, scriptName);
    const input = await readRequired(distPath);
    const minified = await transform(input, {
      minifyIdentifiers: false,
      minifySyntax: true,
      minifyWhitespace: true,
      legalComments: 'none',
      target: 'es2020',
    });
    if (!minified.code.trim()) {
      throw new Error(`Minifier produced empty output for ${distPath}`);
    }

    await fs.writeFile(distPath, minified.code);
    rows.push({
      name: scriptName,
      before: Buffer.byteLength(input),
      after: Buffer.byteLength(minified.code),
    });
  }

  const before = rows.reduce((total, row) => total + row.before, 0);
  const after = rows.reduce((total, row) => total + row.after, 0);
  return { count: rows.length, before, after, saved: before - after, rows };
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  try {
    const summary = await minifyPublicScripts();
    console.log('Public script minification');
    console.log(`  scripts minified: ${summary.count}`);
    console.log(`  before: ${formatBytes(summary.before)}`);
    console.log(`  after: ${formatBytes(summary.after)}`);
    console.log(`  saved: ${formatBytes(summary.saved)}`);
    for (const row of summary.rows) {
      console.log(`  ${row.name}: ${formatBytes(row.before)} -> ${formatBytes(row.after)}`);
    }
    console.log('Public script minification passed.');
  } catch (error) {
    console.error(`Public script minification failed: ${error.message}`);
    process.exit(1);
  }
}
