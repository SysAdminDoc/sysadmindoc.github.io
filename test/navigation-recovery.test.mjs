import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('deferred command search exposes a retry state and malformed jump hashes stay safe', async () => {
  const loader = await fs.readFile(path.join(root, 'public', 'scripts', 'cmdk-loader.js'), 'utf8');
  const jumpNav = await fs.readFile(path.join(root, 'public', 'scripts', 'section-jump-nav.js'), 'utf8');

  assert.match(loader, /Command search couldn't load\. Try again\./);
  assert.match(loader, /loading = null/);
  assert.match(loader, /script\.remove\(\)/);
  assert.match(loader, /data-load-state', 'error'/);
  assert.match(jumpNav, /try \{\s*initialId = decodeURIComponent\(initialId\)/);
});
