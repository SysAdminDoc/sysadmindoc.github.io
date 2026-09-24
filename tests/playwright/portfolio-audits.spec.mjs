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
  { name: 'privacy', path: '/privacy/', ready: '#privacy-overview' },
  { name: 'colophon', path: '/colophon/', ready: '#colophon-overview' },
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

// /data/ gives the data's age in hours as of the build, which moves every hour
// against the fixtures' fixed fetch time. A mask can't hold it still (its box
// follows the text's width), so the text itself is pinned before comparing.
async function pinBuildAge(page) {
  await page.locator('[data-build-age]').evaluateAll((elements) => {
    for (const element of elements) element.textContent = '0.0 hours ago';
  });
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

  // Since v0.45 the catalog page's intro holds the title and its copy, and
  // the full catalog section below has a heading only.
  await preparePage(page, '/catalog/', '#catalog-overview');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  for (const selector of ['#catalog-overview .sh', '#catalog .sh']) {
    const heading = page.locator(selector);
    await heading.scrollIntoViewIfNeeded();
    const layout = await heading.evaluate((element) => {
      const title = element.querySelector('h1, h2')?.getBoundingClientRect();
      const copy = element.querySelector('p')?.getBoundingClientRect();
      return {
        columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
        titleWidth: title?.width ?? 0,
        copyWidth: copy?.width ?? null,
      };
    });
    expect(layout.columns, selector).toBe(1);
    expect(layout.titleWidth, selector).toBeGreaterThan(300);
    if (selector === '#catalog-overview .sh') expect(layout.copyWidth, selector).toBeGreaterThan(300);
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
        await pinBuildAge(page);
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
    // The homepage shows at most six live apps (the slice in
    // src/pages/index.astro). This suite runs on the fixture build (npm run
    // audit:playwright), whose profile feed lists exactly six, so a count
    // that drops any of them fails (eighth drain review).
    await expect(page.locator('#live .lc2')).toHaveCount(6);
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

// The colophon's content sat flush against the screen edge on phones for a
// release before its first baseline showed it: its blocks had no gutter class.
// Any text in main starts at least 12px in from either edge at 390px wide,
// unless it sits in a container that scrolls sideways on purpose. Every text
// node counts, not just headings and paragraphs: a label, a table cell or a
// link on its own reaches the edge the same way (eighth drain review).
/**
 * The text in main that comes within 12px of either screen edge, described,
 * run in the page. Self-contained, since page.evaluate sends only its source.
 */
function flushText() {
  const found = new Map();
  // From the text's own element up: a <pre> that scrolls holds its text
  // directly (thirteenth drain review).
  const scrollsSideways = (element) => {
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      const overflow = getComputedStyle(node).overflowX;
      if ((overflow === 'auto' || overflow === 'scroll') && node.scrollWidth > node.clientWidth + 1) return true;
    }
    return false;
  };
  // Clipped away for screen readers only, like Pagefind's input hint.
  // `clip` only applies to an absolutely or fixed positioned box, and
  // Chromium reports it on a static one that it doesn't clip.
  const visuallyHidden = (element) => {
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.clipPath === 'inset(100%)') return true;
      if ((style.position === 'absolute' || style.position === 'fixed') && /^rect\(0px,? 0px,? 0px,? 0px\)$/.test(style.clip)) return true;
      const box = node.getBoundingClientRect();
      if (style.overflow === 'hidden' && box.width <= 1 && box.height <= 1) return true;
    }
    return false;
  };
  // The nearest absolutely or fixed positioned box, the element's own or an
  // ancestor's: only that box sitting off the screen hides its text on purpose.
  const positionedBox = (element) => {
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      const position = getComputedStyle(node).position;
      if (position === 'absolute' || position === 'fixed') return node.getBoundingClientRect();
    }
    return null;
  };
  // What of `rect` the element's overflow: hidden or clip ancestors leave to
  // be seen, or null for none of it. A positioned box escapes the ones between
  // it and its containing block, as it does in the browser.
  const visiblePart = (element, rect) => {
    let { left, right, top, bottom } = rect;
    let escaping = null;
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      const containing =
        escaping === null ||
        style.transform !== 'none' ||
        (escaping === 'absolute' && style.position !== 'static');
      if (containing) {
        escaping = null;
        const box = node.getBoundingClientRect();
        if (style.overflowX === 'hidden' || style.overflowX === 'clip') {
          left = Math.max(left, box.left);
          right = Math.min(right, box.right);
        }
        if (style.overflowY === 'hidden' || style.overflowY === 'clip') {
          top = Math.max(top, box.top);
          bottom = Math.min(bottom, box.bottom);
        }
      }
      if (style.position === 'absolute' || style.position === 'fixed') escaping = style.position;
    }
    return right > left && bottom > top ? { left, right } : null;
  };
  const main = document.querySelector('main');
  if (!main) return ['no main element'];
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement;
    if (!element || !node.textContent.trim() || found.has(element)) continue;
    // aria-hidden text is still on screen (the 01/02/03 numerals, arrows),
    // so it counts; only what isn't drawn is left out, fully transparent
    // text included (fifteenth drain review).
    if (element.closest('script, style, template, noscript, .sr-only, dialog:not([open])')) continue;
    if (!element.checkVisibility({ visibilityProperty: true, opacityProperty: true }) || visuallyHidden(element)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const whole = range.getBoundingClientRect();
    if (whole.width === 0 || whole.height === 0) continue;
    // Measured as drawn: an ellipsis cuts the line where its box ends.
    const text = visiblePart(element, whole);
    if (!text) continue;
    // Moved wholly off the screen by its own absolutely or fixed positioned
    // box, the other way to hide text from sight but not from screen readers,
    // like the contact form's honeypot label at left: -9999px. Text moved off
    // some other way, by a transform or a margin inside an on-screen card,
    // still counts, and so does text only partly off the screen.
    const box = positionedBox(element);
    const offScreen = (rect) => rect.right <= 0 || rect.left >= window.innerWidth;
    if (box && offScreen(box) && offScreen(text)) continue;
    if ((text.left < 12 || text.right > window.innerWidth - 12) && !scrollsSideways(element)) {
      found.set(element, `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}.${[...element.classList].join('.')} "${node.textContent.trim().slice(0, 40)}" ${Math.round(text.left)}..${Math.round(text.right)}`);
    }
  }
  return [...found.values()].slice(0, 8);
}

