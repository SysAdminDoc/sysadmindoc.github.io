import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('homepage catalog search has a no-JS form fallback', async () => {
  const index = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');
  const catalog = await fs.readFile(path.join(root, 'public', 'scripts', 'home-catalog.js'), 'utf8');
  const css = await fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8');

  assert.match(index, /<form class="catalog-search-form" id="catalogSearchForm" action="\/search\/" method="get" role="search" aria-label="Search projects">/);
  assert.match(index, /<input type="search" class="search-input" id="searchInput" name="q"/);
  assert.match(index, /<noscript><button type="submit" class="catalog-submit">Search<\/button><\/noscript>/);
  assert.match(catalog, /const catalogSearchForm=document\.getElementById\('catalogSearchForm'\)/);
  assert.match(catalog, /catalogSearchForm\.addEventListener\('submit',e=>\{e\.preventDefault\(\);clearTimeout\(searchDebounce\);if\(searchEl\)currentSearch=searchEl\.value;applyFilters\(\)\}\)/);
  assert.match(css, /\.catalog-search-form\{display:contents\}/);
  assert.match(css, /\.catalog-submit\{display:inline-flex/);
});

test('primary navigation stays reachable without JavaScript', async () => {
  const headInit = await fs.readFile(path.join(root, 'public', 'scripts', 'head-init.js'), 'utf8');
  const css = await fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8');

  // head-init.js flips the JS marker before first paint so the no-JS rules only
  // apply when scripting is genuinely unavailable.
  assert.match(headInit, /document\.documentElement\.classList\.add\('js'\)/);

  // Inert controls (mobile menu toggle, command palette, theme toggle) are hidden
  // without JS, and the real navigation links are revealed at both the home
  // (900px) and interior (1080px) collapse breakpoints.
  assert.match(css, /html:not\(\.js\) \.mt\{display:none!important\}/);
  assert.match(css, /html:not\(\.js\) \.theme-toggle,\s*\n?\s*html:not\(\.js\) \.nav-search\{display:none!important\}/);
  assert.match(css, /@media\(max-width:1080px\)\{\s*\n?\s*html:not\(\.js\) \.nk\{display:flex!important/);
});
