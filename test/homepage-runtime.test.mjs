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
  const critical = await fs.readFile(path.join(root, 'src', 'styles', 'critical.css'), 'utf8');
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
  assert.doesNotMatch(scripts, /matrix-overlay|matrix-column|triggerEasterEgg|showCopyToast|className='ripple'/);
  assert.doesNotMatch(await fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8'), /copy-toast|matrix-overlay|matrixFall|border-radius\s*:\s*(?:50%|999(?:9)?px)/);
  assert.doesNotMatch(`${index}\n${critical}`, /hero-carousel-(?:ui|arrow|dots)/);
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

test('command palette resolves hash jumps by id without selector parsing', async () => {
  const cmdk = await fs.readFile(path.join(root, 'public', 'scripts', 'cmdk.js'), 'utf8');

  assert.match(cmdk, /function getHashTarget\(hash\)/);
  assert.match(cmdk, /document\.getElementById\(id\)/);
  assert.doesNotMatch(cmdk, /document\.querySelector\(href\)/);
  assert.doesNotMatch(cmdk, /document\.querySelector\(url\.hash\)/);
});
