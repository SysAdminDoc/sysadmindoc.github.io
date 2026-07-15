import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const layerOrder = '@layer site.critical, site.foundation, site.audit, site.homepage, site.secondary, site.polish, site.refinement, site.additions;';
const globalLayerAnchors = [
  ['foundation', /^@layer site\.critical, site\.foundation, site\.audit, site\.homepage, site\.secondary, site\.polish, site\.refinement, site\.additions;\s*@layer site\.foundation \{/],
  ['audit', /\/\* ===== v0\.4 AUDIT FIXES \(a11y \+ mobile \+ cls\) ===== \*\/\s*@layer site\.audit \{/],
  ['homepage', /\/\* ===== v0\.9\.0 premium homepage refresh ===== \*\/\s*@layer site\.homepage \{/],
  ['secondary', /\/\* ===== v0\.9\.1 secondary section polish ===== \*\/\s*@layer site\.secondary \{/],
  ['polish', /\/\* ===== v1\.0 premium polish pass ===== \*\/\s*@layer site\.polish \{/],
  ['refinement', /\/\* ===== v1\.0\.1 premium refinement pass ===== \*\/\s*@layer site\.refinement \{/],
  ['additions', /\/\* ===== R38: Light theme completion ===== \*\/\s*@layer site\.additions \{/],
];

test('critical and global stylesheets use a stable cascade layer contract', async () => {
  const [criticalCss, globalCss] = await Promise.all([
    fs.readFile(path.join(root, 'src', 'styles', 'critical.css'), 'utf8'),
    fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8'),
  ]);

  assert.match(criticalCss, new RegExp(`^/\\* Critical first-viewport CSS[\\s\\S]*?\\*/\\s*${layerOrder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*@layer site\\.critical \\{`));
  assert.match(globalCss, /^@layer site\.critical, site\.foundation, site\.audit, site\.homepage, site\.secondary, site\.polish, site\.refinement, site\.additions;\s*@layer site\.foundation \{/);
  for (const [, pattern] of globalLayerAnchors) {
    assert.match(globalCss, pattern);
  }
  assert.equal(globalCss.match(/@layer site\.(foundation|audit|homepage|secondary|polish|refinement|additions) \{/g)?.length, globalLayerAnchors.length);
  assert.doesNotMatch(globalCss, /site\.tokens/);
  assert.match(globalCss, /@media\(prefers-contrast:more\)\{\s*:root\{/);
  assert.match(globalCss, /@supports\s*\(text-wrap:pretty\)/);
});
