import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

async function readSourceTree(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const chunks = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      chunks.push(await readSourceTree(entryPath));
      continue;
    }
    if (/\.(astro|css|js|mjs|ts)$/.test(entry.name)) {
      chunks.push(await fs.readFile(entryPath, 'utf8'));
    }
  }
  return chunks.join('\n');
}

test('iOS PWA install path exposes standalone metadata and manual Safari fallback', async () => {
  const base = await fs.readFile(path.join(root, 'src', 'layouts', 'Base.astro'), 'utf8');
  const main = await fs.readFile(path.join(root, 'public', 'scripts', 'main.js'), 'utf8');

  assert.match(base, /<meta name="mobile-web-app-capable" content="yes" \/>/);
  assert.match(base, /<meta name="apple-mobile-web-app-capable" content="yes" \/>/);
  assert.match(base, /<meta name="apple-mobile-web-app-title" content="SysAdminDoc" \/>/);
  assert.match(base, /<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" \/>/);

  assert.match(main, /function isIosDevice\(\)/);
  assert.match(main, /window\.navigator\.standalone===true/);
  assert.match(main, /function isIosSafari\(\)/);
  assert.match(main, /Open as Web App/);
  assert.match(main, /showInstallChip\('ios'\)/);
  assert.match(main, /beforeinstallprompt/);
});

test('prefers-contrast layer exists and SearchAction stays out of schema', async () => {
  const critical = await fs.readFile(path.join(root, 'src', 'styles', 'critical.css'), 'utf8');
  const global = await fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8');
  const source = await readSourceTree(path.join(root, 'src'));

  assert.match(critical, /@media\(prefers-contrast:more\)/);
  assert.match(global, /@media\(prefers-contrast:more\)/);
  assert.match(global, /--border-strong:rgba\(124,184,255,\.42\)/);
  assert.match(global, /--border-strong:rgba\(53,107,191,\.42\)/);
  assert.doesNotMatch(source, /SearchAction/);
  assert.doesNotMatch(source, /potentialAction/);
});
