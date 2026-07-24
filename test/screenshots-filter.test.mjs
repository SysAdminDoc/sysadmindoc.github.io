import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('screenshots gallery only exposes a category facet with 2+ distinct categories', async () => {
  const src = await fs.readFile(path.join(root, 'src', 'pages', 'screenshots.astro'), 'utf8');

  assert.match(
    src,
    /const showFilters = categories\.length >= 2/,
    'the facet must be gated on having at least two distinct categories',
  );

  const gate = src.indexOf('{showFilters &&');
  const filters = src.indexOf('role="group" aria-label="Filter by category"');
  const status = src.indexOf('id="screenshotsStatus"');
  const empty = src.indexOf('id="screenshotsEmpty"');

  assert.ok(gate !== -1, 'a showFilters gate must exist');
  assert.ok(gate < filters && filters !== -1, 'the filter controls must render inside the gate');
  assert.ok(gate < status && status !== -1, 'the status line must render inside the gate');
  assert.ok(gate < empty && empty !== -1, 'the empty/reset state must render inside the gate');
});
