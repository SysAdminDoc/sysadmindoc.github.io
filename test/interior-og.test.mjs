import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { collectPortfolioRepos, exportedArray, sourceFile } from '../scripts/lib/ts-data-utils.mjs';

const root = process.cwd();
const interiorOgPagesPath = path.join(root, 'src', 'data', 'interior-og-pages.ts');
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const ogEndpointPath = path.join(root, 'src', 'pages', 'og', '[slug].png.ts');
const requiredSlugs = ['uses', 'resume', 'search', 'timeline', 'archive', 'now', 'healthcare-it', 'releases'];

async function loadInteriorOgPages() {
  const text = await fs.readFile(interiorOgPagesPath, 'utf8');
  return exportedArray(sourceFile(interiorOgPagesPath, text), 'interiorOgPages');
}

test('interior OG metadata covers the key secondary routes', async () => {
  const pages = await loadInteriorOgPages();
  const slugs = new Set(pages.map((page) => page.slug));

  assert.equal(slugs.size, pages.length, 'interior OG slugs should be unique');
  for (const slug of requiredSlugs) {
    assert.equal(slugs.has(slug), true, `missing interior OG slug ${slug}`);
  }

  for (const page of pages) {
    assert.equal(page.ogImage, `/og/${page.slug}.png`);
    assert.match(page.route, /^\/[a-z0-9-]+\/$/);
    assert.ok(page.title.length >= 3);
    assert.ok(page.description.length >= 40);
    assert.ok(page.ogImageAlt.endsWith('social preview card'));
  }
});

test('interior OG slugs are reserved away from project social cards', async () => {
  const [pages, projectsText] = await Promise.all([
    loadInteriorOgPages(),
    fs.readFile(projectsPath, 'utf8'),
  ]);
  const portfolioRefs = collectPortfolioRepos(projectsPath, projectsText);

  for (const page of pages) {
    assert.equal(portfolioRefs.has(page.slug), false, `${page.slug} collides with a project social-card slug`);
  }
});

test('interior pages pass generated OG metadata through Base', async () => {
  const pages = await loadInteriorOgPages();

  for (const page of pages) {
    const routePath = path.join(root, 'src', 'pages', `${page.route.replace(/^\/|\/$/g, '')}.astro`);
    const source = await fs.readFile(routePath, 'utf8');

    assert.match(source, /interiorOgPageBySlug/, `${page.route} should import shared OG metadata`);
    assert.match(source, /ogImage=\{pageOg\.ogImage\}/, `${page.route} should use generated ogImage`);
    assert.match(source, /ogImageAlt=\{pageOg\.ogImageAlt\}/, `${page.route} should use generated ogImageAlt`);
  }
});

test('OG endpoint generates interior and project social-card routes', async () => {
  const source = await fs.readFile(ogEndpointPath, 'utf8');

  assert.match(source, /interiorOgPages\.forEach/, 'getStaticPaths should add interior page slugs');
  assert.match(source, /getInteriorOgPage/, 'GET should resolve interior page card metadata');
  assert.match(source, /featured\.forEach/, 'project featured slugs should still be generated');
  assert.match(source, /liveApps\.forEach/, 'project live-app slugs should still be generated');
  assert.match(source, /catalog\.forEach/, 'project catalog slugs should still be generated');
});
