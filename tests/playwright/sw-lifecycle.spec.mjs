import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

async function hasRegisteredServiceWorker(page) {
  return page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration('/');
    return Boolean(reg?.active || reg?.waiting || reg?.installing);
  });
}

async function serviceWorkerCachePaths(page) {
  return page.evaluate(async () => {
    const paths = new Set();
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        paths.add(new URL(request.url).pathname);
      }
    }
    return Array.from(paths).sort();
  });
}

async function stubExternalRuntimeRequests(page) {
  await page.route('https://api.github.com/**', (route) =>
    route.fulfill({
      contentType: 'application/json; charset=utf-8',
      body: '[]',
    }),
  );
}

test('service worker installs, caches offline fallback, and survives navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  await expect.poll(() => hasRegisteredServiceWorker(page)).toBe(true);

  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });

  const offlineCached = await page.evaluate(async () => {
    const keys = await caches.keys();
    for (const name of keys) {
      const cache = await caches.open(name);
      const match = await cache.match('/offline.html');
      if (match) return true;
    }
    return false;
  });
  expect(offlineCached).toBe(true);
});

test('service worker precaches Pagefind assets needed for first-install offline search', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);

  const cachedPaths = await serviceWorkerCachePaths(page);
  const requiredPaths = [
    '/pagefind/pagefind-component-ui.css',
    '/pagefind/pagefind-component-ui.js',
    '/pagefind/pagefind-worker.js',
    '/pagefind/pagefind-entry.json',
    '/pagefind/wasm.en.pagefind',
    '/pagefind/pagefind.js',
  ];
  const missingPaths = requiredPaths.filter((entry) => !cachedPaths.includes(entry));

  expect(missingPaths).toEqual([]);
  expect(cachedPaths.some((entry) => /^\/pagefind\/index\/.+\.pf_index$/.test(entry))).toBe(true);
  expect(cachedPaths.some((entry) => /^\/pagefind\/filter\/.+\.pf_filter$/.test(entry))).toBe(true);
  expect(cachedPaths.some((entry) => /^\/pagefind\/fragment\/.+\.pf_fragment$/.test(entry))).toBe(true);
  expect(cachedPaths.some((entry) => /^\/pagefind\/pagefind\..+\.pf_meta$/.test(entry))).toBe(true);
});

test('service worker enables navigation preload when supported', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const preloadState = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!('navigationPreload' in reg)) return 'unsupported';
    const state = await reg.navigationPreload.getState();
    return state.enabled ? 'enabled' : 'disabled';
  });

  expect(preloadState).not.toBe('disabled');
  expect(['enabled', 'unsupported']).toContain(preloadState);
});

for (const route of ['/search/', '/status/', '/lang/powershell/']) {
  test(`service worker registers on direct ${route} landing`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect.poll(() => hasRegisteredServiceWorker(page)).toBe(true);
  });
}

test('offline navigation reaches the offline fallback page', async ({ page, context }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);
  const response = await page.goto('/nonexistent-offline-test/', { waitUntil: 'domcontentloaded' });
  const body = await page.content();
  expect(body).toContain('offline');
  await context.setOffline(false);
});

test('no console errors during service worker lifecycle', async ({ page }) => {
  const errors = [];
  await stubExternalRuntimeRequests(page);
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto('/search/', { waitUntil: 'networkidle' });
  await page.goto('/', { waitUntil: 'networkidle' });

  const swErrors = errors.filter((e) => !e.includes('net::ERR_') && !e.includes('Failed to fetch'));
  expect(swErrors).toEqual([]);
});
