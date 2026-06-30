import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const stableNow = Date.parse('2026-06-04T12:00:00Z');
const routes = [
  { name: 'home', path: '/', ready: 'main' },
  { name: 'search', path: '/search/?q=python', ready: '#site-search' },
  { name: 'archive', path: '/archive/', ready: '#archive-entries' },
  { name: 'project-nomad', path: '/projects/project-nomad-desktop/', ready: '[data-project-slug="project-nomad-desktop"]' },
];
const viewports = [
  { name: 'desktop', width: 1365, height: 900 },
  { name: 'mobile', width: 390, height: 900 },
];
const targetSizeMinimum = 24;

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
  await page.route('https://api.github.com/**', (route) => route.abort());
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
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
  await page.locator(readySelector).waitFor({ state: 'visible' });
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

async function collectTargetSizeViolations(page) {
  return page.evaluate((minimum) => {
    const selector = [
      'a[href]',
      'button',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      'summary',
      'label[for]',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[role="tab"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const pageTargets = Array.from(document.querySelectorAll(selector))
      .filter((element) => {
        if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
        if (element.closest('[hidden],[aria-hidden="true"],[inert]')) return false;
        if (element.classList.contains('sr-only')) return false;
        if ('disabled' in element && element.disabled) return false;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const rect = element.getBoundingClientRect();
        const isVisuallyHidden = style.position === 'absolute'
          && rect.width <= 1
          && rect.height <= 1
          && (style.overflow === 'hidden' || style.clip !== 'auto' || style.clipPath !== 'none');
        if (isVisuallyHidden) return false;
        return element.getClientRects().length > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          element,
          rect: {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
            right: rect.right + window.scrollX,
            bottom: rect.bottom + window.scrollY,
            width: rect.width,
            height: rect.height,
          },
          display: style.display,
          lineHeight: Number.parseFloat(style.lineHeight) || rect.height,
        };
      })
      .filter((target) => target.rect.width > 0 && target.rect.height > 0);

    function cssPath(element) {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const parts = [];
      let node = element;
      while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.body && parts.length < 4) {
        const tag = node.tagName.toLowerCase();
        const className = Array.from(node.classList).slice(0, 2).map((name) => `.${CSS.escape(name)}`).join('');
        const parent = node.parentElement;
        const index = parent ? Array.from(parent.children).filter((child) => child.tagName === node.tagName).indexOf(node) + 1 : 1;
        parts.unshift(`${tag}${className}:nth-of-type(${index})`);
        node = parent;
      }
      return parts.join(' > ');
    }

    function isInlineException(target) {
      if (!target.element.matches('a[href]')) return false;
      const inTextFlow = target.element.closest('p,li,dd,blockquote,figcaption,td');
      if (!inTextFlow) return false;
      return target.display === 'inline' || target.rect.height <= target.lineHeight + 4;
    }

    function circleIntersectsRect(circle, rect) {
      const closestX = Math.max(rect.left, Math.min(circle.x, rect.right));
      const closestY = Math.max(rect.top, Math.min(circle.y, rect.bottom));
      return (circle.x - closestX) ** 2 + (circle.y - closestY) ** 2 < circle.r ** 2;
    }

    function passesSpacingException(target, index) {
      const circle = {
        x: target.rect.left + target.rect.width / 2,
        y: target.rect.top + target.rect.height / 2,
        r: minimum / 2,
      };
      return pageTargets.every((other, otherIndex) => {
        if (otherIndex === index) return true;
        if (other.rect.width < minimum || other.rect.height < minimum) {
          const otherCircle = {
            x: other.rect.left + other.rect.width / 2,
            y: other.rect.top + other.rect.height / 2,
          };
          return Math.hypot(circle.x - otherCircle.x, circle.y - otherCircle.y) >= minimum;
        }
        return !circleIntersectsRect(circle, other.rect);
      });
    }

    return pageTargets.flatMap((target, index) => {
      if (target.rect.width >= minimum && target.rect.height >= minimum) return [];
      if (isInlineException(target)) return [];
      if (passesSpacingException(target, index)) return [];
      return [{
        selector: cssPath(target.element),
        text: target.element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
        width: Number(target.rect.width.toFixed(1)),
        height: Number(target.rect.height.toFixed(1)),
        exception: 'none',
      }];
    });
  }, targetSizeMinimum);
}

test.describe('Playwright axe accessibility audit', () => {
  for (const route of routes) {
    test(`${route.name} route has no axe violations`, async ({ page }) => {
      await preparePage(page, route.path, route.ready);
      await expectAxeClean(page);
    });
  }

  test('hydrated command palette state has no axe violations', async ({ page }) => {
    await preparePage(page, '/', '#hero');

    await page.locator('#cmdkToggle').click();
    await page.locator('#cmdkInput').fill('python');
    await expect(page.locator('#cmdkList .cmdk-item')).not.toHaveCount(0);
    await expectAxeClean(page, '#cmdk');
  });

});

test.describe('WCAG 2.2 target-size audit', () => {
  for (const viewport of viewports) {
    for (const route of routes) {
      test(`${route.name} ${viewport.name} targets are at least ${targetSizeMinimum}px or spaced`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page, route.path, route.ready);
        if (testInfo.project.name.includes('light')) {
          await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
          await page.waitForTimeout(200);
        }

        expect(await collectTargetSizeViolations(page)).toEqual([]);
      });
    }
  }
});

test.describe('Playwright visual baselines', () => {
  for (const viewport of viewports) {
    for (const route of routes) {
      test(`${route.name} ${viewport.name} viewport matches baseline`, async ({ page }, testInfo) => {
        const isLight = testInfo.project.name.includes('light');
        const maskColor = isLight ? '#f0f0f3' : '#111827';
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page, route.path, route.ready);
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
