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

const routes = [
  { name: 'home', path: '/', ready: '#heroTerm.interactive' },
  { name: 'search', path: '/search/?q=python', ready: '#site-search' },
  { name: 'archive', path: '/archive/', ready: '#archive-entries' },
  { name: 'language', path: '/lang/powershell/', ready: '.lang-card' },
  { name: 'project', path: '/projects/project-nomad-desktop/', ready: '[data-project-slug="project-nomad-desktop"]' },
];

async function installCandidateStyleAttrPolicy(page) {
  await page.route('https://api.github.com/**', (route) => route.abort());
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
  await page.route('**/__playwright-stability.css', (route) =>
    route.fulfill({
      contentType: 'text/css; charset=utf-8',
      body: stabilityCss,
    }),
  );
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.includes('/__playwright-stability.css')) {
      await route.fulfill({
        contentType: 'text/css; charset=utf-8',
        body: stabilityCss,
      });
      return;
    }
    if (url.startsWith('https://api.github.com/')) {
      await route.abort();
      return;
    }
    if (url.startsWith('https://www.youtube-nocookie.com/')) {
      await route.abort();
      return;
    }
    if (request.resourceType() !== 'document') {
      await route.continue();
      return;
    }

    const response = await route.fetch();
    const headers = response.headers();
    const contentType = headers['content-type'] ?? '';
    if (!contentType.includes('text/html')) {
      await route.fulfill({ response });
      return;
    }

    const body = (await response.text()).replace(
      /style-src-attr 'unsafe-inline'/g,
      "style-src-attr 'none'",
    );
    delete headers['content-length'];
    await route.fulfill({
      status: response.status(),
      headers,
      body,
    });
  });
}

async function installViolationRecorder(page) {
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
  }, stableNow);
}

async function prepareCandidatePage(page, route) {
  await installCandidateStyleAttrPolicy(page);
  await installViolationRecorder(page);
  await page.goto(route.path, { waitUntil: 'load' });
  await page.addStyleTag({ url: '/__playwright-stability.css' });
  await page.locator('main').waitFor({ state: 'visible' });
  await page.locator(route.ready).first().waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts?.ready;
  });
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    'content',
    /style-src-attr 'none'/,
  );
}

async function expectNoCspViolations(page) {
  const violations = await page.evaluate(() => window.__cspViolations ?? []);
  expect(violations).toEqual([]);
}

test.describe('candidate style CSP browser audit', () => {
  for (const route of routes) {
    test(`${route.name} route runs with style-src-attr none`, async ({ page }) => {
      await prepareCandidatePage(page, route);
      await expectNoCspViolations(page);
    });
  }

  test('home interactions run with style-src-attr none', async ({ page }) => {
    await prepareCandidatePage(page, routes[0]);

    await page.locator('#cmdkToggle').click();
    await page.locator('#cmdkInput').fill('python');
    await expect(page.locator('#cmdkList .cmdk-item')).not.toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.locator('#heroTerm').click();
    await expect(page.locator('.term-input')).toBeVisible();
    await page.locator('.term-input').fill('repos');
    await page.keyboard.press('Enter');
    await expect(page.locator('.term-output')).toBeVisible();

    const videoThumb = page.locator('.video-thumb[data-yt]').first();
    if (await videoThumb.count()) {
      await videoThumb.click();
      await expect(page.locator('.video-close')).toBeVisible();
      await page.locator('.video-close').click();
    }

    await expectNoCspViolations(page);
  });

  test('project share fallback runs with style-src-attr none', async ({ page }) => {
    await prepareCandidatePage(page, routes[4]);

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async () => undefined },
        configurable: true,
      });
    });
    await page.reload({ waitUntil: 'load' });
    await page.locator(routes[4].ready).waitFor({ state: 'visible' });
    await page.locator('[data-project-share]').click();
    await expect(page.locator('#project-share-status')).toContainText(/copied|shared/i);
    await expectNoCspViolations(page);
  });
});
