import { expect, test } from '@playwright/test';

const stableNow = Date.parse('2026-06-04T12:00:00Z');
const stabilityCss = `
  *, *::before, *::after {
    animation: none !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
  .rv, .card-enter, .dv { opacity: 1 !important; transform: none !important; }
`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function collectCspConsoleMessages(page) {
  const messages = [];
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' || /content security policy|securitypolicyviolation|speculationrules/i.test(text)) {
      messages.push(`[${message.type()}] ${text}`);
    }
  });
  page.on('pageerror', (error) => {
    messages.push(`[pageerror] ${error.message}`);
  });
  return messages;
}

function collectCmdkScriptRequests(page) {
  const requests = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/scripts/cmdk.js') {
      requests.push(request.url());
    }
  });
  return requests;
}

async function installCspViolationRecorder(page) {
  await page.addInitScript(() => {
    window.__cspViolations = [];
    window.addEventListener('securitypolicyviolation', (event) => {
      window.__cspViolations.push({
        blockedURI: event.blockedURI,
        effectiveDirective: event.effectiveDirective,
        lineNumber: event.lineNumber,
        sample: event.sample,
        sourceFile: event.sourceFile,
        violatedDirective: event.violatedDirective,
      });
    });
  });
}

async function expectNoCspViolations(page) {
  const violations = await page.evaluate(() => window.__cspViolations ?? []);
  expect(violations).toEqual([]);
}

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
      body: '<!doctype html><title>External embed disabled for smoke test</title>',
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
  await page.goto(path, { waitUntil: 'load' });
  await expect(page.locator('vite-error-overlay')).toHaveCount(0, { timeout: 1_000 });
  await page.addStyleTag({ url: '/__playwright-stability.css' });
  await page.locator('main').waitFor({ state: 'visible' });
  await page.locator(readySelector).first().waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts?.ready;
  });
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth, body?.scrollWidth ?? 0) - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectSearchFallbackLinks(page) {
  const fallbackLinks = page.locator('#search-fallbacks');
  await expect(fallbackLinks.locator('a[href="/#catalog"]')).toBeVisible();
  await expect(fallbackLinks.locator('a[href="/timeline/"]')).toBeVisible();
  await expect(fallbackLinks.locator('a[href="/releases/"]')).toBeVisible();
  await expect(fallbackLinks.locator('a[href="/archive/"]')).toBeVisible();
}

async function expectCommandPaletteState(page, isOpen) {
  await expect.poll(async () => page.evaluate(() => {
    const dialog = document.getElementById('cmdk');
    const toggle = document.getElementById('cmdkToggle');
    const input = document.getElementById('cmdkInput');
    return {
      dialogOpen: Boolean(dialog?.open),
      toggleExpanded: toggle?.getAttribute('aria-expanded') ?? null,
      inputExpanded: input?.getAttribute('aria-expanded') ?? null,
    };
  })).toEqual({
    dialogOpen: isOpen,
    toggleExpanded: String(isOpen),
    inputExpanded: String(isOpen),
  });
}

async function openCommandPalette(page) {
  await page.locator('#cmdkToggle').dispatchEvent('click');
  await expectCommandPaletteState(page, true);
}

