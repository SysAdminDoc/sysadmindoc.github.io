import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { decodeOwnSamples, storedSample } from '../deploy/vps/csp-report-server.mjs';
import { encodeOwnSamples, inlineSampleStarts, ownInlineSamples } from '../scripts/lib/csp-own-samples.mjs';

const root = process.cwd();

test('the start of every inline style and script in a page is the site\'s own sample, trimmed', () => {
  const tokens = ':root{--bg:#050913;--bg2:#0b1220;--bg3:#111c2f;--glass:rgba(9,16,29,.52)}';
  const jsonLd = '{"@context":"https://schema.org","@type":"Person"}';
  const reveal = '.rv,.card-enter{opacity:1!important;transform:none!important}';
  const html =
    `<!doctype html><html><head><style>${tokens}</style>` +
    `<script type="application/ld+json">${jsonLd}</script>` +
    '<script src="/scripts/app.js">text a browser never runs</script>' +
    `<noscript><style>${reveal}</style></noscript>` +
    '</head><body><script>\r\n  window.x = 1;</script><style>   </style></body></html>';
  assert.deepEqual(inlineSampleStarts(html), [tokens.slice(0, 64), jsonLd.slice(0, 64), reveal.slice(0, 64), 'window.x = 1;']);
});

// The nineteenth drain review: each engine sends the site's own blocks its own
// way, and Firefox's and Chromium's shapes were stored as [other].
test("each engine's sample of the site's own block is kept as the site's own", () => {
  const block = '\n  .rv,.card-enter{opacity:1!important;transform:none!important}\n';
  const own = inlineSampleStarts(`<style>${block}</style>`);
  const ellipsis = String.fromCharCode(0x2026);
  const raw40 = block.slice(0, 40);
  const shapes = {
    webkit: raw40,
    firefox: `${raw40}${ellipsis}`,
    chromium: raw40.trim(),
    'chromium, trimmed first': block.trim().slice(0, 40),
  };
  for (const [engine, sample] of Object.entries(shapes)) {
    assert.equal(storedSample(sample, { ownSamples: own }), sample.replace(ellipsis, '').trim(), engine);
  }
  assert.equal(storedSample(`jane@example.com${ellipsis}`, { ownSamples: own }), '[other]');
  assert.equal(storedSample(`   ${ellipsis}`, { ownSamples: own }), '[other]', 'nothing left once read');
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
