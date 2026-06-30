import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('homepage runtime has no removed command shell hooks and preserves section reveal targets', async () => {
  const main = await fs.readFile(path.join(root, 'public', 'scripts', 'main.js'), 'utf8');
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
    assert.equal(main.includes(token), false);
  }
  assert.match(main, /function revealHomepageScrollSections\(\)/);
  assert.match(main, /#live,#volume,#catalog,#skills,#career,#journey,#beyond,#connect/);
  assert.match(main, /el\.style\.contentVisibility='visible'/);
  assert.match(main, /Date\.now\(\)>=\(window\.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL\|\|0\)/);
  assert.match(greatestHits, /id="greatest-hits"/);
  assert.match(index, /id="live"/);
  assert.match(index, /id="catalog"/);
  assert.match(index, /id="skills"/);
  assert.match(index, /id="career"/);
  assert.match(index, /id="journey"/);
  assert.match(index, /id="beyond"/);
  assert.match(index, /id="connect"/);
});
