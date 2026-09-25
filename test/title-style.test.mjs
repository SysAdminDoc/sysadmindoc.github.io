import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { decodeReferences, titleStyleProblem } from '../scripts/lib/title-style.mjs';

const root = process.cwd();
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

test('a title with any dash, or a hyphen between spaces, breaks the rule', () => {
  assert.equal(titleStyleProblem(`Colophon ${EM} Matt Parker`), 'an em dash');
  assert.equal(titleStyleProblem(`2020${EN}2026`), 'an en dash');
  assert.equal(titleStyleProblem('Colophon &mdash; Matt Parker'), 'an em dash', 'a named reference, as a feed carries it');
  assert.equal(titleStyleProblem('A &#8212; B'), 'an em dash');
  assert.equal(titleStyleProblem('A &#x2013; B'), 'an en dash');
  assert.equal(titleStyleProblem(`A ${String.fromCharCode(0x2015)} B`), 'a dash (U+2015)');
  assert.equal(titleStyleProblem('Matt Parker - I build tools'), 'a hyphen between spaces');
  assert.equal(titleStyleProblem(`Matt Parker${String.fromCharCode(0xa0)}-${String.fromCharCode(0xa0)}tools`), 'a hyphen between spaces', 'no-break spaces too');
  assert.equal(titleStyleProblem(`A ${String.fromCharCode(0x2010)} B`), 'a hyphen between spaces');
  // The eighteenth drain review: runs of hyphens and marks that only look
  // like a dash passed.
  assert.equal(titleStyleProblem('Home -- tools'), 'a dash lookalike between spaces (U+002D U+002D)');
  assert.equal(titleStyleProblem(`Home ${String.fromCharCode(0x2212)} tools`), 'a dash lookalike between spaces (U+2212)', 'a minus sign');
  assert.equal(titleStyleProblem(`Home ${String.fromCharCode(0x2796)} tools`), 'a dash lookalike between spaces (U+2796)');
  assert.equal(titleStyleProblem(`Home ${String.fromCharCode(0x2500)} tools`), 'a dash lookalike between spaces (U+2500)', 'a box horizontal');
  assert.equal(titleStyleProblem('Home &minus; tools'), 'a dash lookalike between spaces (U+2212)');
  assert.equal(titleStyleProblem('Home&nbsp;-&nbsp;tools'), 'a hyphen between spaces', 'no-break spaces as a feed spells them');
  assert.equal(titleStyleProblem('Home -'), 'a hyphen between spaces', 'at the end too');
});

test('hyphens joining words, and the site\'s own separators, are fine', () => {
  for (const title of ['Colophon | Matt Parker', 'C# / Desktop | 28 projects by Matt Parker', 'Kotlin-first tools', 'Local-first contact organizer', '-webkit notes', 'x-', `Lows of ${String.fromCharCode(0x2212)}5`, 'x--y']) {
    assert.equal(titleStyleProblem(title), null, title);
  }
  assert.equal(decodeReferences('&amp; &#65; &#x42; &bogus;'), '&amp; A B &bogus;');
});

