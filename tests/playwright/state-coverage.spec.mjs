import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Axe + overflow coverage for the error/recovery pages and high-risk interaction
// states that the first-viewport route audits do not reach: 404, the offline
// shell, print media, the open mobile navigation, and the empty catalog result
// set. Runs under both the dark and light audit projects.

const stableNow = Date.parse('2026-06-04T12:00:00Z');

async function prepare(page, path, ready = 'main') {
  await page.route('https://api.github.com/**', (route) =>
    route.fulfill({ contentType: 'application/json; charset=utf-8', body: '[]' }),
  );
  await page.addInitScript((now) => {
    const RealDate = Date;
    class FixedDate extends RealDate {
      constructor(...args) {
        return args.length === 0 ? new RealDate(now) : new RealDate(...args);
      }
      static now() {
        return now;
      }
    }
    FixedDate.parse = RealDate.parse;
    FixedDate.UTC = RealDate.UTC;
    Object.setPrototypeOf(FixedDate, RealDate);
    window.Date = FixedDate;
  }, stableNow);
  // Seed the theme preference to match the project's emulated color scheme so
  // the dark project genuinely exercises dark and the light project light.
  await page.addInitScript(() => {
    try {
      const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      localStorage.setItem('theme-pref', dark ? 'dark' : 'light');
    } catch (error) {
      /* storage unavailable */
    }
  });
  await page.goto(path, { waitUntil: 'load' });
  await page.locator('main').first().waitFor({ state: 'visible' });
  if (ready !== 'main') await page.locator(ready).first().waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts?.ready;
  });
}

async function expectAxeClean(page, include) {
  const builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice',
  ]);
  if (include) builder.include(include);
  const results = await builder.analyze();
  expect(
    results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth, body?.scrollWidth ?? 0) - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

const viewports = [
  { name: 'desktop', width: 1365, height: 900 },
  { name: 'mobile', width: 390, height: 900 },
];

test.describe('error and recovery page coverage', () => {
  for (const viewport of viewports) {
    test(`404 page is accessible and does not overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await prepare(page, '/this-route-does-not-exist-xyz/');
      await expect(page.locator('h1')).toContainText('Page not found');
      await expect(page.locator('.error-recovery a')).not.toHaveCount(0);
      await expectAxeClean(page, 'main');
      await expectNoHorizontalOverflow(page);
    });

    test(`offline shell is accessible and does not overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await prepare(page, '/offline.html', '.offline-panel');
      await expect(page.locator('#offline-title')).toBeVisible();
      await expect(page.locator('.offline-actions a')).not.toHaveCount(0);
      await expectAxeClean(page, 'main');
      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe('print media coverage', () => {
  for (const path of ['/', '/resume/']) {
    test(`${path} renders its content under print media without overflow`, async ({ page }) => {
      await page.setViewportSize({ width: 1365, height: 900 });
      await prepare(page, path);
      await page.emulateMedia({ media: 'print' });
      // Core content stays visible and reachable when printed.
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1').first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe('open navigation state coverage', () => {
  test('the open mobile navigation is accessible without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await prepare(page, '/');
    const toggle = page.locator('#mobileToggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('#navLinks.open')).toBeVisible();
    await expectAxeClean(page, 'nav');
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('empty catalog state coverage', () => {
  test('the no-results catalog state is calm, accessible, and reachable', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 900 });
    await prepare(page, '/', '#catalog');
    const input = page.locator('#searchInput');
    await input.fill('zzqqxxwwvvnothingmatchesthis');
    await expect(page.locator('#catalogGrid .ca:visible')).toHaveCount(0, { timeout: 10_000 });
    // A reachable recovery affordance (reset/clear) must be present.
    await expect(page.locator('.no-results, .catalog-feedback, [data-empty]').first()).toBeVisible();
    await expectAxeClean(page, '#catalog');
    await expectNoHorizontalOverflow(page);
  });
});