test.describe('rendered interaction smoke', () => {
  test('Astro client prerender link interactions do not violate the active CSP', async ({ page }) => {
    const cspMessages = collectCspConsoleMessages(page);
    await installCspViolationRecorder(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/', '#heroTerm.interactive');

    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
      'content',
      /script-src 'self'/,
    );

    const timelineLink = page.locator('a[href="/timeline/"]').first();
    await timelineLink.hover();
    await timelineLink.focus();
    await page.waitForTimeout(500);
    await expectNoCspViolations(page);
    await timelineLink.click();
    await expect(page).toHaveURL(/\/timeline\/$/);
    await expect(page.locator('main.timeline-page')).toBeVisible();
    await expectNoCspViolations(page);

    const catalogLink = page.locator('#nav a[href="/#catalog"]').first();
    await expect(catalogLink).toBeVisible();
    await catalogLink.focus();
    await page.waitForTimeout(500);
    await expectNoCspViolations(page);
    await catalogLink.dispatchEvent('click');
    await expect(page).toHaveURL(/\/#catalog$/);
    await expect(page.locator('#catalog')).toBeVisible();

    await expectNoCspViolations(page);
    expect(cspMessages).toEqual([]);
  });

  test('search results surface route metadata and images without overflow', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/search/?q=archive', '#pagefindSearch');

    const archiveMeta = page.locator('.portfolio-result-meta').filter({ hasText: 'Archive' }).first();
    await expect(archiveMeta).toBeVisible({ timeout: 20_000 });
    await expect(archiveMeta).toContainText('Portfolio');
    await expect(archiveMeta).toContainText(/\d{4}-\d{2}-\d{2}/);
    const archiveCard = page.locator('.portfolio-result-card').filter({
      has: page.locator('.portfolio-result-meta').filter({ hasText: 'Archive' }),
    }).first();
    await expect(archiveCard.locator('.portfolio-result-image')).toBeVisible();
    await expect(page.locator('[data-pagefind-shell]')).toHaveAttribute('data-pagefind-state', 'ready');
    await expect(page.locator('#pagefindLoading')).toBeHidden();
    await expect(page.locator('#pagefindFallback')).toBeHidden();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 900 });
    await preparePage(page, '/search/?q=python', '#pagefindSearch');
    const projectMeta = page.locator('.portfolio-result-meta').filter({ hasText: /Project|Live app/ }).first();
    await expect(projectMeta).toBeVisible({ timeout: 20_000 });
    await expect(projectMeta).toContainText(/\d{4}-\d{2}-\d{2}/);
    const projectCard = page.locator('.portfolio-result-card').filter({
      has: page.locator('.portfolio-result-meta').filter({ hasText: /Project|Live app/ }),
    }).first();
    await expect(projectCard.locator('.portfolio-result-image')).toBeVisible();
    await expect(page.locator('[data-pagefind-shell]')).toHaveAttribute('data-pagefind-state', 'ready');
    await expect(page.locator('#pagefindFallback')).toBeHidden();
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('search no-result state stays calm and navigable', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/search/?q=zzzz-no-results-2026', '#pagefindSearch');

    await expect(page.locator('pagefind-summary .pf-summary')).toContainText('No results', { timeout: 20_000 });
    await expect(page.locator('.pf-results .portfolio-result-card')).toHaveCount(0);
    await expect(page.locator('[data-pagefind-shell]')).toHaveAttribute('data-pagefind-state', 'ready');
    await expect(page.locator('#pagefindFallback')).toBeHidden();
    await expectSearchFallbackLinks(page);
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('search missing bundle exposes fallback recovery without overflow', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.route('**/pagefind/pagefind-component-ui.js', (route) =>
      route.fulfill({
        contentType: 'text/javascript; charset=utf-8',
        body: '/* Pagefind bundle intentionally unavailable for degraded-state smoke coverage. */',
      }),
    );

    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/search/?q=archive', '#pagefindSearch');
    await expect(page.locator('[data-pagefind-shell]')).toHaveAttribute('data-pagefind-state', 'degraded', { timeout: 6_000 });
    await expect(page.locator('#pagefindLoading')).toBeHidden();
    await expect(page.locator('#pagefindFallback')).toBeVisible();
    await expect(page.locator('#pagefindFallback')).toContainText('Search fallback active.');
    await expect(page.locator('#pagefindFallback a[href="#search-fallbacks"]')).toBeVisible();
    await expect(page.locator('#pagefindFallback a[href="/#catalog"]')).toBeVisible();
    await expectSearchFallbackLinks(page);
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 900 });
    await preparePage(page, '/search/?q=archive', '#pagefindSearch');
    await expect(page.locator('[data-pagefind-shell]')).toHaveAttribute('data-pagefind-state', 'degraded', { timeout: 6_000 });
    await expect(page.locator('#pagefindFallback')).toBeVisible();
    await expect(page.locator('#pagefindFallback a[href="#search-fallbacks"]')).toBeVisible();
    await expect(page.locator('#pagefindFallback a[href="/#catalog"]')).toBeVisible();
    await expectSearchFallbackLinks(page);
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('homepage command palette works without runtime errors', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const cmdkScriptRequests = collectCmdkScriptRequests(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/', '#heroTerm.interactive');

    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
      'content',
      /style-src-elem 'self' 'sha256-/,
    );
    await expectNoHorizontalOverflow(page);
    expect(cmdkScriptRequests).toEqual([]);
    await expect(page.locator('script[src="/scripts/cmdk.js"]')).toHaveCount(0);

    await page.keyboard.press('Control+K');
    await expectCommandPaletteState(page, false);
    expect(cmdkScriptRequests).toEqual([]);

    await openCommandPalette(page);
    await expect(page.locator('#cmdk')).toBeVisible();
    await expect.poll(async () => cmdkScriptRequests.length).toBe(1);
    await expect(page.locator('script[src="/scripts/cmdk.js"]')).toHaveCount(1);
    await page.locator('#cmdkInput').fill('python');
    await expect(page.locator('#cmdkList .cmdk-item')).not.toHaveCount(0);
    await page.keyboard.press('Escape');
    await expectCommandPaletteState(page, false);
    await openCommandPalette(page);
    await page.locator('#cmdkInput').fill('python');
    await page.locator('#cmdkClose').click();
    await expectCommandPaletteState(page, false);
    await openCommandPalette(page);
    await page.locator('#cmdkInput').fill('zzzz-no-results-2026');
    await expect(page.locator('#cmdkMeta')).toContainText('Nothing matched that search');
    await expect(page.locator('#cmdkList .cmdk-empty')).toContainText('Nothing matched that search');
    await expect(page.locator('#cmdkList .cmdk-item')).toHaveCount(0);
    await expect(page.locator('#cmdkInput')).toHaveAttribute('aria-activedescendant', '');
    await page.locator('#cmdkInput').fill('search');
    await expect(page.locator('#cmdkMeta')).toContainText(/matches ready to open|match ready to open/);
    await expect.poll(async () => page.locator('#cmdkList .cmdk-item').count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('#cmdkInput')).toHaveAttribute('aria-activedescendant', /^cmdk-option-\d+$/);
    await page.keyboard.press('Escape');
    await expectCommandPaletteState(page, false);
    await openCommandPalette(page);
    await page.locator('#cmdkInput').fill('search');
    await expect(page.locator('#cmdkMeta')).toContainText(/matches ready to open|match ready to open/);
    await expect.poll(async () => page.locator('#cmdkList .cmdk-item').count()).toBeGreaterThanOrEqual(2);
    const firstActiveId = await page.locator('#cmdkInput').getAttribute('aria-activedescendant');
    const firstSelected = page.locator('#cmdkList .cmdk-item[aria-selected="true"]');
    const firstHref = await firstSelected.getAttribute('data-href');
    expect(firstActiveId).toMatch(/^cmdk-option-\d+$/);
    expect(firstHref).toMatch(/^\/[^/]/);
    await expect(firstSelected).toHaveAttribute('id', firstActiveId);
    await page.keyboard.press('ArrowDown');
    const secondActiveId = await page.locator('#cmdkInput').getAttribute('aria-activedescendant');
    expect(secondActiveId).toMatch(/^cmdk-option-\d+$/);
    expect(secondActiveId).not.toBe(firstActiveId);
    await expect(page.locator(`#${secondActiveId}`)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#cmdkInput')).toHaveAttribute('aria-activedescendant', firstActiveId);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(firstHref)}$`));
    await expectCommandPaletteState(page, false);
    await preparePage(page, '/', '#heroTerm.interactive');
    await openCommandPalette(page);
    await page.mouse.click(8, 8);
    await expectCommandPaletteState(page, false);
    await openCommandPalette(page);
    await page.locator('#cmdkInput').fill('search');
    await expect(page.locator('#cmdkMeta')).toContainText(/matches ready to open|match ready to open/);
    const pointerTarget = page.locator('#cmdkList .cmdk-item').first();
    const pointerHref = await pointerTarget.getAttribute('data-href');
    expect(pointerHref).toMatch(/^\/[^/]/);
    await pointerTarget.dispatchEvent('click');
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(pointerHref)}$`));
    await expectCommandPaletteState(page, false);
    await preparePage(page, '/', '#heroTerm.interactive');

    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('command palette section results update the hash and focus the target section', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const cmdkScriptRequests = collectCmdkScriptRequests(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/', '#heroTerm.interactive');
    await expectNoHorizontalOverflow(page);
    expect(cmdkScriptRequests).toEqual([]);
    await expect(page.locator('script[src="/scripts/cmdk.js"]')).toHaveCount(0);

    await page.locator('#cmdkToggle').click();
    await expectCommandPaletteState(page, true);
    await expect.poll(async () => cmdkScriptRequests.length).toBe(1);
    await expect(page.locator('script[src="/scripts/cmdk.js"]')).toHaveCount(1);
    await page.locator('#cmdkInput').fill('catalog');
    const catalogSectionResult = page.locator('#cmdkList .cmdk-item[data-href="#catalog"]').first();
    await expect(catalogSectionResult).toBeVisible();
    await catalogSectionResult.click();

    await expect(page).toHaveURL(/#catalog$/);
    await expectCommandPaletteState(page, false);
    await expect.poll(async () => page.evaluate(() => document.activeElement?.id ?? '')).toBe('catalog');
    await expect.poll(async () => page.locator('#catalog').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top >= 0 && rect.top < 180 && rect.bottom > rect.top;
    })).toBe(true);
    const targetPosition = await page.locator('#catalog').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        viewportHeight: window.innerHeight,
      };
    });
    expect(targetPosition.top).toBeGreaterThanOrEqual(0);
    expect(targetPosition.top).toBeLessThan(180);
    expect(targetPosition.bottom).toBeGreaterThan(targetPosition.top);
    expect(targetPosition.bottom).toBeGreaterThan(0);
    expect(targetPosition.viewportHeight).toBeGreaterThan(0);

    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('homepage terminal, video, and catalog search work without runtime errors', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/', '#heroTerm.interactive');
    await expectNoHorizontalOverflow(page);

    await page.locator('#heroTerm').click();
    await expect(page.locator('.term-input')).toBeVisible();
    await page.locator('.term-input').fill('contact');
    await page.keyboard.press('Enter');
    await expect(page.locator('.term-output').last()).toContainText('Connect section');
    await expect(page).toHaveURL(/#connect$/);

    await page.locator('#searchInput').fill('python');
    await page.locator('#catalogSearchForm').evaluate((form) => form.requestSubmit());
    await expect(page.locator('#catalogStatus')).toContainText(/python/i);
    await expect(page.locator('#catalogGrid .ca:visible')).not.toHaveCount(0);

    const videoThumb = page.locator('.video-thumb[data-yt]').first();
    if (await videoThumb.count()) {
      await videoThumb.click();
      await expect(page.locator('.video-close')).toBeVisible();
      await page.locator('.video-close').click();
      await expect(page.locator('.video-close')).toHaveCount(0);
    }

    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('language lane project navigation works without runtime errors or overflow', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await preparePage(page, '/lang/python/', '#lane-projects');

    await expect(page.locator('main.lang-page')).toBeVisible();
    await expect(page.locator('.lang-card[href="/projects/project-nomad-desktop/"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.locator('.lang-card[href="/projects/project-nomad-desktop/"]').click();
    await expect(page.locator('[data-project-slug="project-nomad-desktop"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('project share fallback works without runtime errors or overflow', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async () => undefined },
        configurable: true,
      });
    });
    await preparePage(page, '/projects/project-nomad-desktop/', '[data-project-slug="project-nomad-desktop"]');

    await expectNoHorizontalOverflow(page);
    await page.locator('[data-project-share]').click();
    await expect(page.locator('#project-share-status')).toContainText(/copied/i);
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });
});
