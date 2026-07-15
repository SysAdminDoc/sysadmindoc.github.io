import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const globalCssPath = path.join(root, 'src', 'styles', 'global.css');

const deferredSections = [
  '#catalog',
  '#live',
  '#skills',
  '#journey',
  '#beyond',
  '#connect',
];

async function loadGlobalCss() {
  return fs.readFile(globalCssPath, 'utf8');
}

test('homepage below-fold sections opt into content-visibility with stable intrinsic sizes', async () => {
  const css = await loadGlobalCss();

  assert.match(css, /@supports\s*\(content-visibility:auto\)/, 'content-visibility should stay feature-gated');
  assert.match(css, /content-visibility:auto/, 'deferred sections should set content-visibility:auto');
  assert.match(css, /contain-intrinsic-size:auto var\(--cv-intrinsic-size,900px\)/, 'deferred sections need an intrinsic-size fallback');

  for (const section of deferredSections) {
    assert.match(css, new RegExp(`${section.replace('#', '#')}\\{--cv-intrinsic-size:\\d+px\\}`), `${section} needs an explicit intrinsic size`);
  }

  assert.doesNotMatch(css, /#hero\{--cv-intrinsic-size:/, 'hero must stay eager for first paint');
  assert.doesNotMatch(css, /#greatest-hits\{--cv-intrinsic-size:/, 'first follow-up section should stay eager to avoid near-fold blanking');
});

test('print output disables homepage render containment', async () => {
  const css = await loadGlobalCss();

  assert.match(css, /@media print\{[\s\S]*content-visibility:visible;[\s\S]*contain-intrinsic-size:none;[\s\S]*\}/, 'print should render deferred sections normally');
});
