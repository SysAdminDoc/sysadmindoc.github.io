import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('build path enforces a homepage catalog DOM-size budget', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const script = await fs.readFile(path.join(root, 'scripts', 'audit-dom-size.mjs'), 'utf8');

  assert.equal(pkg.scripts['dom:audit'], 'node scripts/audit-dom-size.mjs');
  assert.match(pkg.scripts['build:ci'], /npm run feed:audit && npm run dom:audit && npm run sw:stamp/);
  assert.match(script, /catalogSectionBytes: 266_240/);
  assert.match(script, /catalogDomNodes: 2_300/);
  assert.match(script, /catalogCards: 220/);
  assert.match(script, /const smallCatalogBudgets/);
  assert.match(script, /maxCatalogCards: 50/);
  assert.match(script, /mode: 'small-catalog'/);
  assert.match(script, /Homepage catalog renders \$\{catalogCards\} cards; dist\/projects\.json exposes \$\{projects\.length\} projects/);
});
