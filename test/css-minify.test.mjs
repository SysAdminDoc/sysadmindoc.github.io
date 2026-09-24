import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { Features } from 'lightningcss';
import { cssOutputProblems, embeddedCss, scriptCarriesLightDark, stripCssComments, svgUnreadable } from '../scripts/lib/css-output-check.mjs';
import { CSS_BROWSER_TARGETS, LIGHTNINGCSS_EXCLUDE, minifyCss } from '../scripts/lib/minify-css.mjs';

const root = process.cwd();

// Minified with no targets, lightningcss kept only the -webkit- twin of every
// backdrop-filter (Chromium and Firefox lost each blur) and folded
// animation-timeline into the animation shorthand, which Chromium rejects, so
// the scroll-progress bar sat at full width and scroll reveals never ran.
test('minifying keeps standard properties, adds the prefixes Safari 16.4 needs, and lowers only light-dark()', () => {
  const out = minifyCss(
    'a{backdrop-filter:blur(2px)}b{animation:fill linear;animation-timeline:scroll()}d{width:1px}@media (max-width:640px){d{width:2px}}e{inset:0;color:color-mix(in srgb,var(--grn) 12%,transparent)}',
  );
  assert.match(out, /-webkit-backdrop-filter:blur\(2px\)/);
  assert.match(out, /[{;]backdrop-filter:blur\(2px\)/);
  assert.match(out, /animation-timeline:scroll\(\)/);
  assert.doesNotMatch(out, /animation:[^;}]*scroll\(\)/, 'the timeline stays out of the shorthand');
  assert.match(out, /inset:0/, 'inset stays a shorthand');
  assert.match(out, /color-mix\(/, 'and color-mix() stays as written');

  // inset and color-mix() work in every target, so they couldn't show that
  // nothing else gets lowered. These don't all: with a wider mask lightningcss
  // unnests the rule, spells :dir() out as 19 :lang() tests, splits the
  // :lang() list and turns the percentage into calc(), each of which changes
  // what a browser matches or draws (eighth drain review).
  const lowerable = minifyCss('f{color:red;&:hover{color:blue}}g:dir(rtl){margin-left:1px}h:lang(en,fr){quotes:none}i{text-decoration-thickness:10%}');
  assert.match(lowerable, /f\{color:red;&:hover\{/, 'nesting stays nested');
  assert.match(lowerable, /g:dir\(rtl\)\{/, ':dir() stays as written');
  assert.match(lowerable, /h:lang\(en,\s*fr\)\{/, 'and so does a :lang() list');
  assert.match(lowerable, /text-decoration-thickness:10%/, 'and a percentage thickness');
  const allowed = Object.entries(Features)
    .filter(([, flag]) => Number.isInteger(flag) && (flag & ~LIGHTNINGCSS_EXCLUDE) !== 0)
    .map(([name]) => name)
    .sort();
  assert.deepEqual(allowed, ['Colors', 'LightDark', 'VendorPrefixes'], 'Colors only because it includes LightDark');
});

// All 50 light-dark() uses set a custom property, and the targets before
// Chrome 123, Safari 17.5 and Firefox 120 drop them, losing the accents: the
// sixth drain review, and in Chrome 122 the catalog's red category dots were
// gone. Lowered, each follows the switch variables that the theme's two
// color-scheme rules set.
test('light-dark() tokens are lowered to follow the color-scheme rules the theme toggle switches', async () => {
  const out = minifyCss(':root{--red:light-dark(#b42332,#f87171);color-scheme:dark}html[data-theme="light"]{color-scheme:light}.dot{background:var(--red)}');
  assert.doesNotMatch(out, /light-dark\(/);
  assert.match(out, /--red:var\(--lightningcss-light,\s*#b42332\)\s*var\(--lightningcss-dark,\s*#f87171\)/);
  assert.match(out, /:root\{[^}]*--lightningcss-light:\s*;[^}]*--lightningcss-dark:initial/, 'dark by default');
  assert.match(out, /html\[data-theme=["']?light["']?\]\{[^}]*--lightningcss-light:initial[^}]*--lightningcss-dark:\s*;/, 'light when the toggle says so');

  // The switch only follows the toggle if the source declares color-scheme
  // on exactly those selectors, so a new theme rule without one would break it.
  const critical = await fs.readFile(path.join(root, 'src', 'styles', 'critical.css'), 'utf8');
  assert.match(critical, /:root\{[^}]*color-scheme:dark;?\s*\}/);
  assert.match(critical, /html\[data-theme="light"\]\{\s*color-scheme:light;\s*\}/);
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
// The nineteenth drain review: comments were cut out without regard to
// escapes, strings or url(), so an escaped `\/*` hid the rules after it.
test('CSS comments are found where the tokenizer finds them', () => {
  assert.equal(stripCssComments('a{} /* x */ b{}'), 'a{}   b{}', 'a comment still separates what it stood between');
  assert.equal(stripCssComments('a\\/* url(x) */'), 'a\\/* url(x) */', 'an escaped slash opens nothing');
  assert.equal(stripCssComments('@import "data:text/css,/*";@import "b.css";'), '@import "data:text/css,/*";@import "b.css";', 'nor does one in a string');
  assert.equal(stripCssComments('b{background:url(https://z.example/*.png)} /* gone */'), 'b{background:url(https://z.example/*.png)}  ', 'nor in an unquoted url()');
  assert.equal(stripCssComments('c{content:"\\"/*"} /* gone */ d{}'), 'c{content:"\\"/*"}   d{}');
  assert.equal(stripCssComments('e{} /* unterminated'), 'e{}  ');
  assert.equal(stripCssComments('myurl(/* x */)'), 'myurl( )', 'a function other than url() takes comments');
  assert.equal(stripCssComments('url/**/(x)'), 'url (x)');
});

test('the output check finds a blur left without its standard property, or a folded timeline', () => {
  const good = cssOutputProblems('a{-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}b{animation:fill linear;animation-timeline:scroll()}');
  assert.deepEqual(good, { problems: [], prefixed: 1 });
  const lostBlur = cssOutputProblems('a{-webkit-backdrop-filter:blur(2px)}c{backdrop-filter:blur(4px)}');
  assert.match(lostBlur.problems.join('\n'), /1 rule\(s\) with -webkit-backdrop-filter but no backdrop-filter/, 'a standard blur in another rule does not pair with it');
  const folded = cssOutputProblems('b{animation:fill linear scroll()}');
  assert.match(folded.problems.join('\n'), /timeline folded into the animation shorthand/);
  assert.match(cssOutputProblems(':root{--red:light-dark(#b42332,#f87171)}').problems.join('\n'), /a light-dark\(\) the minifier left in place/);
  assert.deepEqual(cssOutputProblems('d{width:1px}'), { problems: [], prefixed: 0 });
});

// The twelfth drain review got a light-dark() past the audit each of these
// ways, and Chromium applies every one of them but the attribute, which the
// CSP blocks.
test('the output check reads CSS the way browsers do: any case, any closing-tag spacing, attributes too', () => {
  assert.match(cssOutputProblems('.a{color:LIGHT-DARK(#000,#fff)}').problems.join('\n'), /light-dark/);
  assert.equal(cssOutputProblems('A{-WEBKIT-BACKDROP-FILTER:blur(2px);BACKDROP-FILTER:blur(2px)}').prefixed, 1);
  const found = embeddedCss(
    '<STYLE>a{color:red}</STYLE><style media="x">b{color:red}</style ><main data-style="no" style="color:blue"><p STYLE=\'margin:0\'><a href="/?style=1">x</a></main>',
  );
  assert.deepEqual(found, [
    { label: '<style> 1', css: 'a{color:red}' },
    { label: '<style> 2', css: 'b{color:red}' },
    { label: 'style attribute 1', css: 'color:blue' },
    { label: 'style attribute 2', css: 'margin:0' },
  ]);
  assert.deepEqual(embeddedCss('<svg><style>.x{fill:red}</style></svg>'), [{ label: '<style> 1', css: '.x{fill:red}' }]);
});

// The thirteenth drain review's gaps: Chromium applies each of these.
test('the output check also reads escapes, entities, odd closing tags, data: imports and quoted >', () => {
  const lightDark = (css) => /light-dark/.test(cssOutputProblems(css).problems.join('\n'));
  assert.ok(lightDark('.a{color:light-dar\\6b(#000,#fff)}'), 'a hex escape');
  assert.ok(lightDark('.a{color:light-dar\\k(#000,#fff)}'), 'a character escape');
  assert.ok(lightDark('@import url("data:text/css,.a%7Bcolor:light-dark(%23000,%23fff)%7D");'), 'a data: import');
  assert.ok(lightDark(`@import "data:text/css;base64,${Buffer.from('.a{color:light-dark(#000,#fff)}').toString('base64')}";`), 'a base64 data: import');
  assert.ok(!lightDark('.a{content:"light-darkish"}'), 'no false alarm');

  // Styles only: embeddedCss also hands back inline scripts now.
  const found = (markup) => embeddedCss(markup).filter((piece) => !piece.script).map(({ css }) => css);
  assert.deepEqual(found('<style>a{}</style x><style>b{}</style/>'), ['a{}', 'b{}'], 'closing tags with more before the >');
  assert.deepEqual(found('<p title="a>b" style="c:d">'), ['c:d'], 'a > inside an earlier quoted value');
  assert.deepEqual(found('<p style="color:light&#x2d;dark(red,blue)">'), ['color:light-dark(red,blue)'], 'an entity in an attribute');
  assert.deepEqual(found('<style>a{b:&#45;}</style><svg><style>c{d:light&#45;dark(red,blue)}</style></svg>'), ['a{b:&#45;}', 'c{d:light-dark(red,blue)}'], 'decoded in SVG only');
  // The parser knows SVG from the markup itself, so no option says so any more.
  assert.deepEqual(found('<svg><style><![CDATA[e{f:g}]]></style></svg>'), ['e{f:g}'], 'CDATA in SVG');
  assert.deepEqual(found('<script>const s = "<style>x{}</style>";</script><style/>h{}</style>'), ['h{}'], 'a script is opaque, and HTML ignores /');
});

// The fifteenth drain review: Chromium applies each of these, and the
// hand-written scanner missed them. The reader is parse5 now.
test('the output check reads what a browser reads, comments, SVG, links and scripts included', () => {
  const lightDark = (css) => /light-dark/.test(cssOutputProblems(css).problems.join('\n'));
  const styles = (markup) => embeddedCss(markup).filter((piece) => !piece.script).map(({ css }) => css);
  assert.deepEqual(styles('<!--><style>a{}</style><!---><style>b{}</style><!-- x --!><style>c{}</style>'), ['a{}', 'b{}', 'c{}'], 'comments end where a browser ends them');
  assert.deepEqual(styles('<svg><style / >d{}</style></svg>'), ['d{}'], '"/ >" is no self-closing tag');
  assert.deepEqual(styles('<svg><script><style>e{}</style></script></svg>'), ['e{}'], 'an SVG script holds elements');
  assert.deepEqual(styles('<svg><![CDATA[<!--]]><style>f{}</style></svg>'), ['f{}'], 'CDATA hides no comment opener');
  assert.deepEqual(styles('<b></b x=">"><p style="g:h">'), ['g:h'], 'an end tag with a quoted >');

  const pieces = embeddedCss('<link rel="stylesheet" href="data:text/css,.i%7Bcolor:light-dark(red,blue)%7D"><script>x.innerHTML="<style>.j{color:light\\x2ddark(red,blue)}</style>"</script>');
  assert.ok(lightDark(pieces.find((piece) => piece.label.startsWith('data: stylesheet link')).css), 'a data: stylesheet link');
  assert.ok(scriptCarriesLightDark(pieces.find((piece) => piece.script).css), 'an inline script, through its \\x2d');

  assert.ok(lightDark('@import"data:text/css,.k%7Bcolor:light-dark%28red,blue%29%7D";'), '@import with no space');
  assert.ok(lightDark('@import/**/url(data:text/css,.l%7Bcolor:light-dark%28red,blue%29%7D);'), '@import with a comment');
  assert.ok(lightDark('@import url("data:text/css,a)b{color:light-dark%28red,blue%29}");'), 'a quoted data URI holding )');
  assert.ok(lightDark('@import "data:text/css,%FF.m{color:light-dark%28red,blue%29}";'), 'a byte that is not UTF-8');
  assert.ok(lightDark('.n{color:light-dar\\6b\r\n(red,blue)}'), 'a hex escape before CRLF');
  assert.match(svgUnreadable('<!DOCTYPE svg [<!ENTITY ld "light-dark">]><svg><style>.o{color:&ld;(red,blue)}</style></svg>') ?? '', /its own entities/);
  assert.equal(svgUnreadable('<svg><style>.p{}</style></svg>'), null);
});

test('build:ci runs the output check on its own build, and the self-test proves it can fail', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const steps = pkg.scripts['build:ci'].split('&&').map((step) => step.trim());
  assert.equal(pkg.scripts['css:output:audit'], 'node scripts/audit-css-output.mjs');
  assert.ok(steps.indexOf('npm run css:output:audit') > steps.indexOf('astro build'), 'after the build it checks');
  const selftest = await fs.readFile(path.join(root, 'scripts', 'audit-gate-selftest.mjs'), 'utf8');
  assert.match(selftest, /args: \['scripts\/audit-css-output\.mjs', '--dist', scratch\]/);
});
