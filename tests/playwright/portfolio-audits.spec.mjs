import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  collectTargetSizeViolations,
  desktopTargetSizeMinimum,
  mobileTargetSizeMinimum,
} from './helpers/target-size.mjs';

const stableNow = Date.parse('2026-06-04T12:00:00Z');
const routes = [
  { name: 'home', path: '/', ready: 'main' },
  { name: 'catalog', path: '/catalog/', ready: '#catalog-overview' },
  { name: 'search', path: '/search/?q=python', ready: '#site-search' },
  { name: 'archive', path: '/archive/', ready: '#archive-entries' },
  { name: 'status', path: '/status/', ready: '#status-health' },
  { name: 'timeline', path: '/timeline/', ready: '#timeline-overview' },
  { name: 'releases', path: '/releases/', ready: '#release-timeline' },
  { name: 'screenshots', path: '/screenshots/', ready: '#screenshots-gallery' },
  { name: 'resume', path: '/resume/', ready: '#resume-header' },
  { name: 'uses', path: '/uses/', ready: '#uses-overview' },
  { name: 'now', path: '/now/', ready: '#now-overview' },
  { name: 'healthcare', path: '/healthcare-it/', ready: '#track-overview' },
  { name: 'ai', path: '/ai/', ready: '#track-overview' },
  { name: 'lang-python', path: '/lang/python/', ready: '#lane-overview' },
];
const viewports = [
  { name: 'desktop', width: 1365, height: 900 },
  { name: 'mobile', width: 390, height: 900 },
];
const layoutRegressionRouteNames = new Set([
  'home',
  'search',
  'archive',
  'status',
  'releases',
  'screenshots',
]);
const layoutRegressionRoutes = routes.filter((route) => layoutRegressionRouteNames.has(route.name));
const layoutRegressionViewports = [
  { name: 'wide-1000', width: 1000, height: 900 },
  { name: 'wide-1280', width: 1280, height: 900 },
  { name: 'wide-1440', width: 1440, height: 900 },
  { name: 'short-1280x650', width: 1280, height: 650 },
];
const stabilityCss = `
  *, *::before, *::after {
    animation: none !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
  html { caret-color: transparent !important; }
  .pulse-dot, .now-pulse-dot { visibility: hidden !important; }
  .rv, .card-enter, .dv { opacity: 1 !important; transform: none !important; }
`;

async function preparePage(page, path, readySelector = 'main') {
  await page.route('https://api.github.com/**', (route) =>
    route.fulfill({
      contentType: 'application/json; charset=utf-8',
      body: '[]',
    }),
  );
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><title>External embed disabled for audit</title>',
    }),
  );
  await page.route('**/__playwright-stability.css', (route) =>
    route.fulfill({
      contentType: 'text/css; charset=utf-8',
      body: stabilityCss,
    }),
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
  // Seed the persisted theme preference to match the project's emulated
  // color scheme BEFORE navigation, so the dark lane actually bootstraps the
  // dark theme (the site keys on theme-pref, not prefers-color-scheme).
  await page.addInitScript(() => {
    try {
      const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      localStorage.setItem('theme-pref', dark ? 'dark' : 'light');
    } catch (error) { /* storage unavailable */ }
  });
  await page.goto(path, { waitUntil: 'load' });
  await page.addStyleTag({ url: '/__playwright-stability.css' });
  await expect(page.locator('vite-error-overlay')).toHaveCount(0, { timeout: 1_000 });
  await page.locator('main').waitFor({ state: 'visible' });
  await page.locator(readySelector).waitFor({ state: 'visible' });
  // Guard: the resolved theme must match the emulated color scheme, so neither
  // lane can silently render the wrong theme (and quietly stop covering it).
  const expectedTheme = await page.evaluate(() =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', expectedTheme);
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts?.ready;
  });
}

function dynamicMasks(page) {
  return [
    page.locator('#statRepos'),
    page.locator('#statStars'),
    page.locator('[data-rel]'),
    page.locator('[data-rel-short]'),
    page.locator('.gh-stars'),
    page.locator('.ca-stars'),
    page.locator('.project-stars'),
    page.locator('.project-fact-value time'),
    page.locator('.status-value'),
  ];
}

function summarizeViolations(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    nodes: violation.nodes.map((node) => node.target),
  }));
}

async function expectAxeClean(page, include = 'main') {
  const results = await new AxeBuilder({ page })
    .include(include)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();

  expect(summarizeViolations(results.violations)).toEqual([]);
}

function collectRuntimeErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  return errors;
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth, body?.scrollWidth ?? 0) - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

