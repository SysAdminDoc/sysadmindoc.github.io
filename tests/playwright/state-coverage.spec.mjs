import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  collectTargetSizeViolations,
  targetSizeMinimumForWidth,
} from './helpers/target-size.mjs';

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

async function expectTargetSizeClean(page) {
  const viewport = page.viewportSize();
  const minimum = targetSizeMinimumForWidth(viewport?.width ?? 1365);
  expect(
    await collectTargetSizeViolations(page, minimum),
    `interactive targets should meet the ${minimum}px target or a documented WCAG 2.5.8 exception`,
  ).toEqual([]);
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
      await expectTargetSizeClean(page);
      await expectNoHorizontalOverflow(page);
    });

    test(`offline shell is accessible and does not overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await prepare(page, '/offline.html', '.offline-panel');
      await expect(page.locator('#offline-title')).toBeVisible();
      await expect(page.locator('.offline-actions a')).not.toHaveCount(0);
      await expectAxeClean(page, 'main');
      await expectTargetSizeClean(page);
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

  test('/resume/ print styles override the interior screen layout', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 900 });
    await prepare(page, '/resume/', '#resume-header');
    await page.emulateMedia({ media: 'print' });

    await expect(page.locator('.resume-page')).toHaveCSS('padding-top', '0px');
    await expect(page.locator('.resume-name-block h1')).toHaveCSS('font-size', '32px');
    await expect(page.locator('.resume-section h2').first()).toHaveCSS('color', 'rgb(17, 17, 17)');
    await expect(page.locator('.resume-shell')).toHaveCSS('display', 'block');
    await expect(page.locator('.resume-shell')).toHaveCSS('grid-template-columns', 'none');
    await expect(page.locator('.resume-visible-url').first()).toHaveCSS('color', 'rgb(17, 17, 17)');

    const visibleUrlSuffix = await page.locator('.resume-visible-url').first().evaluate((link) =>
      getComputedStyle(link, '::after').content,
    );
    expect(['none', 'normal', '""']).toContain(visibleUrlSuffix);
  });
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
    await expectTargetSizeClean(page);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('status freshness state coverage', () => {
  // A static page bakes its ages at build time, so a deployment nobody rebuilds
  // keeps claiming it is fresh. These two cases pin the view-time recomputation:
  // the same build reads healthy right after publish and stale months later.
  async function prepareAtClock(page, path, now) {
    await page.addInitScript((fixed) => {
      const RealDate = Date;
      class FixedDate extends RealDate {
        constructor(...args) {
          return args.length === 0 ? new RealDate(fixed) : new RealDate(...args);
        }
        static now() {
          return fixed;
        }
      }
      FixedDate.parse = RealDate.parse;
      FixedDate.UTC = RealDate.UTC;
      Object.setPrototypeOf(FixedDate, RealDate);
      window.Date = FixedDate;
    }, now);
    await page.goto(path, { waitUntil: 'load' });
    await page.locator('main').first().waitFor({ state: 'visible' });
  }

  function dataAgeCard(page) {
    return page.locator('.status-card[data-freshness="age"]').first();
  }

  test('a build older than the freshness contract reports stale at view time', async ({ page }) => {
    const card = dataAgeCard(page);
    await page.setViewportSize({ width: 1365, height: 900 });

    // Read the build-stamped timestamp, then revisit far past the 36h contract.
    await page.goto('/status/', { waitUntil: 'load' });
    const iso = await card.getAttribute('data-freshness-iso');
    expect(iso, '/status/ must stamp the fetchedAt timestamp for view-time math').toBeTruthy();
    const wayLater = Date.parse(iso) + 40 * 24 * 3600 * 1000;

    await prepareAtClock(page, '/status/', wayLater);
    await expect(card.locator('.status-dot')).toHaveClass(/status-dot-amber/);
    await expect(card.locator('.status-value')).toHaveText(/\d+\.\dd|\d+\.\dmo/);
    await expect(card.locator('.sr-only')).toHaveText('Needs attention');
    await expect(page.locator('#status-stale-now')).toBeVisible();
    await expectAxeClean(page, '#status-health');
    await expectNoHorizontalOverflow(page);
  });

  test('a freshly published build reports healthy and hides the stale panel', async ({ page }) => {
    const card = dataAgeCard(page);
    await page.setViewportSize({ width: 1365, height: 900 });

    await page.goto('/status/', { waitUntil: 'load' });
    const iso = await card.getAttribute('data-freshness-iso');
    const justAfter = Date.parse(iso) + 60 * 60 * 1000;

    await prepareAtClock(page, '/status/', justAfter);
    await expect(card.locator('.status-dot')).toHaveClass(/status-dot-green/);
    await expect(card.locator('.status-value')).toHaveText('1.0h');
    await expect(card.locator('.sr-only')).toHaveText('Healthy');
    await expect(page.locator('#status-stale-now')).toBeHidden();
  });
});

test.describe('empty catalog state coverage', () => {
  test('the no-results catalog state is calm, accessible, and reachable', async ({ page }) => {
    await page.setViewportSize({ width: 1365, height: 900 });
    await prepare(page, '/catalog/', '#catalog');
    const input = page.locator('#searchInput');
    await input.fill('zzqqxxwwvvnothingmatchesthis');
    await expect(page.locator('#catalogGrid .ca:visible')).toHaveCount(0, { timeout: 10_000 });
    // A reachable recovery affordance (reset/clear) must be present.
    await expect(page.locator('.no-results, .catalog-feedback, [data-empty]').first()).toBeVisible();
    await expectAxeClean(page, '#catalog');
    await expectTargetSizeClean(page);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('empty timeline filter state coverage', () => {
  // Every single timeline filter OPTION is data-derived, so each individual value
  // matches >=1 event; the empty state only appears for an INTERSECTION of two
  // orthogonal filters. Rather than hardcode a year/language pair (brittle to data
  // changes), read the live options and search filter pairs at runtime until the
  // `#timelineEmpty` panel shows, then audit it.
  for (const viewport of viewports) {
    test(`the filtered "no events" state is accessible and does not overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await prepare(page, '/timeline/', '#timeline-events');
      await page.locator('#timelineList [data-timeline-event]').first().waitFor({ state: 'attached' });

      // Deterministically drive the client filter into an empty intersection by
      // trying pairs of orthogonal select values until #timelineEmpty is shown.
      const combo = await page.evaluate(() => {
        const ids = {
          year: 'timelineYear',
          platform: 'timelinePlatform',
          category: 'timelineCategory',
          language: 'timelineLanguage',
        };
        const keys = Object.keys(ids);
        const selects = {};
        const optionsByKey = {};
        for (const key of keys) {
          const el = document.getElementById(ids[key]);
          selects[key] = el;
          optionsByKey[key] = Array.from(el.options)
            .map((o) => o.value)
            .filter((v) => v && v !== 'all');
        }
        const empty = document.getElementById('timelineEmpty');
        const form = document.getElementById('timelineFilters');
        const reset = () => {
          for (const key of keys) {
            selects[key].value = 'all';
          }
        };
        const setPair = (a, va, b, vb) => {
          reset();
          selects[a].value = va;
          selects[b].value = vb;
          // A single bubbling change event drives timeline.js apply().
          form.dispatchEvent(new Event('change', { bubbles: true }));
        };
        // Search every distinct pair of dimensions for an empty intersection.
        for (let i = 0; i < keys.length; i += 1) {
          for (let j = i + 1; j < keys.length; j += 1) {
            const a = keys[i];
            const b = keys[j];
            for (const va of optionsByKey[a]) {
              for (const vb of optionsByKey[b]) {
                setPair(a, va, b, vb);
                if (!empty.hidden) {
                  return { a, va, b, vb };
                }
              }
            }
          }
        }
        return null;
      });

      expect(combo, 'an empty filter intersection should exist among the timeline options').not.toBeNull();

      const empty = page.locator('#timelineEmpty');
      await expect(empty).toBeVisible();
      await expect(empty).toContainText('No timeline events match these filters.');
      // The recovery affordance is present, enabled, and reachable.
      const reset = page.locator('#timelineReset');
      await expect(reset).toBeVisible();
      await expect(reset).toBeEnabled();
      await expect(page.locator('#timelineList [data-timeline-event]:visible')).toHaveCount(0);

      await expectAxeClean(page, '#timeline-events');
      await expectTargetSizeClean(page);
      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe('service-worker update toast coverage', () => {
  // The update toast only renders when a WAITING worker exists. Register the real
  // /sw.js, then serve a byte-different variant on each fetch so registration.update()
  // installs a second worker that parks in `waiting` (the active one keeps control),
  // which fires the production showServiceWorkerUpdateToast() path.
  test.use({ serviceWorkers: 'allow' });

  test('the update toast is accessible, has valid touch targets, and dismisses cleanly', async ({ page, context }) => {
    await page.setViewportSize({ width: 1365, height: 900 });

    let variant = 0;
    await context.route('**/sw.js', async (route) => {
      const response = await route.fetch();
      const body = `${await response.text()}\n// state-coverage variant ${(variant += 1)}\n`;
      await route.fulfill({ response, body });
    });
    await page.route('https://api.github.com/**', (route) =>
      route.fulfill({ contentType: 'application/json; charset=utf-8', body: '[]' }),
    );

    await page.goto('/', { waitUntil: 'load' });
    // Wait until the first worker has activated and taken control of the page.
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {
      timeout: 20_000,
    });
    // Force an update; the byte-different script installs and parks as `waiting`.
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('/');
      await reg?.update();
    });

    const toast = page.locator('.sw-update-toast');
    await expect(toast).toBeVisible({ timeout: 20_000 });
    await expect(toast).toHaveAttribute('role', 'region');
    await expect(toast).toHaveAttribute('aria-label', 'Portfolio update');
    await expect(toast.locator('.sw-update-message')).toBeVisible();

    const refresh = toast.getByRole('button', { name: 'Refresh now' });
    const dismiss = toast.getByRole('button', { name: 'Not now' });
    await expect(refresh).toBeVisible();
    await expect(dismiss).toBeVisible();
    for (const button of [refresh, dismiss]) {
      const box = await button.boundingBox();
      expect(box, 'toast button should render a hit box').not.toBeNull();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    await expectAxeClean(page, '.sw-update-toast');
    await expectTargetSizeClean(page);
    await expectNoHorizontalOverflow(page);

    // "Not now" hides the toast and it stays dismissed for this build version.
    await dismiss.click();
    await expect(toast).toHaveCount(0);
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration('/');
      await reg?.update();
    });
    await expect(toast).toHaveCount(0);
  });
});
