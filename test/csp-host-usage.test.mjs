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
