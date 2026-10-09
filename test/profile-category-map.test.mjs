import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const portfolioPath = path.join(root, 'src', 'data', 'portfolio.ts');
const validatorPath = path.join(root, 'scripts', 'validate-project-data.mjs');

// Reads `const <name> ... = { key: 'value', ... };` from source, skipping comment lines.
function readCategoryMap(source, name) {
  const block = source.match(new RegExp(`const ${name}[^=]*=\\s*\\{([^}]*)\\};`));
  assert.ok(block, `${name} not found`);
  return Object.fromEntries(
    [...block[1].matchAll(/^\s*([a-z]+):\s*'([a-z]+)',/gm)].map((match) => [match[1], match[2]]),
  );
}

test('the importer and the data validator map the same profile categories', async () => {
  const [portfolio, validator] = await Promise.all([
    fs.readFile(portfolioPath, 'utf8'),
    fs.readFile(validatorPath, 'utf8'),
  ]);

  const importerMap = readCategoryMap(portfolio, 'categoryMap');
  const validatorMap = readCategoryMap(validator, 'profileCategoryMap');

  assert.deepEqual(importerMap, validatorMap);
  assert.ok(Object.keys(importerMap).length >= 11);
});

test('Morphe patch bundles from the profile feed stay in the Android lane', async () => {
  const portfolio = await fs.readFile(portfolioPath, 'utf8');
  const map = readCategoryMap(portfolio, 'categoryMap');

  assert.equal(map.patches, 'kt');
  assert.equal(map.android, 'kt');
});
