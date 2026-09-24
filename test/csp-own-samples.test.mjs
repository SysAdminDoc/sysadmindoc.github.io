import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { decodeOwnSamples } from '../deploy/vps/csp-report-server.mjs';
import { encodeOwnSamples, inlineSampleStarts, ownInlineSamples } from '../scripts/lib/csp-own-samples.mjs';

const root = process.cwd();

test('the start of every inline style and script in a page is the site\'s own sample', () => {
  const html =
    '<!doctype html><html><head><style>:root{--bg:#050913;--bg2:#0b1220;--bg3:#111c2f;--glass:rgba(9,16,29,.52)}</style>' +
    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person"}</script>' +
    '<script src="/scripts/app.js">text a browser never runs</script>' +
    '<noscript><style>.rv,.card-enter{opacity:1!important;transform:none!important}</style></noscript>' +
    '</head><body><script>\r\n  window.x = 1;</script><style>   </style></body></html>';
  assert.deepEqual(inlineSampleStarts(html), [
    ':root{--bg:#050913;--bg2:#0b1220;--bg3:#',
    '{"@context":"https://schema.org","@type"',
    '.rv,.card-enter{opacity:1!important;tran',
    '\n  window.x = 1;',
  ]);
});

test('a build yields each distinct start once, and they reach the sink intact', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-own-samples-'));
  try {
    fs.mkdirSync(path.join(dist, 'a'));
    fs.writeFileSync(path.join(dist, 'index.html'), '<style>body{margin:0}</style><style>p{color:red}</style>');
    fs.writeFileSync(path.join(dist, 'a', 'index.html'), '<style>body{margin:0}</style>');
    fs.writeFileSync(path.join(dist, 'a', 'notes.txt'), '<style>ignored{}</style>');
    const samples = ownInlineSamples(dist);
    assert.deepEqual(samples, ['body{margin:0}', 'p{color:red}']);
    const encoded = encodeOwnSamples(samples);
    assert.match(encoded, /^[A-Za-z0-9_-]+$/, 'safe in an env file');
    assert.deepEqual(decodeOwnSamples(encoded), samples);
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }
});

test('the deploy writes the samples beside the policy, and compose hands them to the sink', () => {
  const deploy = fs.readFileSync(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  assert.match(deploy, /const ownSamples = encodeOwnSamples\(ownInlineSamples\(distDir\)\);/);
  assert.match(deploy, /`CSP_POLICY="\$\{policy\}"\\nCSP_OWN_SAMPLES=\$\{ownSamples\}\\n`/);
  const compose = fs.readFileSync(path.join(root, 'deploy', 'vps', 'docker-compose.yml'), 'utf8');
  const reporter = compose.match(/container_name: portfolio-csp-reporter[\s\S]*?\n {2}\w/)?.[0] ?? '';
  assert.match(reporter, /CSP_OWN_SAMPLES: \$\{CSP_OWN_SAMPLES:\?/);
  assert.match(reporter, /- \.\/csp-reports:\/var\/lib\/csp-reports\n/, 'the key is kept in the store volume, which is writable');
});
