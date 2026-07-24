import { expect, test } from '@playwright/test';

// Versioned Pagefind relevance corpus. Each entry is a representative query and
// the route its top result MUST resolve to. Frozen so any future ranking or
// weighting change (metadata weighting, sub-results, excerpt length) is judged
// against known-good expectations instead of trading one opaque ranking for
// another. Update deliberately — a changed top result is a relevance decision.
const CORPUS = [
  { q: 'powershell', top: '/lang/powershell/', dimension: 'platform' },
  { q: 'python', top: '/lang/python/', dimension: 'platform' },
  { q: 'security', top: '/lang/security/', dimension: 'platform' },
  { q: 'android', top: '/lang/kotlin/', dimension: 'platform' },
  { q: 'healthcare', top: '/healthcare-it/', dimension: 'domain' },
  { q: 'resume', top: '/resume/', dimension: 'role' },
  { q: 'systems administrator', top: '/resume/', dimension: 'role' },
  { q: 'releases', top: '/releases/', dimension: 'project' },
  { q: 'timeline', top: '/timeline/', dimension: 'project' },
  { q: 'AI services', top: '/ai/', dimension: 'ai' },
];

async function loadSearch(page, query) {
  await page.goto(`/search/?q=${encodeURIComponent(query)}`, { waitUntil: 'load' });
  await page.locator('#pagefindSearch').waitFor({ state: 'visible' });
  await expect(page.locator('[data-pagefind-shell]')).toHaveAttribute('data-pagefind-state', 'ready', {
    timeout: 20_000,
  });
  await page.locator('.portfolio-result-card').first().waitFor({ state: 'visible', timeout: 20_000 });
}

test.describe('Pagefind relevance corpus', () => {
  for (const { q, top, dimension } of CORPUS) {
    test(`"${q}" (${dimension}) surfaces ${top} as the top result with a useful excerpt`, async ({ page }) => {
      await loadSearch(page, q);

      // Expected top result — the single most important relevance guarantee.
      const firstLink = page.locator('.portfolio-result-card .pf-result-link').first();
      await expect(firstLink).toHaveAttribute('href', top);

      // Direct link is a real internal route (not empty / not off-site).
      const href = await firstLink.getAttribute('href');
      expect(href).toMatch(/^\/[\w/-]*\/?$/);

      // The top result carries a route-type facet chip and a non-empty excerpt.
      const firstCard = page.locator('.portfolio-result-card').first();
      await expect(firstCard.locator('.portfolio-result-meta span').first()).not.toBeEmpty();
      const excerpt = (await firstCard.locator('.pf-result-excerpt').first().textContent())?.trim() ?? '';
      expect(excerpt.length).toBeGreaterThan(0);

      // Fallback recovery is not shown when search is healthy.
      await expect(page.locator('#pagefindFallback')).toBeHidden();
    });
  }

  test('results expose distinct excerpts and the Scope facet', async ({ page }) => {
    await loadSearch(page, 'python');

    // The Scope filter facet is present (route-type narrowing).
    await expect(page.locator('pagefind-filter-pane')).toContainText('Scope', { timeout: 20_000 });

    // Top results have unique excerpts (no repeated boilerplate snippets).
    const excerpts = (await page.locator('.portfolio-result-card .pf-result-excerpt').allTextContents())
      .slice(0, 3)
      .map((text) => text.trim())
      .filter(Boolean);
    expect(excerpts.length).toBeGreaterThanOrEqual(2);
    expect(new Set(excerpts).size).toBe(excerpts.length);
  });
});
