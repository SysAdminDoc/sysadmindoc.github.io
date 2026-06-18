import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('service worker exposes a local offline navigation fallback', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const html = await fs.readFile(path.join(root, 'public', 'offline.html'), 'utf8');
  const css = await fs.readFile(path.join(root, 'public', 'styles', 'offline.css'), 'utf8');

  assert.match(sw, /const OFFLINE_URL = '\/offline\.html'/);
  // PRECACHE is generated from dist/ at stamp time; verify the placeholder is in place.
  assert.match(sw, /const PRECACHE = __PRECACHE_PLACEHOLDER__/);
  assert.match(sw, /cachedOrOffline\(e\.request, OFFLINE_URL\)/);
  assert.doesNotMatch(sw, /cachedOrOffline\(e\.request, '\/'\)/);
  assert.match(sw, /headers\.set\('sw-cached-at', String\(Date\.now\(\)\)\)/);
  assert.match(sw, /Number\.isFinite\(at\) && at > 0 && Date\.now\(\) - at < CROSS_ORIGIN_TTL/);
  assert.doesNotMatch(sw, /if \(!at \|\| Date\.now\(\) - at < CROSS_ORIGIN_TTL\) return cached/);

  assert.match(html, /<title>Offline - SysAdminDoc Portfolio<\/title>/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /href="\/styles\/offline\.css"/);
  assert.match(html, /href="">Retry this page<\/a>/);
  assert.match(html, /data-pagefind-ignore/);
  assert.doesNotMatch(html, /\b(?:src|href)=["']https?:\/\//);
  assert.doesNotMatch(html, /<script\b/i);

  assert.match(css, /\.offline-panel/);
  assert.match(css, /prefers-color-scheme/);
});
