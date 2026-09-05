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
  { name: 'data', path: '/data/', ready: '#data-overview' },
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
      expect(featureWidths.picture).toBeGreaterThanOrEqual(featureWidths.thumb - 2);
      expect(featureWidths.picture).toBeLessThanOrEqual(featureWidths.thumb);
      expect(featureWidths.image).toBeGreaterThanOrEqual(featureWidths.thumb - 2);
      expect(featureWidths.image).toBeLessThanOrEqual(featureWidths.thumb);
    });
  }
});

test('light-theme mobile ledgers reflow without squeezed columns or overlaps', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await preparePage(page, '/', '#hero');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

  const proofRows = page.locator('.hero-proof-strip .hero-proof');
  await expect(proofRows).toHaveCount(3);
  const proofLayout = await proofRows.evaluateAll((rows) => rows.map((row) => {
    const rect = row.getBoundingClientRect();
    const value = row.querySelector('.hero-proof-value')?.getBoundingClientRect();
    return {
      x: rect.x,
      width: rect.width,
      valueRight: value?.right ?? 0,
      rowRight: rect.right,
    };
  }));
  expect(new Set(proofLayout.map((row) => Math.round(row.x))).size).toBe(1);
  expect(proofLayout.every((row) => row.width > 300)).toBe(true);
  expect(proofLayout.every((row) => row.valueRight <= row.rowRight + 1)).toBe(true);

  await preparePage(page, '/catalog/', '#catalog');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  const catalogHeading = page.locator('#catalog .sh');
  await catalogHeading.scrollIntoViewIfNeeded();
  const catalogLayout = await catalogHeading.evaluate((heading) => {
    const title = heading.querySelector('h2')?.getBoundingClientRect();
    const copy = heading.querySelector('p')?.getBoundingClientRect();
    return {
      columns: getComputedStyle(heading).gridTemplateColumns.split(' ').length,
      titleWidth: title?.width ?? 0,
      copyWidth: copy?.width ?? 0,
    };
  });
  expect(catalogLayout.columns).toBe(1);
  expect(catalogLayout.titleWidth).toBeGreaterThan(300);
  expect(catalogLayout.copyWidth).toBeGreaterThan(300);
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
          await expect(page.locator('.minimal-hero .hero-proof-strip')).toBeVisible();
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

test('homepage stays intentionally bounded at every breakpoint', async ({ page }) => {
  const expectMinimalLayout = async (width) => {
    await page.setViewportSize({ width, height: 900 });
    await preparePage(page, '/', '#hero');

    const layoutMetrics = await page.evaluate(() => {
      const hero = document.querySelector('#hero')?.getBoundingClientRect();
      const work = document.querySelector('#greatest-hits')?.getBoundingClientRect();
      const live = document.querySelector('#live')?.getBoundingClientRect();
      const practice = document.querySelector('#skills')?.getBoundingClientRect();
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
        heroHeight: hero?.height ?? 0,
        workTop: work?.top ?? 0,
        liveTop: live?.top ?? 0,
        practiceTop: practice?.top ?? 0,
      };
    });

    await expect(page.locator('.hero-proof-strip .hero-proof')).toHaveCount(3);
    await expect(page.locator('#greatest-hits .selected-work-row')).toHaveCount(3);
    await expect(page.locator('#live .lc2')).toHaveCount(2);
    await expect(page.locator('#skills .practice-row')).toHaveCount(3);
    await expect(page.locator('#catalog .ca')).toHaveCount(0);
    await expect(page.locator('#catalog .handoff-links a')).toHaveCount(3);
    await expect(page.locator('.hero-selected, .hero-showcase, .video-grid')).toHaveCount(0);

    expect(layoutMetrics.scrollWidth).toBeLessThanOrEqual(layoutMetrics.clientWidth + 1);
    expect(layoutMetrics.heroHeight).toBeGreaterThan(520);
    expect(layoutMetrics.heroHeight).toBeLessThan(width <= 640 ? 1300 : 1100);
    expect(layoutMetrics.workTop).toBeGreaterThanOrEqual(layoutMetrics.heroHeight - 2);
    expect(layoutMetrics.liveTop).toBeGreaterThan(layoutMetrics.workTop);
    expect(layoutMetrics.practiceTop).toBeGreaterThan(layoutMetrics.liveTop);
    expect(layoutMetrics.pageHeight).toBeLessThan(width <= 640 ? 10_000 : 8_000);
  };

  await expectMinimalLayout(1365);
  await expectMinimalLayout(980);
  await expectMinimalLayout(390);
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
          await expect(page.locator('.minimal-hero .hero-proof-strip')).toBeVisible();
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
