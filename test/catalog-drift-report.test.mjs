import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { buildGeneratedDataTrust } from '../src/data/generated-trust.ts';

const root = process.cwd();

// A fresh production-shaped input, so each case below isolates the catalog field
// under test instead of tripping the freshness or coverage warnings.
function freshInput(overrides = {}) {
  const now = new Date();
  const at = now.toISOString();
  return {
    stats: { fetchedAt: at, totalRepos: 4, totalStars: 10 },
    starEntries: 4,
    metadataEntries: 4,
    readmeEntries: 4,
    releaseEntries: 0,
    releases: [],
    profileFeedInfo: { active: true, source: 'feed', projectCount: 4, cachedAt: at },
    readmeRefresh: { source: 'github-api', tokenPresent: true, totalPublicRepos: 4, attempted: 4, misses: 0, cacheEntries: 4, rateLimited: false, skippedReason: null },
    now,
    ...overrides,
  };
}

test('a missing catalog drift record reports unmeasured, never complete', () => {
  const trust = buildGeneratedDataTrust(freshInput());

  assert.equal(trust.catalogCompleteness.measured, false);
  assert.equal(trust.catalogCompleteness.complete, null);
  assert.deepEqual(trust.catalogCompleteness.uncataloged, []);
  assert.ok(
    trust.warnings.some((warning) => /completeness was not measured/i.test(warning)),
    'an unchecked catalog must warn rather than pass silently',
  );
  assert.equal(trust.status, 'attention-required');
});

test('a clean catalog drift record reports a complete catalog with no warning', () => {
  const trust = buildGeneratedDataTrust(
    freshInput({
      catalogDrift: {
        generatedAt: new Date().toISOString(),
        complete: true,
        uncataloged: [],
        staleRefs: [],
      },
    }),
  );

  assert.equal(trust.catalogCompleteness.measured, true);
  assert.equal(trust.catalogCompleteness.complete, true);
  assert.equal(trust.status, 'fresh');
  assert.deepEqual(trust.warnings, []);
});

test('uncataloged public repos are named in the published warning', () => {
  const trust = buildGeneratedDataTrust(
    freshInput({
      catalogDrift: {
        generatedAt: new Date().toISOString(),
        complete: false,
        uncataloged: ['Widget', 'Gadget'],
        staleRefs: [],
      },
    }),
  );

  assert.equal(trust.catalogCompleteness.complete, false);
  assert.deepEqual(trust.catalogCompleteness.uncataloged, ['Widget', 'Gadget']);
  const warning = trust.warnings.find((entry) => /Catalog is incomplete/.test(entry));
  assert.ok(warning, 'drift must produce a warning');
  assert.match(warning, /Widget/);
  assert.match(warning, /Gadget/);
  assert.equal(trust.status, 'attention-required');
});

test('catalog refs pointing at repos that are gone are reported separately', () => {
  const trust = buildGeneratedDataTrust(
    freshInput({
      catalogDrift: {
        generatedAt: new Date().toISOString(),
        complete: true,
        uncataloged: [],
        staleRefs: ['Removed'],
      },
    }),
  );

  assert.deepEqual(trust.catalogCompleteness.staleRefs, ['Removed']);
  assert.ok(trust.warnings.some((entry) => /no longer active and public/.test(entry)));
});

test('report-only mode downgrades uncataloged repos but keeps stale and privacy failures fatal', async () => {
  const source = await fs.readFile(path.join(root, 'scripts', 'audit-catalog.mjs'), 'utf8');

  // The whole point of the split: pending curation must not block a redeploy,
  // while wrong or unsafe published content still must.
  assert.match(source, /const fatal =\s*\(reportOnly \? false : missing\.length > 0\)/);
  assert.match(source, /stale\.length > 0 \|\| privacyListed\.length > 0 \|\| privacyScreenshots\.length > 0/);
  assert.match(source, /if \(fatal\) process\.exitCode = 1;/);
  assert.match(source, /CATALOG_AUDIT_REPORT_ONLY/);
  assert.match(source, /_catalog-drift\.json/);
});

test('the unattended refresh runs the catalog audit in report-only mode and still exits non-zero on drift', async () => {
  const source = await fs.readFile(path.join(root, 'scripts', 'refresh-and-deploy.mjs'), 'utf8');

  assert.match(source, /CATALOG_AUDIT_REPORT_ONLY: '1'/);
  assert.match(source, /function readCatalogDrift\(\)/);
  // Both terminal paths must report drift, or a dry run would call a drifted
  // catalog clean while the deploy path called it a failure.
  const driftExits = source.match(/DRIFT \$\{uncataloged\.length\}/g) ?? [];
  assert.equal(driftExits.length, 2, 'both the dry-run and deploy paths must report drift');
});

test('the drift artifact is gitignored so a local check never becomes tracked data', async () => {
  const gitignore = await fs.readFile(path.join(root, '.gitignore'), 'utf8');
  assert.match(gitignore, /^src\/data\/_catalog-drift\.json$/m);
});
