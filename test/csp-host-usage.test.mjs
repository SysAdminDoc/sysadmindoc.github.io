import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { collectHostReferences, parseHostSource, unusedHostSources } from '../scripts/lib/csp-host-usage.mjs';

const root = process.cwd();

function parseCsp(policy) {
  return new Map(policy.split(';').map((part) => part.trim().split(/\s+/)).filter((tokens) => tokens[0]).map(([name, ...tokens]) => [name, tokens]));
}

test('host sources are told apart from keywords and schemes', () => {
  for (const token of ["'self'", "'none'", "'wasm-unsafe-eval'", "'sha256-abc='", 'data:', 'blob:', 'https:', '*']) {
    assert.equal(parseHostSource(token), null, token);
  }
  const exact = parseHostSource('https://cdn.example.com:443/path/');
  assert.equal(exact.matches('cdn.example.com'), true);
  assert.equal(exact.matches('evil-cdn.example.com'), false);
  const wildcard = parseHostSource('*.example.com');
  assert.equal(wildcard.matches('a.example.com'), true);
  assert.equal(wildcard.matches('example.com'), false);
});

test('a host counts only when something of its kind loads from it', async (t) => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'csp-host-usage-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const policy = [
    "default-src 'self' https://any.example",
    "img-src 'self' data: https://img.example https://links.example https://css-img.example",
    "font-src 'self' https://fonts.example",
    "connect-src 'self' https://api.example",
    'frame-src https://frames.example',
    "script-src 'self' https://cdn.example",
  ].join('; ');
  await fs.mkdir(path.join(dist, '_assets'));
  await fs.writeFile(
    path.join(dist, 'index.html'),
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}">` +
      '<script src="https://cdn.example/lib.js"></script>' +
      '<style>.hero{background:url("https://css-img.example/bg.png")}</style></head><body>' +
      '<img src="https://img.example/a.png" alt="">' +
      '<a href="https://links.example/profile">a link is not an image</a>' +
      '<iframe src="https://frames.example/embed"></iframe></body></html>',
  );
  await fs.writeFile(path.join(dist, '_assets', 'app.js'), "fetch('https://api.example/v1/items');\n");
  await fs.writeFile(path.join(dist, '_assets', 'site.css'), "@font-face{src:url(https://fonts.example/x.woff2)}\n");

  const unused = unusedHostSources(parseCsp(policy), await collectHostReferences(dist));
  assert.deepEqual(unused, [
    { directive: 'default-src', token: 'https://any.example' },
    { directive: 'img-src', token: 'https://links.example' },
  ]);
});

// The second drain review's crafted inputs, 2026-09-23: some kept a host
// alive that nothing loaded that way, others reported a host unused that was.
test('each resource is matched to the directive that governs it', async (t) => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'csp-host-kinds-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const policy = [
    "default-src 'self'",
    "img-src 'self' https://srcset.example https://imageset.example https://font-only.example https://commented.example",
    "font-src 'self' https://font-only.example",
    "connect-src 'self' https://ping.example https://link-data.example https://api.example",
    "script-src 'self' https://link-data.example",
    "media-src 'self' https://video.example",
    "form-action 'self' https://formaction.example",
    "base-uri 'self' https://base.example",
  ].join('; ');
  await fs.mkdir(path.join(dist, '_assets'));
  await fs.writeFile(
    path.join(dist, 'index.html'),
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}">` +
      '<base href="https://base.example/">' +
      '<link rel="preload" as="image" imagesrcset="https://srcset.example/a.png 1x, https://srcset.example/a2.png 2x">' +
      '<link rel="preload" as="video" href="https://video.example/clip.mp4">' +
      '<style>.hero{background-image:image-set("https://imageset.example/bg.avif" type("image/avif") 1x)}' +
      '@font-face{font-family:x;src:url(https://font-only.example/x.woff2)}</style></head><body>' +
      '<!-- <img src="https://commented.example/old.png"> -->' +
      '<a href="/" ping="https://ping.example/collect">home</a>' +
      '<form><button formaction="https://formaction.example/submit">send</button></form></body></html>',
  );
  // Link data: the host appears in a script, but nothing loads from it.
  await fs.writeFile(path.join(dist, '_assets', 'data.js'), "export const links = ['https://link-data.example/repo'];\nfetch('https://api.example/v1');\n");

  const unused = unusedHostSources(parseCsp(policy), await collectHostReferences(dist));
  assert.deepEqual(unused, [
    { directive: 'img-src', token: 'https://font-only.example' },
    { directive: 'img-src', token: 'https://commented.example' },
    { directive: 'connect-src', token: 'https://link-data.example' },
    { directive: 'script-src', token: 'https://link-data.example' },
  ]);
});

