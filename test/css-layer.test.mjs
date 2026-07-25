import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { loadCssEntry } from '../scripts/lib/css-entry.mjs';

const root = process.cwd();
const layerOrder = '@layer site.critical, site.foundation, site.audit, site.homepage, site.secondary, site.polish, site.refinement, site.additions;';
/** @type {Array<[string, RegExp]>} */
const globalLayerAnchors = [
  ['foundation', /^@layer site\.foundation \{/],
  ['audit', /\/\* ===== v0\.4 AUDIT FIXES \(a11y \+ mobile \+ cls\) ===== \*\/\s*@layer site\.audit \{/],
  ['homepage', /\/\* ===== v0\.9\.0 premium homepage refresh ===== \*\/\s*@layer site\.homepage \{/],
  ['secondary', /\/\* ===== v0\.9\.1 secondary section polish ===== \*\/\s*@layer site\.secondary \{/],
  ['polish', /\/\* ===== v1\.0 premium polish pass ===== \*\/\s*@layer site\.polish \{/],
  ['refinement', /\/\* ===== v1\.0\.1 premium refinement pass ===== \*\/\s*@layer site\.refinement \{/],
  ['additions', /\/\* ===== R38: Light theme completion ===== \*\/\s*@layer site\.additions \{/],
];
const globalImports = [
  'foundation',
  'audit',
  'homepage',
  'secondary',
  'polish',
  'refinement',
  'additions',
  'unlayered',
];

test('critical and global stylesheets use a stable cascade layer contract', async () => {
  const globalPath = path.join(root, 'src', 'styles', 'global.css');
  const [criticalCss, globalEntryCss, globalEntry] = await Promise.all([
    fs.readFile(path.join(root, 'src', 'styles', 'critical.css'), 'utf8'),
    fs.readFile(globalPath, 'utf8'),
    loadCssEntry(globalPath, { root }),
  ]);
  const { css: globalCss, sources } = globalEntry;

  assert.match(criticalCss, new RegExp(`^/\\* Critical first-viewport CSS[\\s\\S]*?\\*/\\s*${layerOrder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*@layer site\\.critical \\{`));
  assert.ok(globalEntryCss.startsWith(layerOrder));
  assert.deepEqual(
    [...globalEntryCss.matchAll(/@import '\.\/layers\/([^']+)\.css';/g)].map((match) => match[1]),
    globalImports,
  );
  assert.equal(
    globalEntryCss
      .replace(layerOrder, '')
      .replace(/@import '\.\/layers\/[^']+\.css';/g, '')
      .trim(),
    '',
    'global.css should remain an import-only entry point',
  );
  for (const [name, pattern] of globalLayerAnchors) {
    assert.match(sources.get(`src/styles/layers/${name}.css`) ?? '', pattern);
  }
  assert.equal(globalCss.match(/@layer site\.(foundation|audit|homepage|secondary|polish|refinement|additions) \{/g)?.length, globalLayerAnchors.length);
  assert.equal(sources.size, globalImports.length + 1);
  assert.match(sources.get('src/styles/layers/unlayered.css') ?? '', /^\/\* ===== v0\.18\.4 product refinement overrides ===== \*\//);
  assert.doesNotMatch(sources.get('src/styles/layers/unlayered.css') ?? '', /@layer site\./);
  assert.doesNotMatch(globalCss, /site\.tokens/);
  assert.match(globalCss, /@media\(prefers-contrast:more\)\{\s*:root\{/);
  assert.match(globalCss, /@supports\s*\(text-wrap:pretty\)/);
});
