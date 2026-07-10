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
    await preparePage(page, '/', '#hero');

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
    await expect(page.locator('pagefind-filter-pane')).toContainText('Scope', { timeout: 20_000 });
    await expect(page.locator('pagefind-filter-pane')).toContainText('Category');

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
    await preparePage(page, '/search/?q=%22zzqqxxwwvvppllkj%22', '#pagefindSearch');

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

  test('search stalled component initialization exposes fallback recovery', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.route('**/pagefind/pagefind-component-ui.js', (route) =>
      route.fulfill({
        contentType: 'text/javascript; charset=utf-8',
        body: [
          'window.PagefindComponents={',
          '  getInstanceManager(){',
          '    return { getInstance(){ return null; } };',
          '  }',
          '};',
        ].join('\n'),
      }),
    );

    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/search/?q=archive', '#pagefindSearch');
    await expect(page.locator('[data-pagefind-shell]')).toHaveAttribute('data-pagefind-state', 'degraded', { timeout: 6_000 });
    await expect(page.locator('#pagefindLoading')).toBeHidden();
    await expect(page.locator('#pagefindFallback')).toContainText('did not finish loading');
    await expect(page.locator('#pagefindFallback a[href="#search-fallbacks"]')).toBeVisible();
    await expect(page.locator('#pagefindFallback a[href="/#catalog"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('homepage command palette works without runtime errors', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const cmdkScriptRequests = collectCmdkScriptRequests(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/', '#hero');

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
    await page.locator('#cmdkInput').fill('zzqqxxwwvvppllkj');
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
    await preparePage(page, '/', '#hero');
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
    await preparePage(page, '/', '#hero');

    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('command palette flushes typed searches before Enter navigation', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/', '#hero');

    await openCommandPalette(page);
    await page.locator('#cmdkInput').fill('timeline');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/timeline\/$/);
    await expect(page.locator('main.timeline-page')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('command search reports a load failure and retries successfully', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const commandScript = '**/scripts/cmdk.js';
    await page.route(commandScript, route => route.fulfill({
      contentType: 'application/javascript; charset=utf-8',
      body: '/* Simulated command search initialization failure. */',
    }));
    await preparePage(page, '/', '#hero');

    const toggle = page.locator('#cmdkToggle');
    await toggle.click();
    await expect(page.locator('.cmdk-load-feedback')).toContainText("Command search couldn't load. Try again.");
    await expect(toggle).toHaveAttribute('aria-label', 'Retry command search');
    await expect(toggle).toHaveAttribute('data-load-state', 'error');
    await expect(toggle).toBeFocused();

    await page.unroute(commandScript);
    await toggle.click();
    await expectCommandPaletteState(page, true);
    await expect(page.locator('.cmdk-load-feedback')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-label', 'Open command search');
    await page.keyboard.press('Escape');

    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('malformed section hashes do not break page navigation', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await preparePage(page, '/uses/#%E0%A4%A', '#uses-overview');

    await expect(page.locator('main')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('command palette section results update the hash and focus the target section', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const cmdkScriptRequests = collectCmdkScriptRequests(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/', '#hero');
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

  test('homepage video and catalog search work without runtime errors', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/', '#hero');
    await expectNoHorizontalOverflow(page);

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

  test('mobile navigation clears backdrop and scroll lock through the shared close path', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 1000, height: 900 });
    await preparePage(page, '/', '#hero');

    await page.locator('#mobileToggle').click();
    await expect(page.locator('#navLinks')).toHaveClass(/open/);
    await expect(page.locator('#navBackdrop')).toHaveClass(/show/);
    await expect(page.locator('#navBackdrop')).toHaveAttribute('aria-hidden', 'true');
    await expect.poll(() => page.locator('#navBackdrop').evaluate((node) => getComputedStyle(node).display)).toBe('block');
    await expect(page.locator('html')).toHaveClass(/mobile-nav-open/);
    await expect(page.locator('#mobileToggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#navLinks')).not.toHaveAttribute('role', 'dialog');
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await expect(page.locator('.nl')).toHaveAttribute('inert', '');

    await page.evaluate(() => window.PortfolioNav.closeMobileNav({ returnFocus: false }));
    await expect(page.locator('#navLinks')).not.toHaveClass(/open/);
    await expect(page.locator('#navBackdrop')).not.toHaveClass(/show/);
    await expect(page.locator('#navBackdrop')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('html')).not.toHaveClass(/mobile-nav-open/);
    await expect(page.locator('#mobileToggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    await expect(page.locator('.nl')).not.toHaveAttribute('inert', '');

    await page.setViewportSize({ width: 390, height: 900 });
    await preparePage(page, '/', '#hero');
    await page.locator('#mobileToggle').click();
    await expect(page.locator('#navLinks')).toHaveClass(/open/);
    await page.evaluate(() => {
      Object.defineProperty(window, 'scrollY', { configurable: true, get: () => 700 });
      window.dispatchEvent(new Event('scroll'));
    });
    await expect.poll(() => page.evaluate(() => ({
      expanded: document.getElementById('mobileToggle')?.getAttribute('aria-expanded'),
      locked: document.documentElement.classList.contains('mobile-nav-open'),
      menuOpen: document.getElementById('navLinks')?.classList.contains('open'),
      backdropShown: document.getElementById('navBackdrop')?.classList.contains('show'),
    }))).toEqual({
      expanded: 'false',
      locked: false,
      menuOpen: false,
      backdropShown: false,
    });

    await preparePage(page, '/', '#hero');
    await page.locator('#mobileToggle').click();
    await expect(page.locator('#navLinks')).toHaveClass(/open/);
    await page.locator('#navLinks a[href="#catalog"]').click();
    await expect(page.locator('#navLinks')).not.toHaveClass(/open/);
    await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).not.toBe('mobileToggle');

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
        value: { writeText: async () => { throw new Error('clipboard unavailable'); } },
        configurable: true,
      });
      Document.prototype.execCommand = () => true;
    });
    await preparePage(page, '/projects/project-nomad-desktop/', '[data-project-slug="project-nomad-desktop"]');

    await expectNoHorizontalOverflow(page);
    await page.locator('[data-project-share]').click();
    await expect(page.locator('#project-share-status')).toContainText(/copied/i);
    await expect(page.locator('[data-project-share]')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[data-project-share]')).toBeFocused();
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('screenshot viewer opens, zooms, and closes with keyboard', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await preparePage(page, '/projects/StormviewRadar/', '[data-project-slug="StormviewRadar"]');

    const trigger = page.locator('[data-shot-viewer]');
    if (!(await trigger.count())) {
      test.skip(true, 'StormviewRadar has no screenshot trigger in this build');
      return;
    }

    await trigger.click();
    const dialog = page.locator('#shotViewer');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.sv-img')).toHaveAttribute('alt', /StormviewRadar/);
    await expect(dialog.locator('.sv-caption')).toContainText('StormviewRadar');
    await expect(dialog.locator('.sv-live')).toBeVisible();
    await expect(dialog.locator('.sv-source')).toBeVisible();
    await expect(dialog.locator('.sv-zoom')).toContainText('Fit');

    await dialog.locator('.sv-zoom').click();
    await expect(dialog.locator('.sv-zoom')).toContainText('100%');
    await expect(dialog.locator('.sv-img')).toHaveClass(/sv-img-zoom/);

    await dialog.locator('.sv-zoom').click();
    await expect(dialog.locator('.sv-zoom')).toContainText('Fit');

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect.poll(async () => page.evaluate(() => document.activeElement?.hasAttribute('data-shot-viewer') ?? false)).toBe(true);

    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('screenshot viewer reports failed share fallback without runtime errors', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async () => { throw new Error('clipboard unavailable'); } },
        configurable: true,
      });
      Document.prototype.execCommand = () => false;
    });
    await preparePage(page, '/projects/StormviewRadar/', '[data-project-slug="StormviewRadar"]');

    const trigger = page.locator('[data-shot-viewer]');
    if (!(await trigger.count())) {
      test.skip(true, 'StormviewRadar has no screenshot trigger in this build');
      return;
    }

    await trigger.click();
    const dialog = page.locator('#shotViewer');
    await expect(dialog).toBeVisible();
    await dialog.locator('.sv-share').click();
    await expect(dialog.locator('.sv-status')).toContainText("Couldn't copy. Copy the address from your browser.");
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('screenshot viewer opens via ?shot=1 deep link and updates URL state', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await preparePage(page, '/projects/StormviewRadar/?shot=1', '[data-project-slug="StormviewRadar"]');

    const trigger = page.locator('[data-shot-viewer]');
    if (!(await trigger.count())) {
      test.skip(true, 'StormviewRadar has no screenshot trigger in this build');
      return;
    }

    const dialog = page.locator('#shotViewer');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.sv-img')).toHaveAttribute('alt', /StormviewRadar/);

    expect(page.url()).toContain('shot=1');
    await expect(dialog.locator('.sv-share')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    expect(page.url()).not.toContain('shot=1');

    expect(runtimeErrors).toEqual([]);
  });
});

test.describe('cross-document view transition smoke', () => {
  test('navigating between pages produces no console errors', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await preparePage(page, '/', 'main');

    const title1 = await page.title();
    expect(title1).toBeTruthy();

    await page.locator('a[href="/search/"]').first().click();
    await page.waitForURL('**/search/**');
    await page.locator('main').waitFor({ state: 'visible' });

    const title2 = await page.title();
    expect(title2).not.toEqual(title1);
    expect(title2).toContain('Search');

    await page.getByRole('link', { name: 'Home' }).dispatchEvent('click');
    await page.waitForURL(/\/$/);
    await page.locator('main').waitFor({ state: 'visible' });

    expect(runtimeErrors).toEqual([]);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('catalog URL-state persistence', () => {
  test('category filter updates URL and survives reload', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await preparePage(page, '/#catalog', '#catalog');

    const catalogSearch = page.locator('.search-input');
    await expect(catalogSearch).toBeVisible();

    const filterBtn = page.locator('.fb[data-filter]:not([data-filter="all"])').first();
    if (!(await filterBtn.count())) {
      test.skip(true, 'No category filter buttons in this build');
      return;
    }

    const category = await filterBtn.getAttribute('data-filter');
    await filterBtn.click();

    await expect.poll(() => page.url()).toContain(`cat=${category}`);

    await page.reload({ waitUntil: 'load' });
    await page.locator('#catalog').waitFor({ state: 'visible' });

    expect(page.url()).toContain(`cat=${category}`);

    const activeFilter = page.locator(`.fb[data-filter="${category}"].act`);
    await expect(activeFilter).toBeVisible();
    await expect(activeFilter).toHaveAttribute('aria-pressed', 'true');

    expect(runtimeErrors).toEqual([]);
  });
});

test.describe('timeline URL-state persistence', () => {
  test('the timeline fold toggles without discarding keyboard focus', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await preparePage(page, '/timeline/', '#timeline-events');

    const fold = page.locator('#timelineShowMoreBtn');
    if (!(await fold.count())) {
      test.skip(true, 'Timeline does not exceed the initial fold in this build');
      return;
    }

    await fold.focus();
    await fold.click();
    await expect(fold).toHaveAttribute('aria-expanded', 'true');
    await expect(fold).toContainText('Show fewer events');
    await expect(fold).toBeFocused();
    await expect(page.locator('[data-beyond-fold]:visible')).not.toHaveCount(0);

    await fold.click();
    await expect(fold).toHaveAttribute('aria-expanded', 'false');
    await expect(fold).toContainText(/Show \d+ more events/);
    await expect(fold).toBeFocused();
    await expect(page.locator('[data-beyond-fold]:visible')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('filters update URL, survive reload, and expose an empty state', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await preparePage(page, '/timeline/', '#timeline-events');

    const combo = await page.evaluate(() => {
      const optionValues = (selector) => Array.from(document.querySelectorAll(`${selector} option`))
        .map(option => option.value)
        .filter(value => value !== 'all');
      const years = optionValues('#timelineYear');
      const platforms = optionValues('#timelinePlatform');
      const categories = optionValues('#timelineCategory');
      const languages = optionValues('#timelineLanguage');
      const events = Array.from(document.querySelectorAll('[data-timeline-event]'))
        .map(event => ({
          year: event.getAttribute('data-year'),
          platform: event.getAttribute('data-platform'),
          category: event.getAttribute('data-category'),
          language: event.getAttribute('data-language'),
        }));
      for (const year of years) {
        for (const platform of platforms) {
          for (const category of categories) {
            for (const language of languages) {
              const hasMatch = events.some(event =>
                event.year === year &&
                event.platform === platform &&
                event.category === category &&
                event.language === language,
              );
              if (!hasMatch) {
                return { year, platform, category, language };
              }
            }
          }
        }
      }
      return null;
    });
    if (!combo) {
      test.skip(true, 'No empty timeline filter combination in this build');
      return;
    }

    await page.locator('#timelineYear').selectOption(combo.year);
    await page.locator('#timelinePlatform').selectOption(combo.platform);
    await page.locator('#timelineCategory').selectOption(combo.category);
    await page.locator('#timelineLanguage').selectOption(combo.language);
    await expect.poll(() => page.url()).toContain(`year=${combo.year}`);
    await expect.poll(() => page.url()).toContain(`platform=${combo.platform}`);
    await expect.poll(() => page.url()).toContain(`category=${combo.category}`);
    await expect.poll(() => page.url()).toContain(`language=${combo.language}`);
    await expect(page.locator('#timelineStatus')).toContainText('No timeline events match');
    await expect(page.locator('#timelineEmpty')).toBeVisible();

    await page.reload({ waitUntil: 'load' });
    await page.locator('#timeline-events').waitFor({ state: 'visible' });
    await expect(page.locator('#timelineYear')).toHaveValue(combo.year);
    await expect(page.locator('#timelinePlatform')).toHaveValue(combo.platform);
    await expect(page.locator('#timelineCategory')).toHaveValue(combo.category);
    await expect(page.locator('#timelineLanguage')).toHaveValue(combo.language);
    await expect(page.locator('#timelineEmpty')).toBeVisible();

    await page.locator('#timelineReset').click();
    await expect.poll(() => page.url()).not.toContain('year=');
    await expect.poll(() => page.url()).not.toContain('platform=');
    await expect.poll(() => page.url()).not.toContain('category=');
    await expect.poll(() => page.url()).not.toContain('language=');
    await expect(page.locator('#timelineEmpty')).toBeHidden();
    await expect(page.locator('#timelineReset')).toBeDisabled();
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });
});

test.describe('screenshots gallery filters', () => {
  test('category filter updates pressed state, URL, status, and reload state', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await preparePage(page, '/screenshots/', '#screenshots-gallery');

    const filterBtn = page.locator('.screenshots-filter-btn[data-filter]:not([data-filter="all"])').first();
    if (!(await filterBtn.count())) {
      test.skip(true, 'No screenshot category filters in this build');
      return;
    }

    const category = await filterBtn.getAttribute('data-filter');
    await filterBtn.click();

    await expect.poll(() => page.url()).toContain(`cat=${category}`);
    await expect(filterBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#screenshotsStatus')).toContainText('Showing');
    await expect(page.locator('.screenshots-card:visible')).not.toHaveCount(0);
    await expect(page.locator(`.screenshots-card[data-category="${category}"]:visible`)).not.toHaveCount(0);

    await page.reload({ waitUntil: 'load' });
    await page.locator('#screenshots-gallery').waitFor({ state: 'visible' });
    await expect(page.locator(`.screenshots-filter-btn[data-filter="${category}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('invalid screenshot category query resets to the all view', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await preparePage(page, '/screenshots/?cat=not-a-category', '#screenshots-gallery');

    await expect(page.locator('.screenshots-filter-btn[data-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.url()).not.toContain('cat=not-a-category');
    const filterBox = await page.locator('.screenshots-filter-btn[data-filter="all"]').boundingBox();
    expect(filterBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(page.locator('#screenshotsStatus')).toContainText('Showing all');
    await expectNoHorizontalOverflow(page);
    expect(runtimeErrors).toEqual([]);
  });
});

test.describe('focus-not-obscured by sticky navigation', () => {
  test('tabbing through interactive elements keeps focus visible above the sticky nav', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await preparePage(page, '/search/', '#site-search');

    const navRect = await page.evaluate(() => {
      const nav = document.querySelector('nav') || document.querySelector('header');
      if (!nav) return null;
      const rect = nav.getBoundingClientRect();
      return { bottom: rect.bottom, height: rect.height };
    });
    if (!navRect) {
      test.skip(true, 'No nav element found');
      return;
    }

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const focusInfo = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return null;
        const x = Math.min(Math.max(rect.left + rect.width / 2, 0), window.innerWidth - 1);
        const y = Math.min(Math.max(rect.top + rect.height / 2, 0), window.innerHeight - 1);
        const topElement = document.elementFromPoint(x, y);
        const reachable = Boolean(topElement && (el === topElement || el.contains(topElement) || topElement.contains(el)));
        return {
          tag: el.tagName,
          obscured: !reachable,
        };
      });

      if (focusInfo) {
        expect(focusInfo.obscured, `${focusInfo.tag} element obscured by sticky nav`).toBe(false);
      }
    }

    expect(runtimeErrors).toEqual([]);
  });
});
