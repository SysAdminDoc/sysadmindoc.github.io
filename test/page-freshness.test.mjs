import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { exportedArray, sourceFile } from '../scripts/lib/ts-data-utils.mjs';

const FRESHNESS_WARN_DAYS = 180;  // 6 months — warn but don't fail
const FRESHNESS_FAIL_DAYS = 365;  // 1 year — fail the test

const root = process.cwd();
const pageFreshnessPath = path.join(root, 'src', 'data', 'page-freshness.ts');
const expectedSchemaSlugs = ['uses', 'resume', 'search', 'timeline', 'archive', 'now', 'healthcare-it', 'releases'];
const expectedVisibleSlugs = ['uses', 'resume', 'healthcare-it'];

async function loadReviewedPages() {
  const text = await fs.readFile(pageFreshnessPath, 'utf8');
  return exportedArray(sourceFile(pageFreshnessPath, text), 'reviewedInteriorPages');
}

test('reviewed interior page schema data covers the T98 route set', async () => {
  const pages = await loadReviewedPages();
  const slugs = new Set(pages.map((page) => page.slug));

  assert.equal(slugs.size, pages.length, 'reviewed page slugs should be unique');
  assert.deepEqual([...slugs].sort(), [...expectedSchemaSlugs].sort());

  for (const page of pages) {
    assert.match(page.route, /^\/[a-z0-9-]+\/$/);
    assert.match(page.lastReviewed, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(Number.isNaN(new Date(`${page.lastReviewed}T00:00:00Z`).getTime()), false);
    assert.ok(Array.isArray(page.schemaTypes), `${page.slug} should declare schema types`);
    assert.ok(page.schemaTypes.includes('WebPage'), `${page.slug} should include WebPage as a base type`);
    assert.equal(typeof page.visibleFreshness, 'boolean');
  }

  const visibleSlugs = pages.filter((page) => page.visibleFreshness).map((page) => page.slug);
  assert.deepEqual(visibleSlugs.sort(), [...expectedVisibleSlugs].sort());
  assert.ok(pages.find((page) => page.slug === 'resume')?.schemaTypes.includes('ProfilePage'));
});

test('T43 pages render visible freshness and reviewed WebPage schema', async () => {
  const pages = (await loadReviewedPages()).filter((page) => page.visibleFreshness);

  for (const page of pages) {
    const routePath = path.join(root, 'src', 'pages', `${page.route.replace(/^\/|\/$/g, '')}.astro`);
    const source = await fs.readFile(routePath, 'utf8');

    assert.match(source, /pageFreshnessBySlug/, `${page.route} should read shared freshness data`);
    assert.match(source, /class="page-updated"/, `${page.route} should render the visible freshness row`);
    assert.match(source, /datetime=\{pageFreshness\.lastReviewed\}/, `${page.route} should bind the visible date to shared data`);
    assert.match(source, /reviewedWebPageJsonLd/, `${page.route} should emit reviewed WebPage JSON-LD`);
  }
});

test('T98 interior pages emit page-level JSON-LD from shared schema data', async () => {
  const pages = await loadReviewedPages();

  for (const page of pages) {
    const routePath = path.join(root, 'src', 'pages', `${page.route.replace(/^\/|\/$/g, '')}.astro`);
    const source = await fs.readFile(routePath, 'utf8');

    assert.match(source, /pageFreshnessBySlug/, `${page.route} should read shared schema data`);
    assert.match(source, /reviewedWebPageJsonLd/, `${page.route} should emit reviewed page JSON-LD`);
    assert.match(source, /application\/ld\+json/, `${page.route} should render an application/ld+json block`);
    assert.match(source, /schemaTypes: pageFreshness\.schemaTypes/, `${page.route} should bind schema types from shared data`);
  }
});

test('reviewed interior pages are not stale (warn >180 days, fail >365 days)', async () => {
  const pages = await loadReviewedPages();
  const now = Date.now();
  const stalePages = [];

  for (const page of pages) {
    // /now/ has its own separate freshness guard in validate-project-data.mjs
    if (page.route === '/now/') continue;

    const reviewedMs = new Date(`${page.lastReviewed}T00:00:00Z`).getTime();
    const ageDays = (now - reviewedMs) / (1000 * 60 * 60 * 24);

    if (ageDays > FRESHNESS_WARN_DAYS) {
      console.warn(
        `page-freshness: ${page.route} last reviewed ${page.lastReviewed} (${Math.floor(ageDays)} days ago) — consider updating`,
      );
    }

    if (ageDays > FRESHNESS_FAIL_DAYS) {
      stalePages.push(`${page.route} (${page.lastReviewed}, ${Math.floor(ageDays)} days ago)`);
    }
  }

  assert.deepEqual(
    stalePages,
    [],
    `These reviewed pages are older than ${FRESHNESS_FAIL_DAYS} days and must be re-reviewed:\n  ${stalePages.join('\n  ')}`,
  );
});