async function collectDescendantBoundsViolations(page, containerSelector) {
  return page.locator(containerSelector).evaluateAll((containers) =>
    containers.flatMap((container, containerIndex) => {
      const bounds = container.getBoundingClientRect();
      return Array.from(container.querySelectorAll('*'))
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none'
            && style.visibility !== 'hidden'
            && rect.width > 0
            && rect.height > 0;
        })
        .flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const edges = {
            left: bounds.left - rect.left,
            top: bounds.top - rect.top,
            right: rect.right - bounds.right,
            bottom: rect.bottom - bounds.bottom,
          };
          const overflowEdges = Object.entries(edges)
            .filter(([, overflow]) => overflow > 1)
            .map(([edge, overflow]) => `${edge}:${overflow.toFixed(2)}px`);
          if (overflowEdges.length === 0) return [];
          return [{
            container: `${container.tagName.toLowerCase()}.${container.className}#${containerIndex + 1}`,
            descendant: `${element.tagName.toLowerCase()}.${element.className}`,
            overflow: overflowEdges,
          }];
        });
    }),
  );
}

test.describe('Rendered public route health', () => {
  for (const viewport of viewports) {
    for (const route of routes) {
      test(`${route.name} ${viewport.name} route renders without overlays, console errors, or overflow`, async ({ page }, testInfo) => {
        const runtimeErrors = collectRuntimeErrors(page);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page, route.path, route.ready);
        if (testInfo.project.name.includes('light')) {
          await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
          await page.waitForTimeout(200);
        }

        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator(route.ready)).toBeVisible();
        await expect(page.locator('vite-error-overlay')).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
        expect(runtimeErrors).toEqual([]);
      });
    }
  }
});

test.describe('Homepage live-card containment', () => {
  for (const width of [320, 360, 390]) {
    test(`live-card descendants stay inside their cards at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await preparePage(page, '/', '#live');

      const cards = page.locator('#live .lc2');
      await expect(cards.first()).toBeVisible();
      expect(await cards.count()).toBeGreaterThan(1);
      await cards.first().scrollIntoViewIfNeeded();
      await expectNoHorizontalOverflow(page);
      expect(await collectDescendantBoundsViolations(page, '#live .lc2')).toEqual([]);

      const featureWidths = await cards.first().evaluate((card) => {
        const thumb = card.querySelector('.lc2-thumb');
        const picture = card.querySelector('.lc2-picture');
        const image = card.querySelector('.lc2-thumb img');
        return {
          card: card.getBoundingClientRect().width,
          thumb: thumb?.getBoundingClientRect().width ?? 0,
          picture: picture?.getBoundingClientRect().width ?? 0,
          image: image?.getBoundingClientRect().width ?? 0,
        };
      });
      expect(featureWidths.thumb).toBeGreaterThan(featureWidths.card - 2);
      expect(featureWidths.picture).toBeCloseTo(featureWidths.thumb, 0);
      expect(featureWidths.image).toBeCloseTo(featureWidths.thumb, 0);
    });
  }
});

test('release summaries with unbroken URLs stay inside the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await preparePage(page, '/releases/', '.rel-month:first-of-type .rel-item:first-child .rel-body');

  const summary = page.locator('.rel-body').first();
  await summary.evaluate((element) => {
    element.textContent = `https://example.test/${'unbroken-release-path-'.repeat(12)}`;
  });

  await expectNoHorizontalOverflow(page);
  const summaryOverflow = await summary.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(summaryOverflow).toBeLessThanOrEqual(1);
});

test.describe('Playwright axe accessibility audit', () => {
  for (const route of routes) {
    test(`${route.name} route has no axe violations`, async ({ page }, testInfo) => {
      await preparePage(page, route.path, route.ready);
      if (testInfo.project.name.includes('light')) {
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      }
      await expectAxeClean(page);
    });
  }

  for (const viewport of viewports) {
    const minimum = viewport.width <= 640 ? mobileTargetSizeMinimum : desktopTargetSizeMinimum;
    test(`hydrated command palette ${viewport.name} state is accessible with ${minimum}px targets`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await preparePage(page, '/', '#hero');
      if (testInfo.project.name.includes('light')) {
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      }

      await page.locator('#cmdkToggle').click();
      await page.locator('#cmdkInput').fill('python');
      await expect(page.locator('#cmdkList .cmdk-item')).not.toHaveCount(0);
      const inputRowShadow = await page.locator('.cmdk-input-row').evaluate((node) => getComputedStyle(node).boxShadow);
      expect(inputRowShadow).not.toBe('none');
      await expectAxeClean(page, '#cmdk');
      expect(await collectTargetSizeViolations(page, minimum)).toEqual([]);
    });
  }

});

test.describe('WCAG 2.2 target-size audit', () => {
  for (const viewport of viewports) {
    for (const route of routes) {
      const minimum = viewport.width <= 640 ? mobileTargetSizeMinimum : desktopTargetSizeMinimum;
      test(`${route.name} ${viewport.name} targets are at least ${minimum}px or spaced`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page, route.path, route.ready);
        if (testInfo.project.name.includes('light')) {
          await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
          await page.waitForTimeout(200);
        }

        expect(await collectTargetSizeViolations(page, minimum)).toEqual([]);
      });
    }
  }
});

