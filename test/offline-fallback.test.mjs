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
  assert.match(sw, /e\.waitUntil\(putTimestamped\(e\.request, response\.clone\(\)\)\)/);
  assert.match(sw, /e\.waitUntil\(fetchPromise\.catch\(\(\) => \{\}\)\)/);
  assert.match(sw, /headers\.set\('sw-cached-at', String\(Date\.now\(\)\)\)/);
  assert.match(sw, /Number\.isFinite\(at\) && at > 0 && Date\.now\(\) - at < CROSS_ORIGIN_TTL/);
  assert.doesNotMatch(sw, /if \(!at \|\| Date\.now\(\) - at < CROSS_ORIGIN_TTL\) return cached/);

  assert.match(html, /<title>Offline \| SysAdminDoc Portfolio<\/title>/);
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
  /** @type {Promise<Response> | undefined} */
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
  assert.ok(response);
  assert.equal(await response.text(), 'preloaded shell');
  assert.equal(fetchCalls, 0);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(putBodies, [{ url: 'https://sysadmindoc.example/preloaded/', body: 'preloaded shell' }]);
});

test('service worker navigation handler prefers a fresh deploy over a cached document', async () => {
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
      match: async (request) => {
        const url = typeof request === 'string' ? request : request.url;
        if (url === 'https://sysadmindoc.example/') {
          return new Response('previous deploy', { status: 200 });
        }
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
      fetchCalls += 1;
      return new Response('current deploy', { status: 200 });
    },
  };

  vm.runInNewContext(script, sandbox);
  /** @type {Promise<Response> | undefined} */
  let responsePromise;
  const request = new Request('https://sysadmindoc.example/', {
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
  assert.ok(response);
  assert.equal(await response.text(), 'current deploy');
  assert.equal(fetchCalls, 1);
  assert.deepEqual(putBodies, [{ url: 'https://sysadmindoc.example/', body: 'current deploy' }]);
});

test('service worker keeps a same-origin revalidation write alive past the cached response', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const listeners = new Map();
  const puts = [];
  /** @type {(() => void) | undefined} */
  let resolveFetch;
  /** @type {Promise<void>} */
  const fetchGate = new Promise((resolve) => {
    resolveFetch = resolve;
  });
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
          puts.push({ url: request.url, body: await response.text() });
        },
      }),
      keys: async () => [],
      delete: async () => true,
      match: async (request) => {
        const url = typeof request === 'string' ? request : request.url;
        if (url.includes('/scripts/app.js')) return new Response('cached-body', { status: 200 });
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
      await fetchGate;
      return new Response('fresh-body', { status: 200 });
    },
  };

  vm.runInNewContext(script, sandbox);
  /** @type {Promise<Response> | undefined} */
  let responsePromise;
  const waited = [];
  const request = new Request('https://sysadmindoc.example/scripts/app.js');
  listeners.get('fetch')({
    request,
    preloadResponse: Promise.resolve(undefined),
    respondWith: (promise) => {
      responsePromise = promise;
    },
    waitUntil: (promise) => {
      waited.push(promise);
    },
  });

  const response = await responsePromise;
  assert.ok(response);
  assert.equal(await response.text(), 'cached-body');
  // The network is still gated, so the background write has not happened yet,
  // but it must be registered on the event lifetime rather than left detached.
  assert.equal(puts.length, 0);
  assert.equal(waited.length, 1);

  assert.ok(resolveFetch);
  resolveFetch();
  await Promise.all(waited);
  assert.deepEqual(puts, [{ url: 'https://sysadmindoc.example/scripts/app.js', body: 'fresh-body' }]);
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
  /** @type {Promise<Response> | undefined} */
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
  assert.ok(response);
  assert.equal(await response.text(), 'offline shell');
});

