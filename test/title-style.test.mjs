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
});

test('hyphens joining words, and the site\'s own separators, are fine', () => {
  for (const title of ['Colophon | Matt Parker', 'C# / Desktop | 28 projects by Matt Parker', 'Kotlin-first tools', 'Local-first contact organizer', '-webkit notes', 'x-']) {
    assert.equal(titleStyleProblem(title), null, title);
  }
  assert.equal(decodeReferences('&amp; &#65; &#x42; &bogus;'), '&amp; A B &bogus;');
});

test('the audit reads built titles, og and twitter titles, feed links and feed names, and build:ci runs it', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'title-style-'));
  const page = (title, feedName = 'Recent projects | Matt Parker') =>
    `<!doctype html><html lang="en"><head><title>${title}</title><meta property="og:title" content="${title}"><link rel="alternate" type="application/rss+xml" title="${feedName}" href="/rss.xml"></head><body><svg><title>An icon ${EM} ignored</title></svg></body></html>`;
  const audit = () => spawnSync(process.execPath, [path.join(root, 'scripts', 'audit-title-style.mjs'), '--dist', dist], { cwd: root, encoding: 'utf8', windowsHide: true });
  try {
    fs.writeFileSync(path.join(dist, 'index.html'), page('Matt Parker | Home'));
    fs.mkdirSync(path.join(dist, 'colophon'));
    fs.writeFileSync(path.join(dist, 'colophon', 'index.html'), page('Colophon | Matt Parker'));
    fs.writeFileSync(path.join(dist, 'rss.xml'), '<?xml version="1.0"?><rss version="2.0"><channel><title>Matt Parker | Recent projects</title><item><title>A release &#8212; named on GitHub</title></item></channel></rss>');
    fs.writeFileSync(path.join(dist, 'feed.json'), JSON.stringify({ title: 'Matt Parker | Projects', items: [{ title: `Item ${EM} left alone` }] }));
    const clean = audit();
    assert.equal(clean.status, 0, clean.stderr);
    assert.match(clean.stdout, /2 pages and 2 feeds/);

    fs.writeFileSync(path.join(dist, 'colophon', 'index.html'), page(`Colophon ${EM} Matt Parker`, 'Matt Parker - recent projects'));
    fs.writeFileSync(path.join(dist, 'rss.xml'), '<?xml version="1.0"?><rss version="2.0"><channel><title>Matt Parker &#8211; projects</title></channel></rss>');
    const planted = audit();
    assert.equal(planted.status, 1);
    assert.match(planted.stderr, /colophon\/index\.html: <title> "Colophon . Matt Parker" has an em dash/);
    assert.match(planted.stderr, /colophon\/index\.html: og:title "[^"]*" has an em dash/);
    assert.match(planted.stderr, /colophon\/index\.html: the \/rss\.xml link "Matt Parker - recent projects" has a hyphen between spaces/);
    assert.match(planted.stderr, /rss\.xml: the feed's title "[^"]*" has an en dash/);
    assert.doesNotMatch(planted.stderr, /An icon|left alone|named on GitHub/, 'an SVG title and feed items are not the site\'s names');
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const ci = pkg.scripts['build:ci'];
  assert.equal(pkg.scripts['title-style:audit'], 'node scripts/audit-title-style.mjs');
  assert.ok(ci.indexOf('astro build') < ci.indexOf('npm run title-style:audit'), 'it reads the build');
  assert.ok(ci.indexOf('npm run title-style:audit') < ci.indexOf('npm run gates:selftest'), 'and the self-test proves it after');
});
