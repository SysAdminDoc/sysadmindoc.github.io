import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('homepage renders SectionJumpNav from command palette sections', async () => {
  const home = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');
  const component = await fs.readFile(path.join(root, 'src', 'components', 'SectionJumpNav.astro'), 'utf8');

  assert.match(home, /import SectionJumpNav from '\.\.\/components\/SectionJumpNav\.astro'/);
  assert.match(home, /label: 'Project Mix', href: '#volume'/);
  assert.match(home, /<SectionJumpNav items=\{cmdkSections\} label="Portfolio Sections" \/>/);
  assert.match(component, /const sectionItems = items\.filter\(\(item\) => item\.href\?\.startsWith\('#'\)\);/);
});
