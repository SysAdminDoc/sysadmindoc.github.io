import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

const root = process.cwd();
const noJsRevealCss = '.rv,.card-enter{opacity:1!important;transform:none!important}';

function sha256Csp(value) {
  return `sha256-${crypto.createHash('sha256').update(value.replace(/\r\n?/g, '\n')).digest('base64')}`;
}

test('service worker exposes a local offline navigation fallback', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const html = await fs.readFile(path.join(root, 'public', 'offline.html'), 'utf8');
  const css = await fs.readFile(path.join(root, 'public', 'styles', 'offline.css'), 'utf8');
  const criticalCss = await fs.readFile(path.join(root, 'src', 'styles', 'critical.css'), 'utf8');
  const expectedStyleElem = `style-src-elem 'self' '${sha256Csp(criticalCss)}' '${sha256Csp(noJsRevealCss)}'`;

  assert.match(sw, /const OFFLINE_URL = '\/offline\.html'/);
  // PRECACHE is generated from dist/ at stamp time; verify the placeholder is in place.
  assert.match(sw, /const PRECACHE = __PRECACHE_PLACEHOLDER__/);
  assert.match(sw, /resilientPrecache\(c, PRECACHE\)/);
  assert.doesNotMatch(sw, /\.addAll\(PRECACHE\)/);
  assert.match(sw, /cachedOrOffline\(request, OFFLINE_URL\)/);
  assert.doesNotMatch(sw, /cachedOrOffline\(e\.request, '\/'\)/);
  assert.match(sw, /enableNavigationPreload\(\)/);
  assert.match(sw, /navigationPreload\.enable\(\)/);
  assert.match(sw, /handleNavigation\(e\.request, e\.preloadResponse\)/);
  assert.match(sw, /headers\.set\('sw-cached-at', String\(Date\.now\(\)\)\)/);
  assert.match(sw, /Number\.isFinite\(at\) && at > 0 && Date\.now\(\) - at < CROSS_ORIGIN_TTL/);
  assert.doesNotMatch(sw, /if \(!at \|\| Date\.now\(\) - at < CROSS_ORIGIN_TTL\) return cached/);

  assert.match(html, /<title>Offline - SysAdminDoc Portfolio<\/title>/);
  assert.match(html, /Content-Security-Policy/);
  assert.ok(html.includes(expectedStyleElem));
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

test('service worker activate enables navigation preload when supported', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const listeners = new Map();
  const deleted = [];
  let enabled = false;
  let claimed = false;
  const script = sw.replace(
    'const PRECACHE = __PRECACHE_PLACEHOLDER__;',
    "const PRECACHE = ['/offline.html'];",
  );
  const sandbox = {
    console: { warn: () => {} },
    caches: {
      open: async () => ({ add: async () => {} }),
      keys: async () => ['legacy-cache', 'portfolio-v__BUILD_VERSION__'],
      delete: async (key) => {
        deleted.push(key);
        return true;
      },
      match: async () => null,
    },
    self: {
      location: { origin: 'https://sysadmindoc.example' },
      registration: {
        navigationPreload: {
          enable: async () => {
            enabled = true;
          },
        },
      },
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      skipWaiting: () => {},
      addEventListener: (type, handler) => listeners.set(type, handler),
    },
    setTimeout,
    clearTimeout,
    AbortController,
    Date,
    Error,
    Headers,
    Promise,
    Request,
    Response,
    URL,
    fetch,
  };

  vm.runInNewContext(script, sandbox);
  let activatePromise;
  listeners.get('activate')({
    waitUntil: (promise) => {
      activatePromise = promise;
    },
  });
  await activatePromise;

  assert.equal(enabled, true);
  assert.equal(claimed, true);
  assert.deepEqual(deleted, ['legacy-cache']);
});

