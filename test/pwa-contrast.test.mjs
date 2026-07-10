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

test('prefers-contrast layer exists and SearchAction stays out of schema', async () => {
  const critical = await fs.readFile(path.join(root, 'src', 'styles', 'critical.css'), 'utf8');
  const global = await fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8');
  const source = await readSourceTree(path.join(root, 'src'));

  assert.match(critical, /@media\(prefers-contrast:more\)/);
  assert.match(global, /@media\(prefers-contrast:more\)/);
  assert.match(global, /--border-strong:rgba\(124,184,255,\.42\)/);
  assert.match(global, /--border-strong:rgba\(53,107,191,\.42\)/);
  for (const stylesheet of [critical, global]) {
    assert.match(stylesheet, /--t3:light-dark\(#5d6c84,\s*#8b99b0\)/);
    assert.match(stylesheet, /--blue:light-dark\(#1c65b8,\s*#7cb8ff\)/);
    assert.match(stylesheet, /--grn:light-dark\(#0e7a3e,\s*#4ade80\)/);
    assert.match(stylesheet, /--red:light-dark\(#b42332,\s*#f87171\)/);
  }
  assert.doesNotMatch(source, /box-shadow:0 0 0 3px var\(--focus-ring\)/);
  assert.doesNotMatch(source, /theme-toggle\[aria-pressed=/);
  assert.doesNotMatch(source, /SearchAction/);
  assert.doesNotMatch(source, /potentialAction/);
});
