// Focused cross-engine smoke: the audit/visual matrix is Chromium-only, so this
// spec exercises the core interaction contracts in Firefox and WebKit without
// re-running the visual-baseline matrix. It asserts the engine-agnostic
// behavior — navigation, the command-palette dialog, catalog filtering, theme
// persistence, and no console errors or horizontal overflow at 390px/1440px.
import { expect, test } from '@playwright/test';

function collectRuntimeErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function prepare(page, path, ready = 'main') {
  await page.route('https://api.github.com/**', (route) =>
    route.fulfill({ contentType: 'application/json; charset=utf-8', body: '[]' }),
  );
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>disabled</title>' }),
  );
  await page.goto(path, { waitUntil: 'load' });
  await page.locator('main').waitFor({ state: 'visible' });
  await page.locator(ready).first().waitFor({ state: 'visible' });
}

async function overflow(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body?.scrollWidth ?? 0) - root.clientWidth;
  });
}

test('same-origin navigation and layout hold at desktop width', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page, '/', '#hero');
  expect(await overflow(page)).toBeLessThanOrEqual(1);

  await page.locator('#nav a[href="/ai/"]').first().click();
  await expect(page).toHaveURL(/\/ai\/$/);
  await expect(page.locator('main.aisvc-page')).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('command palette dialog opens, filters, and closes on Escape', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page, '/', '#hero');

  await page.locator('#cmdkToggle').click();
  await expect(page.locator('#cmdk')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(document.getElementById('cmdk')?.open))).toBe(true);

  await page.locator('#cmdkInput').fill('python');
  await expect(page.locator('#cmdkList .cmdk-item').first()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => Boolean(document.getElementById('cmdk')?.open))).toBe(false);
  expect(errors).toEqual([]);
});

test('catalog category filter persists across reload', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page, '/catalog/', '#catalog');

  const filterBtn = page.locator('.fb[data-filter]:not([data-filter="all"])').first();
  if (!(await filterBtn.count())) {
    test.skip(true, 'No category filters in this build');
    return;
  }
  const category = await filterBtn.getAttribute('data-filter');
  await filterBtn.click();
  await expect.poll(() => page.url()).toContain(`cat=${category}`);

  await page.reload({ waitUntil: 'load' });
  await page.locator('#catalog').waitFor({ state: 'visible' });
  await expect(page.locator(`.fb[data-filter="${category}"].act`)).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('theme choice persists across navigation', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page, '/', '#hero');

  const initial = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.locator('#themeToggle').click();
  const toggled = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(toggled).not.toBe(initial);

  await page.reload({ waitUntil: 'load' });
  await page.locator('main').waitFor({ state: 'visible' });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
    .toBe(toggled);
  expect(errors).toEqual([]);
});

test('no horizontal overflow on the mobile viewport', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await prepare(page, '/', '#hero');
  expect(await overflow(page)).toBeLessThanOrEqual(1);

  await prepare(page, '/catalog/', '#catalog');
  expect(await overflow(page)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
