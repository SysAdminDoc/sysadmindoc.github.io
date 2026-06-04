import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('Beyond Code exposes static creative context without Spotify embeds', async () => {
  const index = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');
  const css = await fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8');
  const main = await fs.readFile(path.join(root, 'public', 'scripts', 'main.js'), 'utf8');

  assert.match(index, /const beyondCards = \[/);
  assert.match(index, /value: `\$\{aerialClips\.length\} flights`/);
  assert.match(index, /value: 'SlunderStudio'/);
  assert.match(index, /href: '\/projects\/SlunderStudio\/'/);
  assert.match(index, /No autoplay embeds/);
  assert.match(index, /<div class="beyond-overview rv" aria-label="Beyond code highlights">/);
  assert.match(index, /Aerial footage and creative tooling beyond the terminal/);
  assert.doesNotMatch(index, /open\.spotify\.com|Spotify embed|i\.scdn\.co/);
  assert.match(css, /\.beyond-overview\{\s+display:grid;\s+grid-template-columns:repeat\(3,minmax\(0,1fr\)\);/);
  assert.match(css, /\.beyond-card\{/);
  assert.match(main, /const HOMEPAGE_SCROLL_SECTION_SELECTOR='#live,#volume,#catalog,#skills,#about,#career,#philosophy,#journey,#beyond,#connect'/);
  assert.match(main, /const HOMEPAGE_HASH_RESTORE_DELAYS=\[0,250,750,1400,2400,3600\]/);
  assert.match(main, /const HOMEPAGE_INITIAL_HASH=window\.location\.hash/);
  assert.match(main, /function restoreHomepageHashTarget\(hashOverride\)/);
  assert.match(main, /function cancelHomepageHashRestore\(\)\{homepageHashRestoreToken\+\+\}/);
  assert.match(main, /window\.addEventListener\('hashchange',function\(\)\{scheduleHomepageHashRestore\(window\.location\.hash\)\}\)/);
});
