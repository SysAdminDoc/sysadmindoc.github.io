import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('homepage catalog search has a no-JS form fallback', async () => {
  const index = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');
  const main = await fs.readFile(path.join(root, 'public', 'scripts', 'main.js'), 'utf8');
  const css = await fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8');

  assert.match(index, /<form class="catalog-search-form" id="catalogSearchForm" action="\/search\/" method="get" role="search" aria-label="Search projects">/);
  assert.match(index, /<input type="search" class="search-input" id="searchInput" name="q"/);
  assert.match(index, /<noscript><button type="submit" class="catalog-submit">Search<\/button><\/noscript>/);
  assert.match(main, /const _catalogSearchForm=document\.getElementById\('catalogSearchForm'\)/);
  assert.match(main, /_catalogSearchForm\.addEventListener\('submit',e=>\{e\.preventDefault\(\);clearTimeout\(_searchDebounce\);if\(_searchEl\)currentSearch=_searchEl\.value;applyFilters\(\)\}\)/);
  assert.match(css, /\.catalog-search-form\{display:contents\}/);
  assert.match(css, /\.catalog-submit\{display:inline-flex/);
});
