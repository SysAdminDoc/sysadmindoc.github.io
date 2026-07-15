import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('homepage keeps command navigation without a redundant section jump band', async () => {
  const home = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');

  assert.doesNotMatch(home, /import SectionJumpNav/);
  assert.doesNotMatch(home, /home-jump-shell/);
  assert.doesNotMatch(home, /label: 'Project Mix', href: '#volume'/);
  assert.match(home, /label: 'Catalog', href: '#catalog'/);
  assert.match(home, /label: 'Live Apps', href: '#live'/);
  assert.ok(home.indexOf('<section id="catalog"') < home.indexOf('<section id="live"'));
});