test('cross-origin API fetch caches a timestamped response on success', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const listeners = new Map();
  const cacheStore = new Map();
  const script = sw.replace(
    'const PRECACHE = __PRECACHE_PLACEHOLDER__;',
    "const PRECACHE = [];",
  );
  const sandbox = {
    console: { warn: () => {} },
    caches: {
      open: async () => ({
        add: async () => {},
        put: async (req, res) => {
          const url = typeof req === 'string' ? req : req.url;
          cacheStore.set(url, res);
        },
      }),
      keys: async () => [],
      delete: async () => true,
      match: async () => null,
    },
    self: {
      location: { origin: 'https://sysadmindoc.example' },
      registration: { navigationPreload: { enable: async () => {} } },
      clients: { claim: async () => {} },
      skipWaiting: () => {},
      addEventListener: (type, handler) => listeners.set(type, handler),
    },
    setTimeout,
    clearTimeout,
    AbortController,
    Blob,
    Date,
    Error,
    Headers,
    Number,
    Promise,
    Request,
    Response,
    URL,
    fetch: async () => new Response('{"stars":42}', {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
    }),
  };

  vm.runInNewContext(script, sandbox);
  let activatePromise;
  listeners.get('activate')({ waitUntil: (p) => { activatePromise = p; } });
  await activatePromise;

  /** @type {Promise<Response> | undefined} */
  let responsePromise;
  const waitUntilPromises = [];
  const request = new Request('https://api.github.com/repos/test/test');
  listeners.get('fetch')({
    request,
    respondWith: (p) => { responsePromise = p; },
    waitUntil: (p) => { waitUntilPromises.push(p); },
  });

  const response = await responsePromise;
  assert.ok(response);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"stars":42}');
  await Promise.all(waitUntilPromises);

  const cachedResponse = cacheStore.get(request.url);
  assert.ok(cachedResponse, 'response should be cached');
  const cachedAt = Number(cachedResponse.headers.get('sw-cached-at'));
  assert.ok(Number.isFinite(cachedAt) && cachedAt > 0, 'sw-cached-at should be a positive timestamp');
  assert.ok(Date.now() - cachedAt < 5000, 'sw-cached-at should be recent');
});

test('cross-origin API fetch serves a fresh cached response when network fails', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const listeners = new Map();
  const freshTimestamp = String(Date.now() - 1000);
  const script = sw.replace(
    'const PRECACHE = __PRECACHE_PLACEHOLDER__;',
    "const PRECACHE = [];",
  );
  const sandbox = {
    console: { warn: () => {} },
    caches: {
      open: async () => ({ add: async () => {} }),
      keys: async () => [],
      delete: async () => true,
      match: async () => new Response('{"cached":true}', {
        status: 200,
        headers: { 'sw-cached-at': freshTimestamp },
      }),
    },
    self: {
      location: { origin: 'https://sysadmindoc.example' },
      registration: { navigationPreload: { enable: async () => {} } },
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
    Number,
    Promise,
    Request,
    Response,
    URL,
    fetch: async () => { throw new Error('network down'); },
  };

  vm.runInNewContext(script, sandbox);
  let activatePromise;
  listeners.get('activate')({ waitUntil: (p) => { activatePromise = p; } });
  await activatePromise;

  /** @type {Promise<Response> | undefined} */
  let responsePromise;
  listeners.get('fetch')({
    request: new Request('https://api.github.com/repos/test/test'),
    respondWith: (p) => { responsePromise = p; },
    waitUntil: () => {},
  });

  const response = await responsePromise;
  assert.ok(response);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"cached":true}');
});

test('cross-origin API fetch returns offline when cache is stale and network fails', async () => {
  const sw = await fs.readFile(path.join(root, 'public', 'sw.js'), 'utf8');
  const listeners = new Map();
  const staleTimestamp = String(Date.now() - 25 * 60 * 60 * 1000);
  const script = sw.replace(
    'const PRECACHE = __PRECACHE_PLACEHOLDER__;',
    "const PRECACHE = [];",
  );
  const sandbox = {
    console: { warn: () => {} },
    caches: {
      open: async () => ({ add: async () => {} }),
      keys: async () => [],
      delete: async () => true,
      match: async () => new Response('{"stale":true}', {
        status: 200,
        headers: { 'sw-cached-at': staleTimestamp },
      }),
    },
    self: {
      location: { origin: 'https://sysadmindoc.example' },
      registration: { navigationPreload: { enable: async () => {} } },
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
    Number,
    Promise,
    Request,
    Response,
    URL,
    fetch: async () => { throw new Error('network down'); },
  };

  vm.runInNewContext(script, sandbox);
  let activatePromise;
  listeners.get('activate')({ waitUntil: (p) => { activatePromise = p; } });
  await activatePromise;

  /** @type {Promise<Response> | undefined} */
  let responsePromise;
  listeners.get('fetch')({
    request: new Request('https://api.github.com/repos/test/test'),
    respondWith: (p) => { responsePromise = p; },
    waitUntil: () => {},
  });

  const response = await responsePromise;
  assert.ok(response);
  assert.equal(response.status, 503);
  assert.equal(await response.text(), 'Offline');
});