// The fifth drain review's inputs, 2026-09-23: an https: source was counted as
// used by a wss:// socket, which CSP doesn't allow, and the markup rules ran
// over inline script text, where a '<template' string could swallow the real
// markup after it.
test('a source that names its scheme matches only what CSP allows, and script text is not markup', async (t) => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'csp-host-review5-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const policy = [
    "default-src 'self'",
    "connect-src 'self' https://sock.example wss://sock2.example",
    "img-src 'self' https://inscript.example https://after.example",
  ].join('; ');
  await fs.mkdir(path.join(dist, '_assets'));
  await fs.writeFile(
    path.join(dist, 'index.html'),
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body>` +
      `<script>const tpl = '<template><img src="https://inscript.example/a.png">'; const q = "it's";</script>` +
      '<img src="https://after.example/b.png">' +
      '<template><p>later</p></template>' +
      '</body></html>',
  );
  await fs.writeFile(path.join(dist, '_assets', 'live.js'), "new WebSocket('wss://sock.example/feed');\nfetch('https://sock2.example/data');\n");

  const unused = unusedHostSources(parseCsp(policy), await collectHostReferences(dist));
  assert.deepEqual(unused, [
    { directive: 'connect-src', token: 'https://sock.example' },
    { directive: 'img-src', token: 'https://inscript.example' },
  ]);
});

// The third drain review's inputs, 2026-09-23: a wss:// socket never counted,
// an unquoted @import url() counted as an image, markup inside <template> and
// <textarea> counted, and a '>' in a quoted alt hid the src after it.
test('a socket, an unquoted @import, inert markup and a quoted > are each read for what they load', async (t) => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'csp-host-review3-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const policy = [
    "default-src 'self'",
    "connect-src 'self' wss://socket.example",
    "style-src 'self' https://styles.example",
    "img-src 'self' https://styles.example https://inert.example https://quoted.example",
  ].join('; ');
  await fs.mkdir(path.join(dist, '_assets'));
  await fs.writeFile(
    path.join(dist, 'index.html'),
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body>` +
      '<template><img src="https://inert.example/a.png"></template>' +
      '<textarea><img src="https://inert.example/b.png"></textarea>' +
      '<img alt="a > b" src="https://quoted.example/c.png">' +
      '</body></html>',
  );
  await fs.writeFile(path.join(dist, '_assets', 'live.js'), "const socket = new WebSocket('wss://socket.example/feed');\n");
  await fs.writeFile(path.join(dist, '_assets', 'site.css'), '@import url(https://styles.example/base.css);\n');

  const unused = unusedHostSources(parseCsp(policy), await collectHostReferences(dist));
  assert.deepEqual(unused, [
    { directive: 'img-src', token: 'https://styles.example' },
    { directive: 'img-src', token: 'https://inert.example' },
  ]);
});

