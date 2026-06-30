import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

const root = process.cwd();

test('service worker exposes a local offline navigation fallback', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const html = await fs.readFile(path.join(root, 'public', 'offline.html'), 'utf8');
  const css = await fs.readFile(path.join(root, 'public', 'styles', 'offline.css'), 'utf8');

  assert.match(sw, /const OFFLINE_URL = '\/offline\.html'/);
  // PRECACHE is generated from dist/ at stamp time; verify the placeholder is in place.
  assert.match(sw, /const PRECACHE = __PRECACHE_PLACEHOLDER__/);
  assert.match(sw, /resilientPrecache\(c, PRECACHE\)/);
  assert.doesNotMatch(sw, /\.addAll\(PRECACHE\)/);
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

test('service worker install preserves valid precache entries when one URL fails', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const listeners = new Map();
  const warnings = [];
  const cached = [];
  const script = sw.replace(
    'const PRECACHE = __PRECACHE_PLACEHOLDER__;',
    "const PRECACHE = ['/ok.css', '/missing.css', '/offline.html'];",
  );
  const sandbox = {
    console: {
      warn: (...args) => warnings.push(args.join(' ')),
    },
    caches: {
      open: async () => ({
        add: async (url) => {
          if (url === '/missing.css') throw new Error('not found');
          cached.push(url);
        },
      }),
      keys: async () => [],
      delete: async () => true,
      match: async () => null,
    },
    self: {
      location: { origin: 'https://sysadmindoc.example' },
      clients: { claim: async () => {} },
      skipWaiting: () => {},
      addEventListener: (type, handler) => listeners.set(type, handler),
    },
    setTimeout,
    clearTimeout,
    AbortController,
    Date,
    Error,
    Promise,
    Request,
    Response,
    URL,
    fetch,
  };

  vm.runInNewContext(script, sandbox);
  let installPromise;
  listeners.get('install')({
    waitUntil: (promise) => {
      installPromise = promise;
    },
  });
  await installPromise;

  assert.deepEqual(cached.sort(), ['/offline.html', '/ok.css']);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /\/missing\.css/);
});
