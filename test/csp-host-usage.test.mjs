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
