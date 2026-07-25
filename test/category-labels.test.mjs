import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('categoryLabels covers every Lang key defined in types.ts', async () => {
  const typesSource = await fs.readFile(path.join(root, 'src', 'data', 'types.ts'), 'utf8');
  const categoriesSource = await fs.readFile(path.join(root, 'src', 'data', 'categories.ts'), 'utf8');

  // Extract Lang union members from: export type Lang = 'ps' | 'py' | ...;
  const langMatch = typesSource.match(/export type Lang = ([^;]+);/);
  assert.ok(langMatch, 'Lang type definition not found in types.ts');
  const langKeys = [...langMatch[1].matchAll(/'([^']+)'/g)].map(([, key]) => key);
  assert.ok(langKeys.length > 0, 'No Lang keys parsed from types.ts');

  // Extract keys present in categoryLabels object literal
  const objMatch = categoriesSource.match(/export const categoryLabels[^=]*=\s*\{([^}]+)\}/s);
  assert.ok(objMatch, 'categoryLabels object not found in categories.ts');
  const labelKeys = [...objMatch[1].matchAll(/^\s*(\w+):/gm)].map(([, key]) => key);
  assert.ok(labelKeys.length > 0, 'No keys parsed from categoryLabels in categories.ts');

  const missing = langKeys.filter((key) => !labelKeys.includes(key));
  assert.deepEqual(
    missing,
    [],
    `categoryLabels is missing entries for Lang keys: ${missing.join(', ')}`,
  );
});

async function readCategoryLabelMap() {
  const categoriesSource = await fs.readFile(path.join(root, 'src', 'data', 'categories.ts'), 'utf8');
  const objMatch = categoriesSource.match(/export const categoryLabels[^=]*=\s*\{([^}]+)\}/s);
  assert.ok(objMatch, 'categoryLabels object not found in categories.ts');
  return Object.fromEntries(
    [...objMatch[1].matchAll(/^\s*(\w+):\s*'([^']+)'/gm)].map(([, key, val]) => [key, val]),
  );
}

async function readFilterButtons() {
  const source = await fs.readFile(path.join(root, 'src', 'data', 'catalog-render.ts'), 'utf8');
  const filterMatch = source.match(/export const filterButtons\s*=\s*\[([^\]]+)\]/s);
  assert.ok(filterMatch, 'filterButtons array not found in catalog-render.ts');
  const buttons = [...filterMatch[1].matchAll(/\{\s*key:\s*'([^']+)',\s*label:\s*'([^']+)'\s*\}/g)].map(
    ([, key, label]) => ({ key, label }),
  );
  assert.ok(buttons.length > 0, 'No filter buttons parsed from catalog-render.ts');
  return buttons;
}

test('filterButtons labels agree with categoryLabels', async () => {
  const labelMap = await readCategoryLabelMap();
  const buttons = await readFilterButtons();

  const mismatches = buttons
    .filter(({ key }) => key in labelMap)
    .filter(({ key, label }) => labelMap[key] !== label);

  assert.deepEqual(
    mismatches,
    [],
    `filterButtons labels differ from categoryLabels: ${JSON.stringify(mismatches)}`,
  );
});

test('filterButtons offers a facet for every category, so no project is unfilterable', async () => {
  const labelMap = await readCategoryLabelMap();
  const buttons = await readFilterButtons();
  const buttonKeys = buttons.map(({ key }) => key);

  const missing = Object.keys(labelMap).filter((key) => !buttonKeys.includes(key));
  assert.deepEqual(
    missing,
    [],
    `Categories with no filter chip — projects in them cannot be filtered to: ${missing.join(', ')}`,
  );
});
