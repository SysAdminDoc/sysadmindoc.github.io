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

test.describe('rendered interaction smoke', () => {
  test('homepage command palette works without runtime errors', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.setViewportSize({ width: 1365, height: 900 });
    await preparePage(page, '/', '#heroTerm.interactive');

    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
      'content',
      /style-src-elem 'self' 'sha256-/,
    );
    await expectNoHorizontalOverflow(page);

    await page.locator('#cmdkToggle').click();
    await expect(page.locator('#cmdk')).toBeVisible();
    await expectCommandPaletteState(page, true);
    await page.locator('#cmdkInput').fill('python');
    await expect(page.locator('#cmdkList .cmdk-item')).not.toHaveCount(0);
    await page.keyboard.press('Escape');
    await expectCommandPaletteState(page, false);
    await page.keyboard.press('Control+K');
    await expectCommandPaletteState(page, true);
    await page.locator('#cmdkInput').fill('python');
    await page.keyboard.press('Control+K');
    await expectCommandPaletteState(page, false);
    await page.keyboard.press('Control+K');
    await expectCommandPaletteState(page, true);
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
    await page.keyboard.press('Control+K');
    await expectCommandPaletteState(page, true);
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
    await page.keyboard.press('Control+K');
    await expectCommandPaletteState(page, true);
    await page.mouse.click(8, 8);
    await expectCommandPaletteState(page, false);
    await page.keyboard.press('Control+K');
    await expectCommandPaletteState(page, true);
    await page.locator('#cmdkInput').fill('search');
    await expect(page.locator('#cmdkMeta')).toContainText(/matches ready to open|match ready to open/);
    const pointerTarget = page.locator('#cmdkList .cmdk-item').first();
    const pointerHref = await pointerTarget.getAttribute('data-href');
    expect(pointerHref).toMatch(/^\/[^/]/);
    await pointerTarget.click();
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(pointerHref)}$`));
    await expectCommandPaletteState(page, false);
    await preparePage(page, '/', '#heroTerm.interactive');

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
