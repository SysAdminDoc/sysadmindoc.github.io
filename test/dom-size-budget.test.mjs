import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('build path enforces a handoff-only homepage catalog budget', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const script = await fs.readFile(path.join(root, 'scripts', 'audit-dom-size.mjs'), 'utf8');
  const buildCi = pkg.scripts['build:ci'];

  assert.equal(pkg.scripts['dom:audit'], 'node scripts/audit-dom-size.mjs');
  assert.match(buildCi, /npm run feed:audit && npm run dom:audit && npm run og-cards:audit && npm run search:index && npm run search:audit && npm run sw:stamp/);
  assert.match(script, /homepageHtmlBytes: 96_000/);
  assert.match(script, /catalogSectionBytes: 4_000/);
  assert.match(script, /catalogDomNodes: 60/);
  assert.match(script, /catalogCards: 0/);
  assert.match(script, /homepage catalog mode: handoff-only/);
  assert.doesNotMatch(script, /HOMEPAGE_CATALOG_LIMIT|smallCatalogBudgets|catalog preview cards/);
  // The full static /catalog/ route must render every project for no-JS reachability.
  assert.match(script, /The full catalog must stay complete for no-JS reachability/);
});
