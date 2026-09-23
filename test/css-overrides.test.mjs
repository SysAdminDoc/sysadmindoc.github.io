import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { overriddenDeclarations } from '../scripts/lib/css-overrides.mjs';

const found = (css) => overriddenDeclarations(css).map(({ selector, prop, line, overriddenAt }) => `${selector} ${prop} ${line}>${overriddenAt}`);

test('a property set again later on the same selector, in the same context, is reported', () => {
  assert.deepEqual(found('.a{color:red;margin:0}\n.b{color:green}\n.a{color:blue}'), ['.a color 1>3']);
  // The selector list's order and spacing don't matter.
  assert.deepEqual(found('.a,.b{color:red}\n.b, .a{color:blue}'), ['.a,.b color 1>2']);
  // A custom property never falls back, so an earlier one is always dead.
  assert.deepEqual(found(':root{--bg:#000}\n:root{--bg:light-dark(#fff,#000)}'), [':root --bg 1>2']);
  // Inside the same at-rule the same rule applies.
  assert.deepEqual(found('@media (max-width:640px){.a{gap:1px}}\n@media (max-width:640px){.a{gap:2px}}'), ['.a gap 1>2']);
});

test('what can still apply is left alone', () => {
  assert.deepEqual(found('.a{color:red}\n@media (max-width:640px){.a{color:blue}}'), [], 'another context');
  assert.deepEqual(found('.a{color:red}\n.a:hover{color:blue}'), [], 'another selector');
  assert.deepEqual(found('.a,.b{color:red}\n.a{color:blue}'), [], 'a list only partly replaced');
  assert.deepEqual(found('.a{color:red !important}\n.a{color:blue}'), [], 'an earlier !important wins');
  assert.deepEqual(found('.a{display:-webkit-box;display:flex}'), [], 'a repeat inside one rule is a fallback');
  // In the targets that predate light-dark(), the later value doesn't parse
  // and the earlier one applies.
  assert.deepEqual(found('.a{color:#fff}\n.a{color:light-dark(#000,#fff)}'), []);
  assert.deepEqual(found('.a{margin-top:1px}\n.a{margin:0}'), [], 'a shorthand is another property');
});

test('a later !important replaces an earlier normal declaration', () => {
  assert.deepEqual(found('.a{color:red}\n.a{color:blue !important}'), ['.a color 1>2']);
  assert.deepEqual(found('.a{color:red !important}\n.a{color:blue !important}'), ['.a color 1>2']);
});

test('no stylesheet under src/styles replaces its own declarations', () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.name.endsWith('.css') ? [full] : [];
  });
  const files = walk(path.join(process.cwd(), 'src', 'styles'));
  assert.ok(files.length >= 10, 'the stylesheets were found');
  for (const file of files) {
    assert.deepEqual(found(fs.readFileSync(file, 'utf8')), [], path.relative(process.cwd(), file));
  }
});
