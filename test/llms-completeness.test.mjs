import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('llms.txt source exposes reviewed pages, language lanes, feeds, and machine endpoints', async () => {
  const source = await fs.readFile(path.join(root, 'src', 'pages', 'llms.txt.ts'), 'utf8');
  const audit = await fs.readFile(path.join(root, 'scripts', 'audit-public-endpoints.mjs'), 'utf8');

  assert.match(source, /interiorOgPages/);
  assert.match(source, /LANGS/);
  assert.match(source, /## Language lanes/);
  assert.match(source, /## Machine-readable endpoints/);
  for (const route of ['/search/', '/releases/', '/feed.json', '/releases.xml', '/resume.json', '/cmdk-data.js', '/sitemap-index.xml', '/llms.txt']) {
    assert.match(audit, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const route of ['/feed.json', '/releases.xml', '/resume.json', '/cmdk-data.js', '/sitemap-index.xml', '/llms.txt']) {
    assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(audit, /Language lanes/);
  assert.match(audit, /Machine-readable endpoints/);
  assert.match(audit, /catalog count must be exact/);
});
