import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { readCssEntry } from '../scripts/lib/css-entry.mjs';

const root = process.cwd();

test('homepage runtime stays minimal and preserves section reveal targets', async () => {
  const scriptNames = ['home-nav.js', 'home-catalog.js'];
  const removedScriptNames = ['main.js', 'home-github.js', 'home-media.js', 'home-effects.js'];
  const scripts = (
    await Promise.all(scriptNames.map((name) => fs.readFile(path.join(root, 'public', 'scripts', name), 'utf8')))
  ).join('\n');
  for (const name of removedScriptNames) {
    await assert.rejects(
      fs.access(path.join(root, 'public', 'scripts', name)),
      { code: 'ENOENT' },
      `${name} should stay removed from the static runtime`,
    );
  }
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
  assert.doesNotMatch(await readCssEntry(path.join(root, 'src', 'styles', 'global.css'), { root }), /copy-toast|matrix-overlay|matrixFall|border-radius\s*:\s*(?:50%|999(?:9)?px)/);
  assert.doesNotMatch(`${index}\n${critical}`, /hero-carousel-(?:ui|arrow|dots)/);
  assert.match(nav, /function revealHomepageScrollSections\(\)/);
  assert.match(nav, /#greatest-hits,#live,#skills,#catalog,#connect/);
  assert.match(nav, /el\.style\.contentVisibility='visible'/);
  assert.match(nav, /Date\.now\(\)>=\(window\.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL\|\|0\)/);
  assert.match(greatestHits, /id="greatest-hits"/);
  assert.match(greatestHits, /class="selected-work-list"/);
  assert.match(greatestHits, /grid-template-columns:54px minmax\(210px,.68fr\) minmax\(0,1fr\) 112px/);
  assert.match(index, /<GreatestHits limit=\{3\} \/>/);
  assert.doesNotMatch(greatestHits, /word-break:break-word|max-width:12ch/);
  assert.match(index, /id="live"/);
  assert.match(index, /<section id="catalog"/);
  assert.doesNotMatch(index, /<CatalogSection\b/);
  assert.match(index, /id="skills"/);
  assert.doesNotMatch(index, /id="career"/);
  assert.doesNotMatch(index, /href="#career"/);
  assert.doesNotMatch(index, /footer-freshness|Stats refreshed/);
  assert.doesNotMatch(index, /id="journey"/);
  assert.doesNotMatch(index, /href="#journey"/);
  assert.doesNotMatch(index, /id="beyond"|<SkillCard\b|class="video-grid"/);
  assert.match(index, /id="connect"/);
});

test('command palette resolves hash jumps by id without selector parsing', async () => {
  const cmdk = await fs.readFile(path.join(root, 'public', 'scripts', 'cmdk.js'), 'utf8');

  assert.match(cmdk, /function getHashTarget\(hash\)/);
  assert.match(cmdk, /document\.getElementById\(id\)/);
  assert.doesNotMatch(cmdk, /document\.querySelector\(href\)/);
  assert.doesNotMatch(cmdk, /document\.querySelector\(url\.hash\)/);
});