test.describe('Mid-wide desktop layout regression audit', () => {
  for (const viewport of layoutRegressionViewports) {
    for (const route of layoutRegressionRoutes) {
      test(`${route.name} ${viewport.name} layout stays stable`, async ({ page }, testInfo) => {
        const runtimeErrors = collectRuntimeErrors(page);
        const isLight = testInfo.project.name.includes('light');
        const maskColor = isLight ? '#f0f0f3' : '#111827';
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page, route.path, route.ready);
        if (route.name === 'home') {
          await expect(page.locator('.hero-evidence')).toBeVisible();
        }
        if (isLight) {
          await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
          await page.waitForTimeout(200);
        }

        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator(route.ready)).toBeVisible();
        await expect(page.locator('vite-error-overlay')).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
        expect(await collectTargetSizeViolations(page, desktopTargetSizeMinimum)).toEqual([]);
        expect(runtimeErrors).toEqual([]);
        await expect(page).toHaveScreenshot(`${route.name}-${viewport.name}.png`, {
          fullPage: false,
          mask: dynamicMasks(page),
          maskColor,
        });
      });
    }
  }
});

test('homepage operating index and selected system stay usable at every breakpoint', async ({ page }) => {
  const expectServiceBureauLayout = async (width) => {
    await page.setViewportSize({ width, height: 900 });
    await preparePage(page, '/', '#hero');

    const operatingIndex = page.locator('.hero-operating-index');
    const selectedSystem = page.locator('.hero-selected');
    await expect(operatingIndex).toBeVisible();
    await expect(operatingIndex.locator('.hero-lane')).toHaveCount(3);
    await expect(selectedSystem.locator('.hero-showcase')).toHaveCount(1);
    await expect(selectedSystem.locator('.hero-showcase')).toBeVisible();
    const evidence = await selectedSystem.evaluate((node) => {
      const showcase = node.querySelector('.hero-showcase');
      const showcaseName = showcase?.querySelector('.hero-showcase-brand strong')?.textContent?.trim() ?? '';
      return {
        showcaseName,
        showcaseHref: showcase?.getAttribute('href') ?? '',
        showcaseImageAlt: showcase?.querySelector('img')?.getAttribute('alt') ?? '',
        cardNames: Array.from(node.querySelectorAll('.hero-app-card strong')).map((card) => card.textContent?.trim() ?? ''),
      };
    });
    expect(evidence.showcaseName).toMatch(/\S/);
    expect(evidence.showcaseHref).toMatch(/^https:\/\/sysadmindoc\.github\.io\/[^/]+\/$/);
    expect(evidence.showcaseImageAlt).toContain(evidence.showcaseName);
    expect(evidence.cardNames.length).toBeGreaterThanOrEqual(1);
    expect(evidence.cardNames.at(-1)).toBe('More live systems');

    const layoutMetrics = await page.evaluate(() => {
      const railElement = document.querySelector('.hero-operating-index');
      const railRect = railElement?.getBoundingClientRect();
      const status = railElement?.querySelector('.hero-evidence-status');
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        railTop: railRect?.top ?? 0,
        railLeft: railRect?.left ?? 0,
        railRight: railRect?.right ?? 0,
        railHeight: railRect?.height ?? 0,
        statusWritingMode: status ? getComputedStyle(status).writingMode : '',
      };
    });
    expect(layoutMetrics.scrollWidth).toBeLessThanOrEqual(layoutMetrics.clientWidth + 1);
    if (width > 1180) {
      expect(layoutMetrics.railTop).toBeLessThan(160);
      expect(layoutMetrics.railLeft).toBeGreaterThan(layoutMetrics.clientWidth * 0.47);
      expect(layoutMetrics.statusWritingMode).toBe('vertical-rl');
    } else {
      expect(layoutMetrics.railTop).toBeGreaterThan(400);
      expect(layoutMetrics.railLeft).toBeLessThan(layoutMetrics.clientWidth * 0.1);
      expect(layoutMetrics.statusWritingMode).toBe('horizontal-tb');
    }
    expect(layoutMetrics.railRight).toBeLessThanOrEqual(layoutMetrics.clientWidth);
    expect(layoutMetrics.railHeight).toBeGreaterThan(300);
  };

  await expectServiceBureauLayout(1365);
  await expectServiceBureauLayout(980);
  await expectServiceBureauLayout(390);
});

test.describe('Playwright visual baselines', () => {
  for (const viewport of viewports) {
    for (const route of routes) {
      test(`${route.name} ${viewport.name} viewport matches baseline`, async ({ page }, testInfo) => {
        const isLight = testInfo.project.name.includes('light');
        const maskColor = isLight ? '#f0f0f3' : '#111827';
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page, route.path, route.ready);
        if (route.name === 'home' && viewport.width >= 980) {
          await expect(page.locator('.hero-evidence')).toBeVisible();
        }
        if (isLight) {
          await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
          await page.waitForTimeout(200);
        }

        await expect(page).toHaveScreenshot(`${route.name}-${viewport.name}.png`, {
          fullPage: false,
          mask: dynamicMasks(page),
          maskColor,
        });
      });
    }
  }
});