// The eighteenth drain review: the site writes its feed item titles too
// (catalog names, atom's "(live)" suffix, "project tag" in releases.xml), and
// the manifest, og:site_name and each feed's own title went unread.
test('the audit reads every name the site writes, holds each feed to its link, and build:ci runs it', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'title-style-'));
  const RSS = 'Recent projects | Matt Parker';
  const page = (title, { feedName = RSS, siteName = 'Matt Parker Portfolio' } = {}) =>
    `<!doctype html><html lang="en"><head><title>${title}</title><meta property="og:title" content="${title}"><meta property="og:site_name" content="${siteName}"><link rel="alternate" type="application/rss+xml" title="${feedName}" href="/rss.xml"></head><body><svg><title>An icon ${EM} ignored</title></svg></body></html>`;
  const rss = (title, item) => `<?xml version="1.0"?><rss version="2.0"><channel><title>${title}</title><item><title>${item}</title></item><item><title>Second project</title></item></channel></rss>`;
  const audit = () => spawnSync(process.execPath, [path.join(root, 'scripts', 'audit-title-style.mjs'), '--dist', dist], { cwd: root, encoding: 'utf8', windowsHide: true });
  try {
    fs.writeFileSync(path.join(dist, 'index.html'), page('Matt Parker | Home'));
    fs.mkdirSync(path.join(dist, 'colophon'));
    fs.writeFileSync(path.join(dist, 'colophon', 'index.html'), page('Colophon | Matt Parker'));
    fs.writeFileSync(path.join(dist, 'rss.xml'), rss(RSS, 'ImgConverter (live)'));
    fs.writeFileSync(path.join(dist, 'atom.xml'), '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Recent projects (Atom) | Matt Parker</title><entry><title>One entry</title></entry></feed>');
    fs.writeFileSync(path.join(dist, 'feed.json'), JSON.stringify({ title: 'Recent projects (JSON Feed) | Matt Parker', items: [{ title: 'Kotlin-first tools' }] }));
    fs.writeFileSync(path.join(dist, 'manifest.json'), JSON.stringify({ name: 'Matt Parker | Technical Service Bureau', short_name: 'SysAdminDoc', shortcuts: [{ name: 'Project catalog', short_name: 'Catalog' }] }));
    const clean = audit();
    assert.equal(clean.status, 0, clean.stderr);
    assert.match(clean.stdout, /2 pages, 3 feeds with 4 items and 4 manifest names/);

    fs.writeFileSync(path.join(dist, 'colophon', 'index.html'), page(`Colophon ${EM} Matt Parker`, { feedName: 'Matt Parker - recent projects', siteName: `Matt Parker ${String.fromCharCode(0x2212)} Portfolio` }));
    fs.writeFileSync(path.join(dist, 'rss.xml'), rss('Matt Parker &#8211; projects', 'Old tool &#8212; retired'));
    fs.writeFileSync(path.join(dist, 'atom.xml'), '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Projects | Matt Parker</title><entry><title>Tool&#160;-&#160;beta</title></entry></feed>');
    fs.writeFileSync(path.join(dist, 'index.html'), page('Matt Parker | Home').replace('</head>', '<link rel="alternate" type="application/atom+xml" title="Recent projects (Atom) | Matt Parker" href="/atom.xml"></head>'));
    fs.mkdirSync(path.join(dist, 'about'));
    fs.writeFileSync(path.join(dist, 'about', 'index.html'), page('About | Matt Parker'));
    fs.writeFileSync(path.join(dist, 'manifest.json'), JSON.stringify({ name: 'Matt Parker -- Bureau', short_name: 'SysAdminDoc', shortcuts: [{ name: `Catalog ${String.fromCharCode(0x2500)} all`, short_name: 'Catalog' }] }));
    const planted = audit();
    assert.equal(planted.status, 1);
    const said = planted.stderr;
    assert.match(said, /colophon\/index\.html: <title> "Colophon . Matt Parker" has an em dash/);
    assert.match(said, /colophon\/index\.html: og:title "[^"]*" has an em dash/);
    assert.match(said, /colophon\/index\.html: og:site_name "[^"]*" has a dash lookalike between spaces \(U\+2212\)/);
    assert.match(said, /colophon\/index\.html: the \/rss\.xml link "Matt Parker - recent projects" has a hyphen between spaces/);
    assert.match(said, /rss\.xml: the feed's title "[^"]*" has an en dash/);
    assert.match(said, /rss\.xml: the item title "Old tool &#8212; retired" has an em dash/);
    assert.match(said, /atom\.xml: the item title "[^"]*" has a hyphen between spaces/);
    assert.match(said, /index\.html: the \/atom\.xml link "Recent projects \(Atom\) \| Matt Parker" doesn't match the feed's own title "Projects \| Matt Parker"/);
    assert.match(said, /index\.html and 1 more page\(s\): the \/rss\.xml link "Recent projects \| Matt Parker" doesn't match the feed's own title "Matt Parker &#8211; projects"/, 'once for every page carrying it');
    assert.match(said, /colophon\/index\.html: the \/rss\.xml link "Matt Parker - recent projects" doesn't match/);
    assert.match(said, /manifest\.json: name "Matt Parker -- Bureau" has a dash lookalike between spaces \(U\+002D U\+002D\)/);
    assert.match(said, /manifest\.json: shortcuts\[0\]\.name "[^"]*" has a dash lookalike between spaces \(U\+2500\)/);
    assert.doesNotMatch(said, /An icon/, "an SVG title is not one of the site's names");
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const ci = pkg.scripts['build:ci'];
  assert.equal(pkg.scripts['title-style:audit'], 'node scripts/audit-title-style.mjs');
  assert.ok(ci.indexOf('astro build') < ci.indexOf('npm run title-style:audit'), 'it reads the build');
  assert.ok(ci.indexOf('npm run title-style:audit') < ci.indexOf('npm run gates:selftest'), 'and the self-test proves it after');
});
