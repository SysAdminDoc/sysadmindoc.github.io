import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('build path enforces a homepage catalog DOM-size budget', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const script = await fs.readFile(path.join(root, 'scripts', 'audit-dom-size.mjs'), 'utf8');
  const buildCi = pkg.scripts['build:ci'];

  assert.equal(pkg.scripts['dom:audit'], 'node scripts/audit-dom-size.mjs');
  assert.match(buildCi, /npm run feed:audit && npm run dom:audit && npm run search:index && npm run search:audit && npm run sw:stamp/);
  assert.match(script, /catalogSectionBytes: 200_000/);
  // Homepage catalog is a preview slice held under the aspirational 1,400-node budget.
  assert.match(script, /catalogDomNodes: 1_400/);
  assert.match(script, /catalogCards: 96/);
  assert.match(script, /const smallCatalogBudgets/);
  assert.match(script, /maxCatalogCards: 50/);
  assert.match(script, /mode: 'small-catalog'/);
  // Preview slice tracks the shared HOMEPAGE_CATALOG_LIMIT and asserts the expected count.
  assert.match(script, /HOMEPAGE_CATALOG_LIMIT/);
  assert.match(script, /catalog preview cards/);
  // The full static /catalog/ route must render every project for no-JS reachability.
  assert.match(script, /The full catalog must stay complete for no-JS reachability/);
});
