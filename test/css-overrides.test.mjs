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

// Three live declarations the rule used to call dead (eighth drain review).
test('two anonymous layers are two layers, and the earlier one wins on !important', () => {
  assert.deepEqual(found('@layer{.a{color:red !important}}\n@layer{.a{color:blue !important}}'), [], 'browsers apply the red');
  assert.deepEqual(found('@layer{.a{color:red}}\n@layer{.a{color:blue}}'), [], "the audit doesn't order anonymous layers, so it keeps both");
  assert.deepEqual(found('@layer x{.a{color:red !important}}\n@layer x{.a{color:blue !important}}'), ['.a color 1>2'], 'one named layer is one layer');
});

test('custom property names keep their case, and other property names lose it', () => {
  assert.deepEqual(found('.a{--Accent:red}\n.a{--accent:blue}'), [], 'two properties');
  assert.deepEqual(found('.a{--accent:red}\n.a{--accent:blue}'), ['.a --accent 1>2']);
  assert.deepEqual(found('.a{COLOR:red}\n.a{color:blue}'), ['.a COLOR 1>2']);
});

test('a value some target can\'t parse leaves the one before it live', () => {
  assert.deepEqual(found('.a{width:-webkit-fill-available}\n.a{width:stretch}'), [], 'a browser without stretch keeps the prefixed value');
  assert.deepEqual(found('.a{width:stretch}\n.a{width:-webkit-fill-available}'), [], 'and one without the prefix keeps stretch');
  assert.deepEqual(found('.a{width:100%}\n.a{width:-moz-available}\n.a{width:stretch}'), [], 'and one with neither keeps 100%');
  // The thirteenth drain review: these are fallbacks too. The earlier version
  // of this test called 100% before stretch dead, which was wrong, since the
  // targets don't know stretch.
  assert.deepEqual(found('.a{width:100%}\n.a{width:stretch}'), []);
  assert.deepEqual(found('.a{text-wrap:wrap}\n.a{text-wrap:pretty}'), []);
  assert.deepEqual(found('.a{color:#888}\n.a{color:rgb(from red r g b / 50%)}'), []);
});

test('a value every target parses makes everything before it dead, prefixed or not', () => {
  assert.deepEqual(found('.a{width:10px}\n.a{width:20px}\n.a{width:-webkit-fill-available}'), ['.a width 1>2'], '20px is there wherever the prefix fails');
  assert.deepEqual(found('.a{width:-webkit-fill-available}\n.a{width:100%}'), ['.a width 1>2']);
  assert.deepEqual(found('.a{content:"x"}\n.a{content:"see -webkit-foo"}'), ['.a content 1>2'], 'a prefix inside a string is text');
  assert.deepEqual(found('.a{width:100%}\n.a{width:50%}'), ['.a width 1>2']);
  assert.deepEqual(found('.a{column-fill:auto}\n.a{column-fill:balance}'), ['.a column-fill 1>2'], 'balance is only new for text-wrap');
});

// The fifteenth drain review: a target drops each of these, so the value
// before it still applies there.
test('newer syntax the list had missed leaves the value before it live', () => {
  const cases = [
    ['transition', 'opacity .2s', 'opacity .2s allow-discrete'],
    ['transition-behavior', 'allow-discrete', 'normal'], // the property itself is new
    ['margin-top', '1em', '1lh'],
    ['padding-top', '4px', 'calc(.5rlh + 1px)'],
    ['transition-timing-function', 'ease', 'linear(0, .5 50%, 1)'],
    ['width', '8px', 'calc(pow(2, 3) * 1px)'],
    ['margin-left', '1px', 'abs(-1px)'],
    ['background-image', 'url(a.png)', 'image-set("a.avif" type("image/avif"), "a.png" type("image/png"))'],
    ['display', 'flex', 'block flex'],
  ];
  for (const [prop, before, after] of cases) {
    assert.deepEqual(found(`.a{${prop}:${before}}\n.a{${prop}:${after}}`), [], `${prop}: ${after}`);
  }
  // Near misses every target understands.
  assert.deepEqual(found('.a{background:red}\n.a{background:linear-gradient(red, blue)}'), ['.a background 1>2'], 'a gradient is not linear() easing');
  assert.deepEqual(found('.a{display:block}\n.a{display:inline-flex}'), ['.a display 1>2'], 'one keyword');
  assert.deepEqual(found('.a{background:red}\n.a{background:url(x1lh.png)}'), ['.a background 1>2'], 'a file name is not a unit');
});

// A value with var() parses everywhere and, if the browser can't use it once
// the variable is filled in, leaves the property unset: the declaration before
// it never comes back (fifteenth drain review).
test('a value with var() in it kills what comes before, whatever else it holds', () => {
  assert.deepEqual(found('.a{color:#888}\n.a{color:rgb(from var(--accent) r g b / 50%)}'), ['.a color 1>2']);
  assert.deepEqual(found('.a{color:#fff}\n.a{color:light-dark(var(--a), var(--b))}'), ['.a color 1>2']);
  assert.deepEqual(found('.a{width:100%}\n.a{width:var(--w, -webkit-fill-available)}'), ['.a width 1>2']);
  assert.deepEqual(found('.a{margin-top:1em}\n.a{margin-top:calc(var(--n) * 1lh)}'), ['.a margin-top 1>2']);
  assert.deepEqual(found('.a{font-family:serif}\n.a{font-family:"var(x)", -webkit-body}'), [], 'var( inside a string is text');
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
