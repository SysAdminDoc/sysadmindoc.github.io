import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('homepage terminal exposes contact, uses, and theme commands', async () => {
  const main = await fs.readFile(path.join(root, 'public', 'scripts', 'main.js'), 'utf8');

  assert.match(main, /<span class="cmd-name">contact<\/span>\s+Jump to Connect/);
  assert.match(main, /<span class="cmd-name">uses<\/span>\s+Open the setup page/);
  assert.match(main, /<span class="cmd-name">theme<\/span>\s+light \| dark \| toggle/);
  assert.match(main, /contact:\(\)=>scrollToTerminalTarget\('#connect','Connect section'\)/);
  assert.match(main, /uses:\(\)=>terminalRoute\('\/uses\/','\/uses\/'\)/);
  assert.match(main, /theme:runThemeCommand/);
  assert.match(main, /dark:\(\)=>runThemeCommand\(\['dark'\]\)/);
  assert.match(main, /light:\(\)=>runThemeCommand\(\['light'\]\)/);
  assert.match(main, /const btn=document\.getElementById\('themeToggle'\)/);
  assert.match(main, /function revealHomepageScrollSections\(\)/);
  assert.match(main, /#live,#volume,#catalog,#skills,#career,#journey,#beyond,#connect/);
  assert.match(main, /el\.style\.contentVisibility='visible'/);
  assert.match(main, /if\(inputEl\)inputEl\.blur\(\)/);
  assert.match(main, /window\.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL=Date\.now\(\)\+1600/);
  assert.match(main, /const jump=function\(\)\{target\.scrollIntoView\(\{block:'start',behavior:'auto'\}\);\}/);
  assert.match(main, /const syncHash=function\(\)\{if\(selector\.charAt\(0\)==='#'\)history\.replaceState\(null,'',selector\);\}/);
  assert.match(main, /setTimeout\(function\(\)\{\s*jump\(\);\s*syncHash\(\);\s*\},350\)/);
  assert.match(main, /setTimeout\(function\(\)\{\s*jump\(\);\s*syncHash\(\);\s*\},900\)/);
  assert.match(main, /Date\.now\(\)>=\(window\.__PORTFOLIO_SECTION_HASH_LOCK_UNTIL\|\|0\)/);
});
