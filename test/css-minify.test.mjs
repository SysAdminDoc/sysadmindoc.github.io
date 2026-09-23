import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { CSS_BROWSER_TARGETS, LIGHTNINGCSS_EXCLUDE, minifyCss } from '../scripts/lib/minify-css.mjs';

const root = process.cwd();

// Minified with no targets, lightningcss kept only the -webkit- twin of every
// backdrop-filter (Chromium and Firefox lost each blur) and folded
// animation-timeline into the animation shorthand, which Chromium rejects, so
// the scroll-progress bar sat at full width and scroll reveals never ran.
test('minifying keeps standard properties, adds the prefixes Safari 16.4 needs, and lowers nothing', () => {
  const out = minifyCss(
    'a{backdrop-filter:blur(2px)}b{animation:fill linear;animation-timeline:scroll()}c{color:light-dark(#fff,#000)}d{width:1px}@media (max-width:640px){d{width:2px}}',
  );
  assert.match(out, /-webkit-backdrop-filter:blur\(2px\)/);
  assert.match(out, /[{;]backdrop-filter:blur\(2px\)/);
  assert.match(out, /animation-timeline:scroll\(\)/);
  assert.doesNotMatch(out, /animation:[^;}]*scroll\(\)/, 'the timeline stays out of the shorthand');
  assert.match(out, /light-dark\(#fff,#000\)/, 'light-dark() is left as written');
  assert.doesNotMatch(out, /lightningcss-light/);
});

test('the source writes standard properties alone, and Vite minifies with the same settings', async () => {
  const stylesDir = path.join(root, 'src', 'styles');
  const files = [];
  const walk = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.css')) files.push(full);
    }
  };
  await walk(stylesDir);
  for (const file of files) {
    assert.doesNotMatch(await fs.readFile(file, 'utf8'), /-webkit-backdrop-filter/, `${path.relative(root, file)} writes the prefix by hand`);
  }
  const config = await fs.readFile(path.join(root, 'astro.config.mjs'), 'utf8');
  assert.match(config, /cssTarget: \[\.\.\.CSS_BROWSER_TARGETS\]/);
  assert.match(config, /lightningcss: \{ exclude: LIGHTNINGCSS_EXCLUDE \}/);
  assert.deepEqual([...CSS_BROWSER_TARGETS], ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4']);
  assert.ok(LIGHTNINGCSS_EXCLUDE > 0);
});

test('the built stylesheets keep every blur and every scroll timeline', async (t) => {
  const assets = path.join(root, 'dist', '_assets');
  const names = await fs.readdir(assets).catch(() => null);
  if (!names) {
    t.skip('dist/ not built; run npm run build');
    return;
  }
  let prefixed = 0;
  for (const name of names.filter((file) => file.endsWith('.css'))) {
    const css = await fs.readFile(path.join(assets, name), 'utf8');
    const webkit = (css.match(/-webkit-backdrop-filter:/g) ?? []).length;
    const standard = (css.match(/(?<!-webkit-)backdrop-filter:/g) ?? []).length;
    prefixed += webkit;
    assert.ok(standard >= webkit, `${name}: ${webkit} -webkit-backdrop-filter but ${standard} backdrop-filter`);
    assert.doesNotMatch(css, /animation:[^;}]*\b(?:scroll|view)\(\)/, `${name} folds a timeline into the animation shorthand`);
  }
  assert.ok(prefixed > 0, 'the build carries backdrop blurs at all');
});
