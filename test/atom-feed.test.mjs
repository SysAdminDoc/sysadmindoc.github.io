import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('Atom project feed is routed, advertised, cached, and audited', async () => {
  const atom = await fs.readFile(path.join(root, 'src', 'pages', 'atom.xml.ts'), 'utf8');
  const base = await fs.readFile(path.join(root, 'src', 'layouts', 'Base.astro'), 'utf8');
  const endpointsAudit = await fs.readFile(path.join(root, 'scripts', 'audit-public-endpoints.mjs'), 'utf8');
  const feedAudit = await fs.readFile(path.join(root, 'scripts', 'audit-feed.mjs'), 'utf8');
  const smoke = await fs.readFile(path.join(root, 'scripts', 'smoke-live-site.mjs'), 'utf8');
  const llms = await fs.readFile(path.join(root, 'src', 'pages', 'llms.txt.ts'), 'utf8');
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');

  assert.match(atom, /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom" xml:lang="en-US">/);
  assert.match(atom, /endpointHeaders\('application\/atom\+xml; charset=UTF-8'\)/);
  assert.match(atom, /<link href="\$\{site\}\/atom\.xml" rel="self" type="application\/atom\+xml" \/>/);
  assert.match(atom, /<entry>/);
  assert.match(base, /type="application\/atom\+xml" title="Matt Parker . projects \(Atom\)" href="\/atom\.xml"/);
  assert.match(endpointsAudit, /href: '\/atom\.xml', type: 'application\/atom\+xml'/);
  assert.match(endpointsAudit, /route: '\/atom\.xml', file: 'src\/pages\/atom\.xml\.ts'/);
  assert.match(feedAudit, /dist\/atom\.xml/);
  assert.match(feedAudit, /atom\.xml entry count .* must match feed\.json item count/);
  assert.match(smoke, /fetchText\(baseUrl, '\/atom\.xml'/);
  assert.match(smoke, /project Atom entries/);
  assert.match(llms, /\[Atom\]\(\$\{site\}\/atom\.xml\): Standards-based XML project feed/);
  assert.match(sw, /'\/rss\.xml', '\/atom\.xml'/);
});