test.describe('Mobile gutter audit', () => {
  for (const route of routes) {
    test(`${route.name} keeps its text off the screen edge at 390px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await preparePage(page, route.path, route.ready);
      expect(await page.evaluate(flushText)).toEqual([]);
    });
  }

  // Each way text can reach the edge, or look as if it does, planted in one
  // page, so the check is seen to flag and skip what it means to (fifteenth
  // drain review).
  test('flags and skips planted text as meant', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.setContent(`<!doctype html><html><body style="margin:0"><main style="padding:0 20px">
      <p id="flush" style="margin:0 -20px">Flush with the edge</p>
      <p id="inside">Well inside the gutter</p>
      <span id="numeral" aria-hidden="true" style="position:relative;left:-20px">01</span>
      <div style="position:absolute;left:20px;top:100px;width:300px"><p id="margin-off" style="margin:0 0 0 -600px">Moved off by a margin</p></div>
      <div style="position:absolute;left:20px;top:140px;width:300px"><p id="transform-off" style="transform:translateX(-600px)">Moved off by a transform</p></div>
      <div style="position:relative"><p id="relative-off" style="position:relative;left:-600px">Moved off inside a relative box</p></div>
      <div style="position:absolute;left:-9999px"><label id="honeypot">Leave this empty</label></div>
      <p id="fixed-off" style="position:fixed;left:-9999px">Hidden the fixed way</p>
      <span id="transparent" aria-hidden="true" style="position:relative;left:-20px;opacity:0">Fully transparent</span>
      <p id="ellipsis" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${'A line far too long for a phone screen, cut by an ellipsis '.repeat(3)}</p>
      <p id="ellipsis-flush" style="margin:0 -20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${'A line cut by an ellipsis right at the edge '.repeat(3)}</p>
      <div style="overflow:hidden"><div style="position:absolute;left:0;top:400px"><span id="escaped">Escapes a clip it isn't inside</span></div></div>
      </main></body></html>`);
    const flagged = (await page.evaluate(flushText)).map((line) => line.match(/^\w+#([\w-]+)/)?.[1] ?? line).sort();
    expect(flagged).toEqual(['ellipsis-flush', 'escaped', 'flush', 'margin-off', 'numeral', 'relative-off', 'transform-off']);
  });
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

        await pinBuildAge(page);
        await expect(page).toHaveScreenshot(`${route.name}-${viewport.name}.png`, {
          fullPage: false,
          mask: dynamicMasks(page),
          maskColor,
        });
      });
    }
  }
});
