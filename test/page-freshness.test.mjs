import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { exportedArray, sourceFile } from '../scripts/lib/ts-data-utils.mjs';

const root = process.cwd();
const pageFreshnessPath = path.join(root, 'src', 'data', 'page-freshness.ts');
const expectedSlugs = ['uses', 'resume', 'healthcare-it'];

async function loadReviewedPages() {
  const text = await fs.readFile(pageFreshnessPath, 'utf8');
  return exportedArray(sourceFile(pageFreshnessPath, text), 'reviewedInteriorPages');
}

test('reviewed interior page freshness data covers T43 routes', async () => {
  const pages = await loadReviewedPages();
  const slugs = new Set(pages.map((page) => page.slug));

  assert.equal(slugs.size, pages.length, 'reviewed page slugs should be unique');
  assert.deepEqual([...slugs].sort(), [...expectedSlugs].sort());

  for (const page of pages) {
    assert.match(page.route, /^\/[a-z0-9-]+\/$/);
    assert.match(page.lastReviewed, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(Number.isNaN(new Date(`${page.lastReviewed}T00:00:00Z`).getTime()), false);
  }
});

test('T43 pages render visible freshness and reviewed WebPage schema', async () => {
  const pages = await loadReviewedPages();

  for (const page of pages) {
    const routePath = path.join(root, 'src', 'pages', `${page.route.replace(/^\/|\/$/g, '')}.astro`);
    const source = await fs.readFile(routePath, 'utf8');

    assert.match(source, /pageFreshnessBySlug/, `${page.route} should read shared freshness data`);
    assert.match(source, /class="page-updated"/, `${page.route} should render the visible freshness row`);
    assert.match(source, /datetime=\{pageFreshness\.lastReviewed\}/, `${page.route} should bind the visible date to shared data`);
    assert.match(source, /reviewedWebPageJsonLd/, `${page.route} should emit reviewed WebPage JSON-LD`);
  }
});