test('service worker activate tolerates browsers without navigation preload', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const listeners = new Map();
  let claimed = false;
  const script = sw.replace(
    'const PRECACHE = __PRECACHE_PLACEHOLDER__;',
    "const PRECACHE = ['/offline.html'];",
  );
  const sandbox = {
    console: { warn: () => {} },
    caches: {
      open: async () => ({ add: async () => {} }),
      keys: async () => [],
      delete: async () => true,
      match: async () => null,
    },
    self: {
      location: { origin: 'https://sysadmindoc.example' },
      registration: {},
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      skipWaiting: () => {},
      addEventListener: (type, handler) => listeners.set(type, handler),
    },
    setTimeout,
    clearTimeout,
    AbortController,
    Date,
    Error,
    Headers,
    Promise,
    Request,
    Response,
    URL,
    fetch,
  };

  vm.runInNewContext(script, sandbox);
  let activatePromise;
  listeners.get('activate')({
    waitUntil: (promise) => {
      activatePromise = promise;
    },
  });
  await activatePromise;

  assert.equal(claimed, true);
});

test('service worker navigation handler prefers preload response before fetch', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const listeners = new Map();
  const putBodies = [];
  let fetchCalls = 0;
  const script = sw.replace(
    'const PRECACHE = __PRECACHE_PLACEHOLDER__;',
    "const PRECACHE = ['/offline.html'];",
  );
  const sandbox = {
    console: { warn: () => {} },
    caches: {
      open: async () => ({
        add: async () => {},
        put: async (request, response) => {
          putBodies.push({ url: request.url, body: await response.text() });
        },
      }),
      keys: async () => [],
      delete: async () => true,
      match: async () => null,
    },
    self: {
      location: { origin: 'https://sysadmindoc.example' },
      registration: {},
      clients: { claim: async () => {} },
      skipWaiting: () => {},
      addEventListener: (type, handler) => listeners.set(type, handler),
    },
    setTimeout,
    clearTimeout,
    AbortController,
    Date,
    Error,
    Headers,
    Promise,
    Request,
    Response,
    URL,
    fetch: async () => {
      fetchCalls += 1;
      throw new Error('fetch should not run when preload responds');
    },
  };

  vm.runInNewContext(script, sandbox);
  let responsePromise;
  const request = new Request('https://sysadmindoc.example/preloaded/', {
    headers: { accept: 'text/html' },
  });
  listeners.get('fetch')({
    request,
    preloadResponse: Promise.resolve(new Response('preloaded shell', { status: 200 })),
    respondWith: (promise) => {
      responsePromise = promise;
    },
  });

  const response = await responsePromise;
  assert.equal(await response.text(), 'preloaded shell');
  assert.equal(fetchCalls, 0);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(putBodies, [{ url: 'https://sysadmindoc.example/preloaded/', body: 'preloaded shell' }]);
});

test('service worker navigation handler falls back offline when preload and fetch miss', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const listeners = new Map();
  const script = sw.replace(
    'const PRECACHE = __PRECACHE_PLACEHOLDER__;',
    "const PRECACHE = ['/offline.html'];",
  );
  const sandbox = {
    console: { warn: () => {} },
    caches: {
      open: async () => ({ add: async () => {} }),
      keys: async () => [],
      delete: async () => true,
      match: async (request) => {
        const target = typeof request === 'string' ? request : new URL(request.url).pathname;
        if (target === '/offline.html') return new Response('offline shell', { status: 200 });
        return null;
      },
    },
    self: {
      location: { origin: 'https://sysadmindoc.example' },
      registration: {},
      clients: { claim: async () => {} },
      skipWaiting: () => {},
      addEventListener: (type, handler) => listeners.set(type, handler),
    },
    setTimeout,
    clearTimeout,
    AbortController,
    Date,
    Error,
    Headers,
    Promise,
    Request,
    Response,
    URL,
    fetch: async () => {
      throw new Error('offline');
    },
  };

  vm.runInNewContext(script, sandbox);
  let responsePromise;
  const request = new Request('https://sysadmindoc.example/offline-test/', {
    headers: { accept: 'text/html' },
  });
  listeners.get('fetch')({
    request,
    preloadResponse: Promise.resolve(undefined),
    respondWith: (promise) => {
      responsePromise = promise;
    },
  });

  const response = await responsePromise;
  assert.equal(await response.text(), 'offline shell');
});
