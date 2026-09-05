import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { buildCatalogCompleteness, buildGeneratedDataTrust } from '../src/data/generated-trust.ts';

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

test('every terminal path of the unattended refresh records a machine-readable status', async () => {
  const source = await fs.readFile(path.join(root, 'scripts', 'refresh-and-deploy.mjs'), 'utf8');

  // The scheduled task only exposes an exit code, so the failing step has to be
  // written down somewhere the health check can quote it.
  assert.match(source, /sysadmindoc\.refresh-deploy-status\.v1/);
  assert.match(source, /refresh-and-deploy-status\.json/);
  // ~/.claude/scripts/daily-health.ps1 reads status/step/detail/at off this
  // payload to build the Desktop alert. That consumer lives outside the repo, so
  // renaming a field here would break alerting with nothing else catching it.
  for (const field of ['schema', 'status', 'step', 'detail', 'at', 'elapsedSeconds', 'dryRun']) {
    assert.match(source, new RegExp(`^\\s{4}${field}[,:]`, 'm'), `writeStatus must keep the ${field} field`);
  }
  assert.match(source, /function writeStatus\(status, \{ failedStep = null, detail = null \} = \{\}\)/);

  const statuses = [...source.matchAll(/writeStatus\('([a-z-]+)'/g)].map((match) => match[1]);
  assert.deepEqual(
    [...new Set(statuses)].sort(),
    ['aborted', 'deployed', 'drift', 'dry-run'],
    'each terminal outcome needs its own recorded status',
  );
  // A run that exits without writing status would leave the previous run's
  // verdict on disk and the health check would report a stale outcome.
  const exits = source.match(/process\.exit\([01]\)/g) ?? [];
  assert.equal(exits.length, statuses.length, 'every process.exit must be preceded by a writeStatus');
});

test('a malformed drift record degrades to unmeasured instead of throwing', () => {
  // These run while Astro renders /status/ and /catalog/, so a TypeError here
  // fails the whole build rather than reporting "not measured".
  const now = new Date();
  const fresh = now.toISOString();
  // Cast: the whole point is to feed shapes the type says are impossible, which
  // is exactly what a hand-edited JSON file on disk can be.
  const malformed = /** @type {any[]} */ ([
    { generatedAt: fresh, complete: true, uncataloged: 'Widget', staleRefs: [] },
    { generatedAt: fresh, complete: true, uncataloged: null, staleRefs: null },
    { generatedAt: fresh, complete: true },
    { generatedAt: fresh, complete: 'true', uncataloged: [] },
    { generatedAt: 'not-a-date', complete: false, uncataloged: ['A'] },
    {},
    null,
  ]);

  for (const drift of malformed) {
    const result = buildCatalogCompleteness(drift, { now });
    assert.ok(Array.isArray(result.uncataloged), `uncataloged must be an array for ${JSON.stringify(drift)}`);
    assert.ok(Array.isArray(result.staleRefs));
    const trust = buildGeneratedDataTrust(freshInput({ catalogDrift: drift }));
    assert.ok(Array.isArray(trust.catalogCompleteness.uncataloged));
  }

  // A non-boolean `complete` is not a verdict.
  assert.equal(
    buildCatalogCompleteness(/** @type {any} */ ({ generatedAt: fresh, complete: 'true' }), { now }).measured,
    false,
  );
  // A non-string that slipped into the list is dropped rather than rendered.
  assert.deepEqual(
    buildCatalogCompleteness(
      /** @type {any} */ ({ generatedAt: fresh, complete: false, uncataloged: ['A', 3, null, 'B'] }),
      { now },
    ).uncataloged,
    ['A', 'B'],
  );
});

test('a drift record older than the freshness window cannot assert completeness', () => {
  const now = new Date();
  const old = new Date(now.getTime() - 40 * 3_600_000).toISOString();

  // catalog:audit runs in deploy:preflight, not in `npm run build`, and
  // deploy:vps builds again on its own, so a leftover record is what a plain
  // build reads. Age is the only thing stopping it asserting completeness.
  const stale = buildCatalogCompleteness({ generatedAt: old, complete: true, uncataloged: [], staleRefs: [] }, { now });
  assert.equal(stale.measured, false);
  assert.equal(stale.complete, null);
  assert.equal(stale.staleRecord, true);

  const trust = buildGeneratedDataTrust(
    freshInput({ catalogDrift: { generatedAt: old, complete: true, uncataloged: [], staleRefs: [] } }),
  );
  assert.equal(trust.catalogCompleteness.complete, null);
  assert.ok(trust.warnings.some((entry) => /last measured over 36h ago/.test(entry)));
});

test('the catalog page derives its completeness claim from the same record', async () => {
  const source = await fs.readFile(path.join(root, 'src', 'pages', 'catalog.astro'), 'utf8');

  // The page states the archive is complete. That sentence has to be gated on
  // the drift record, or /catalog/ contradicts /status/.
  assert.match(source, /buildCatalogCompleteness/);
  assert.match(source, /_catalog-drift\.json/);
  assert.doesNotMatch(
    source,
    /summary="The catalog is the complete public archive\./,
    'the completeness claim must not be an unconditional string literal',
  );
  assert.match(source, /completeness\.complete === true/);
});

test('the unattended deploy runs the full live smoke, not the status-only shortcut', async () => {
  const source = await fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');

  // --status-only returns after comparing version and commit, before every
  // security-header assertion, the CSP report POST and the artifact counts. A
  // deploy that passes it verifies almost nothing.
  assert.doesNotMatch(source, /'--status-only'/);
  assert.match(source, /'--expected-projects'/);
  assert.match(source, /'--expected-releases'/);
  assert.match(source, /'--expected-feed-items'/);

  // The counts must come from the tree that was just shipped. Hardcoding them
  // would silently rot as the catalog grows and turn the gate into a no-op.
  assert.match(source, /function readArtifactCounts\(\)/);
  assert.match(source, /readJson\('projects\.json'\)\.projects/);
  assert.match(source, /readJson\('releases\.json'\)\.releases/);
  assert.match(source, /readJson\('feed\.json'\)\.items/);
  assert.match(source, /refusing to smoke against it/);
});
