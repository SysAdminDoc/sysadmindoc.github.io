import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('homepage runtime has no removed command shell hooks and preserves section reveal targets', async () => {
  const scriptNames = [
    'main.js',
    'home-nav.js',
    'home-catalog.js',
    'home-github.js',
    'home-media.js',
    'home-effects.js',
  ];
  const scripts = (
    await Promise.all(scriptNames.map((name) => fs.readFile(path.join(root, 'public', 'scripts', name), 'utf8')))
  ).join('\n');
  const nav = await fs.readFile(path.join(root, 'public', 'scripts', 'home-nav.js'), 'utf8');
  const index = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');
  const greatestHits = await fs.readFile(path.join(root, 'src', 'components', 'GreatestHits.astro'), 'utf8');
  const removedRuntimeTokens = [
    ['hero', 'Term'],
    ['term', 'Body'],
    ['term', 'Hint'],
    ['term', 'Repos'],
    ['term', 'Stars'],
    ['on', 'Term', 'Ready'],
    ['term', 'inal', 'Route'],
    ['term', '-input'],
    ['term', '-output'],
    ['cmd', '-name'],
    ['cmd', '-val'],
    ['t', 'ci'],
  ].map((parts) => parts.join(''));

  for (const token of removedRuntimeTokens) {
    assert.equal(scripts.includes(token), false);
  }
  assert.match(nav, /function revealHomepageScrollSections\(\)/);
  assert.match(nav, /#live,#volume,#catalog,#skills,#career,#journey,#beyond,#connect/);
  assert.match(nav, /el\.style\.contentVisibility='visible'/);
  assert.match(nav, /Date\.now\(\)>=\(window\.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL\|\|0\)/);
  assert.match(greatestHits, /id="greatest-hits"/);
  assert.match(index, /id="live"/);
  assert.match(index, /id="catalog"/);
  assert.match(index, /id="skills"/);
  assert.match(index, /id="career"/);
  assert.match(index, /id="journey"/);
  assert.match(index, /id="beyond"/);
  assert.match(index, /id="connect"/);
});
