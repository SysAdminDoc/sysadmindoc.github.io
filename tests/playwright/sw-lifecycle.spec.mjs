import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('service worker installs, caches offline fallback, and survives navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const swRegistered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration('/');
    return Boolean(reg?.active || reg?.waiting || reg?.installing);
  });
  expect(swRegistered).toBe(true);

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
