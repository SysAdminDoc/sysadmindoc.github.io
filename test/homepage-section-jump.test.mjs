import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('homepage keeps command navigation without a redundant section jump band', async () => {
  const home = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');

  assert.doesNotMatch(home, /import SectionJumpNav/);
  assert.doesNotMatch(home, /home-jump-shell/);
  assert.doesNotMatch(home, /label: 'Project Mix', href: '#volume'/);
  assert.match(home, /label: 'Selected Work', href: '#greatest-hits'/);
  assert.match(home, /label: 'Project Catalog', href: '\/catalog\/'/);
  assert.match(home, /label: 'Live Apps', href: '#live'/);
  assert.ok(home.indexOf('<section id="live"') < home.indexOf('<section id="catalog"'));
  assert.doesNotMatch(home, /<CatalogSection\b/);
});

test('homepage nav hashes and rendered sections stay in correspondence', async () => {
  const home = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');
  const greatestHits = await fs.readFile(path.join(root, 'src', 'components', 'GreatestHits.astro'), 'utf8');
  const homeNav = await fs.readFile(path.join(root, 'public', 'scripts', 'home-nav.js'), 'utf8');

  // Sections observed at runtime: every `<section id>` on the homepage, plus the
  // Selected-work section rendered by the GreatestHits component.
  const sectionIds = new Set(
    [...home.matchAll(/<section[^>]*\bid="([^"]+)"/g)].map(([, id]) => id),
  );
  for (const [, id] of greatestHits.matchAll(/<section[^>]*\bid="([^"]+)"/g)) sectionIds.add(id);
  assert.ok(sectionIds.has('greatest-hits'), 'expected the Selected-work section id');

  // Nav anchors live between #navLinks and .nav-actions.
  const navBlock = home.slice(home.indexOf('id="navLinks"'), home.indexOf('class="nav-actions"'));
  const navHashes = [...navBlock.matchAll(/href="(#[^"]+)"/g)].map(([, href]) => href.slice(1));
  assert.ok(navHashes.length >= 3, 'expected at least three in-page nav links');

  // Every nav hash must resolve to a real rendered section.
  for (const hash of navHashes) {
    assert.ok(sectionIds.has(hash), `nav links to #${hash} but no section renders that id`);
  }

  // Every rendered section must either have its own nav link or be one of the
  // intentional no-direct-link sections the observer governs via a nearest
  // linked ancestor. Any new unlisted section is a correspondence gap.
  const governedWithoutOwnLink = new Set(['hero', 'live', 'catalog']);
  for (const id of sectionIds) {
    if (navHashes.includes(id)) continue;
    assert.ok(
      governedWithoutOwnLink.has(id),
      `section #${id} has no nav link and is not a known governed section — wire it or add it to the governed set`,
    );
  }

  // The observer must resolve a governing link per section (not blank the nav).
  assert.match(homeNav, /linkForId\.set\(sec\.id,\s*governing\)/);
  assert.match(homeNav, /const active=linkForId\.get\(entry\.target\.id\)/);
});