// The sixth drain review: comments were stripped from the raw HTML before the
// scripts came out, so a '<!--' in a script's string swallowed the markup up to
// the next '-->', and script text inside <template> counted as a real script.
test('a comment opener in script text hides nothing, and script text in a template loads nothing', async (t) => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'csp-host-review6-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const policy = [
    "default-src 'self'",
    "connect-src 'self' https://templated.example",
    "img-src 'self' https://after.example https://commented.example",
  ].join('; ');
  await fs.mkdir(path.join(dist, '_assets'));
  await fs.writeFile(
    path.join(dist, 'index.html'),
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body>` +
      '<script>const marker = "<!--";</script>' +
      '<img src="https://after.example/b.png">' +
      '<!-- <img src="https://commented.example/c.png"> -->' +
      '<template><script>fetch("https://templated.example/api");</script></template>' +
      '</body></html>',
  );

  const unused = unusedHostSources(parseCsp(policy), await collectHostReferences(dist));
  assert.deepEqual(unused, [
    { directive: 'connect-src', token: 'https://templated.example' },
    { directive: 'img-src', token: 'https://commented.example' },
  ]);
});

// The eighth drain review: the hand-written tokenizer let <!--> and <!--->
// hide the markup after them, counted hosts in double-escaped script text,
// nested <template>, <xmp> and <noframes>, and let a tag opener in an
// attribute value swallow the rest of the page. The audit now reads the tree
// parse5 builds, which tokenizes as the HTML standard does.
test('built HTML is read the way a browser tokenizes it, corner cases included', async (t) => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'csp-host-review8-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const hosts = ['after-empty', 'after-dash', 'double-escaped', 'nested', 'xmp', 'noframes', 'attr-first', 'attr-later', 'noscript'];
  const policy = ["default-src 'self'", `img-src 'self' ${hosts.map((host) => `https://${host}.example`).join(' ')}`].join('; ');
  const img = (host) => `<img src="https://${host}.example/a.png">`;
  await fs.mkdir(path.join(dist, '_assets'));
  await fs.writeFile(
    path.join(dist, 'index.html'),
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body>` +
      `<!-->${img('after-empty')}` +
      `<!--->${img('after-dash')}` +
      `<script><!--<script></script>${img('double-escaped')}</script>` +
      `<template><template></template>${img('nested')}</template>` +
      `<xmp>${img('xmp')}</xmp><noframes>${img('noframes')}</noframes>` +
      `<img alt="<script" src="https://attr-first.example/a.png">${img('attr-later')}` +
      `<noscript>${img('noscript')}</noscript>` +
      '</body></html>',
  );

  const unused = unusedHostSources(parseCsp(policy), await collectHostReferences(dist));
  assert.deepEqual(
    unused.map((entry) => entry.token),
    ['https://double-escaped.example', 'https://nested.example', 'https://xmp.example', 'https://noframes.example'],
    'loaded: after <!--> and <!--->, both images around a <script in a value, and what <noscript> loads without JavaScript',
  );
});

test('the dist audit fails on an allowed host nothing loads, and passes once it is gone', async (t) => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'csp-host-audit-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const page = (imgSrc) =>
    '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="' +
    [`default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `style-src-elem 'self'`, `style-src-attr 'none'`, imgSrc, `form-action 'self'`].join('; ') +
    '"></head><body><img src="/local.png" alt=""></body></html>';
  const audit = () => spawnSync(process.execPath, [path.join(root, 'scripts', 'audit-csp.mjs'), '--dist', dist, '--strict'], { cwd: root, encoding: 'utf8' });

  await fs.writeFile(path.join(dist, 'index.html'), page("img-src 'self' data: https://stale-cdn.example"));
  const stale = audit();
  assert.equal(stale.status, 1);
  assert.match(stale.stdout, /allowed host sources no built file loads from: 1/);
  assert.match(stale.stderr, /1 allowed host source\(s\) are loaded by no built file: img-src https:\/\/stale-cdn\.example/);

  await fs.writeFile(path.join(dist, 'index.html'), page("img-src 'self' data:"));
  const clean = audit();
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /allowed host sources no built file loads from: 0/);
});
