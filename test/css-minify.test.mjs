import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { cssOutputProblems } from '../scripts/lib/css-output-check.mjs';
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

// The built stylesheets are checked by css:output:audit inside build:ci, on the
// build it just made. A test here could only read whatever dist/ the last
// build left, since deploy:preflight runs npm test before it builds.
test('the output check finds a blur left without its standard property, or a folded timeline', () => {
  const good = cssOutputProblems('a{-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}b{animation:fill linear;animation-timeline:scroll()}');
  assert.deepEqual(good, { problems: [], prefixed: 1 });
  const lostBlur = cssOutputProblems('a{-webkit-backdrop-filter:blur(2px)}c{backdrop-filter:blur(4px)}');
  assert.match(lostBlur.problems.join('\n'), /1 rule\(s\) with -webkit-backdrop-filter but no backdrop-filter/, 'a standard blur in another rule does not pair with it');
  const folded = cssOutputProblems('b{animation:fill linear scroll()}');
  assert.match(folded.problems.join('\n'), /timeline folded into the animation shorthand/);
  assert.deepEqual(cssOutputProblems('d{width:1px}'), { problems: [], prefixed: 0 });
});

test('build:ci runs the output check on its own build, and the self-test proves it can fail', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const steps = pkg.scripts['build:ci'].split('&&').map((step) => step.trim());
  assert.equal(pkg.scripts['css:output:audit'], 'node scripts/audit-css-output.mjs');
  assert.ok(steps.indexOf('npm run css:output:audit') > steps.indexOf('astro build'), 'after the build it checks');
  const selftest = await fs.readFile(path.join(root, 'scripts', 'audit-gate-selftest.mjs'), 'utf8');
  assert.match(selftest, /args: \['scripts\/audit-css-output\.mjs', '--dist', scratch\]/);
});
