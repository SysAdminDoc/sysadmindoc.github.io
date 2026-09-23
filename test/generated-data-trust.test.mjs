import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { withoutReportOnlyFlags } from '../scripts/lib/report-only-flags.mjs';

const root = process.cwd();
const summaryScript = path.join(root, 'scripts', 'summarize-generated-data.mjs');
const semanticScript = path.join(root, 'scripts', 'audit-semantic-index.mjs');
const packageJsonPath = path.join(root, 'package.json');
// deploy:preflight runs npm test, and the nightly runs deploy:preflight with its
// report-only flags set. Every strict run here starts from that environment and
// removes them, so a test means the same thing whoever starts it.
const NIGHTLY_ENV = { ...process.env, CATALOG_AUDIT_REPORT_ONLY: '1', PROVENANCE_REPORT_ONLY: '1' };
const strictEnv = () => withoutReportOnlyFlags(NIGHTLY_ENV);

async function makeTempDataDir() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sysadmindoc-generated-data-'));
  await fs.mkdir(path.join(tmp, 'src', 'data'), { recursive: true });
  return tmp;
}

async function writeJson(tmp, fileName, value) {
  await fs.writeFile(path.join(tmp, 'src', 'data', fileName), `${JSON.stringify(value, null, 2)}\n`);
}

test('strict generated-data summary fails partial production coverage with actionable mode guidance', async () => {
  const tmp = await makeTempDataDir();
  const now = new Date().toISOString();

  await writeJson(tmp, '_stars.json', { Alpha: 8, Beta: 3 });
  await writeJson(tmp, '_stats.json', {
    totalRepos: 2,
    totalStars: 11,
    lastPushedRepo: 'Alpha',
    lastPushedAt: now,
    fetchedAt: now,
  });
  await writeJson(tmp, '_meta.json', {
    Alpha: { stars: 8, pushedAt: now },
    Beta: { stars: 3, pushedAt: now },
  });
  await writeJson(tmp, '_releases.json', []);
  await writeJson(tmp, '_readmes.json', { Alpha: '# Alpha' });
  await writeJson(tmp, '_profile-projects.json', {
    schema: 'sysadmindoc.profile-projects.v1',
    source: 'github-api',
    feedSourceUrl: 'https://example.test/projects.json',
    generatedAt: now,
    cachedAt: now,
    projectCount: 2,
    projects: [
      { repo: 'Alpha', title: 'Alpha', updatedAt: now },
      { repo: 'Beta', title: 'Beta', updatedAt: now },
    ],
  });
  await writeJson(tmp, '_readme-refresh.json', {
    schema: 'sysadmindoc.readme-refresh.v2',
    generatedAt: now,
    source: 'github-api',
    tokenPresent: true,
    totalPublicRepos: 2,
    attempted: 2,
    refreshed: 1,
    reused: 0,
    misses: 1,
    preserved: 0,
    unattempted: 0,
    missing: 1,
    rateLimited: false,
    failureSamples: [],
    skippedReason: null,
    cacheEntries: 1,
    trimmed: 0,
  });

  const result = spawnSync(
    process.execPath,
    [summaryScript, '--out', 'summary', '--max-age-hours', '36', '--fail-on-stale'],
    { cwd: tmp, encoding: 'utf8', env: strictEnv() },
  );

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Mode: production-attention/);
  assert.match(result.stdout, /README coverage >= 80% of profile-feed projects/);
  assert.match(result.stdout, /Profile-feed parity is low/);

  const summaryJson = JSON.parse(await fs.readFile(path.join(tmp, 'summary', 'summary.json'), 'utf8'));
  assert.equal(summaryJson.mode, 'production-attention');
  assert.equal(summaryJson.parity.readmesCoverage, 0.5);
  assert(summaryJson.guidance.some((line) => line.includes('Profile-feed parity is low')));
});

test('deploy generated-data summary requires token-backed README refresh telemetry', async () => {
  const tmp = await makeTempDataDir();
  const now = new Date().toISOString();

  await writeJson(tmp, '_stars.json', { Alpha: 8, Beta: 3 });
  await writeJson(tmp, '_stats.json', {
    totalRepos: 2,
    totalStars: 11,
    lastPushedRepo: 'Alpha',
    lastPushedAt: now,
    fetchedAt: now,
  });
  await writeJson(tmp, '_meta.json', {
    Alpha: { stars: 8, pushedAt: now },
    Beta: { stars: 3, pushedAt: now },
  });
  await writeJson(tmp, '_releases.json', []);
  await writeJson(tmp, '_readmes.json', { Alpha: '# Alpha', Beta: '# Beta' });
  await writeJson(tmp, '_profile-projects.json', {
    schema: 'sysadmindoc.profile-projects.v1',
    source: 'github-api',
    feedSourceUrl: 'https://example.test/projects.json',
    generatedAt: now,
    cachedAt: now,
    projectCount: 2,
    projects: [
      { repo: 'Alpha', title: 'Alpha', updatedAt: now },
      { repo: 'Beta', title: 'Beta', updatedAt: now },
    ],
  });
  await writeJson(tmp, '_readme-refresh.json', {
    schema: 'sysadmindoc.readme-refresh.v2',
    generatedAt: now,
    source: 'github-api',
    tokenPresent: false,
    totalPublicRepos: 2,
    attempted: 0,
    refreshed: 0,
    reused: 0,
    misses: 0,
    preserved: 2,
    unattempted: 2,
    missing: 0,
    rateLimited: false,
    failureSamples: [],
    skippedReason: 'missing-token',
    cacheEntries: 2,
    trimmed: 0,
  });

  const result = spawnSync(
    process.execPath,
    [summaryScript, '--out', 'summary', '--max-age-hours', '36', '--fail-on-stale', '--require-token-backed-readmes'],
    { cwd: tmp, encoding: 'utf8', env: strictEnv() },
  );

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Mode: unauthenticated-partial/);
  assert.match(result.stdout, /Deploy token-backed README required: yes/);
  assert.match(result.stdout, /README refresh is token-backed \(deploy preflight required\)/);
  assert.match(result.stdout, /Deploy preflight requires token-backed README refresh data/);

  const summaryJson = JSON.parse(await fs.readFile(path.join(tmp, 'summary', 'summary.json'), 'utf8'));
  assert.equal(summaryJson.preflight.requireTokenBackedReadmes, true);
  assert.equal(summaryJson.preflight.ready, false);
  assert(summaryJson.checks.some((check) => check.label.includes('deploy preflight required') && check.ok === false));
});

/** Generated data for two repos, with an unsigned downloadable release in Alpha. */
async function writeProvenanceFixture(tmp, now, projectsSource) {
  await fs.writeFile(path.join(tmp, 'src', 'data', 'projects.ts'), projectsSource);
  await writeJson(tmp, '_stars.json', { Alpha: 8, Beta: 3 });
  await writeJson(tmp, '_stats.json', {
    totalRepos: 2,
    totalStars: 11,
    lastPushedRepo: 'Alpha',
    lastPushedAt: now,
    fetchedAt: now,
  });
  await writeJson(tmp, '_meta.json', {
    Alpha: { stars: 8, pushedAt: now },
    Beta: { stars: 3, pushedAt: now },
  });
  await writeJson(tmp, '_releases.json', [
    {
      repo: 'Alpha',
      tag: 'v1.0.0',
      name: 'Alpha v1',
      publishedAt: now,
      url: 'https://example.test/alpha/releases/v1.0.0',
      downloads: 5,
      bodyFirst: 'Initial release',
      provenance: 'unsigned',
    },
  ]);
  await writeJson(tmp, '_readmes.json', { Alpha: '# Alpha', Beta: '# Beta' });
  await writeJson(tmp, '_profile-projects.json', {
    schema: 'sysadmindoc.profile-projects.v1',
    source: 'github-api',
    feedSourceUrl: 'https://example.test/projects.json',
    generatedAt: now,
    cachedAt: now,
    projectCount: 2,
    projects: [
      { repo: 'Alpha', title: 'Alpha', updatedAt: now },
      { repo: 'Beta', title: 'Beta', updatedAt: now },
    ],
  });
  await writeJson(tmp, '_readme-refresh.json', {
    schema: 'sysadmindoc.readme-refresh.v2',
    generatedAt: now,
    source: 'github-api',
    tokenPresent: true,
    totalPublicRepos: 2,
    attempted: 2,
    refreshed: 2,
    reused: 0,
    misses: 0,
    preserved: 0,
    unattempted: 0,
    missing: 0,
    rateLimited: false,
    failureSamples: [],
    skippedReason: null,
    cacheEntries: 2,
    trimmed: 0,
  });
}

const FEATURED_ALPHA = [
  "export const featured = [{ repo: 'Alpha', name: 'Alpha' }];",
  'export const liveApps = [];',
  "export const catalog = [{ repo: 'Beta', name: 'Beta' }];",
].join('\n');

test('strict generated-data summary fails featured downloadable releases without provenance', async () => {
  const tmp = await makeTempDataDir();
  const now = new Date().toISOString();

  await writeProvenanceFixture(tmp, now, FEATURED_ALPHA);

  const result = spawnSync(
    process.execPath,
    [summaryScript, '--out', 'summary', '--fail-on-unsigned-featured-releases'],
    { cwd: tmp, encoding: 'utf8', env: strictEnv() },
  );

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Featured release provenance required: yes/);
  assert.match(result.stdout, /featured downloadable releases have checksum or attestation \(strict\)/);
  assert.match(result.stdout, /Alpha@v1\.0\.0 \(unsigned\)/);

  const summaryJson = JSON.parse(await fs.readFile(path.join(tmp, 'summary', 'summary.json'), 'utf8'));
  assert.equal(summaryJson.preflight.failOnUnsignedFeaturedReleases, true);
  assert.equal(summaryJson.preflight.ready, false);
  assert.equal(summaryJson.provenanceDistribution.unsigned, 1);
  assert.equal(summaryJson.releaseProvenancePolicy.unsignedFeaturedDownloadable.length, 1);

  // The unattended refresh reports the same release and carries on; the
  // runner fails the run afterwards from summary.json, like catalog drift.
  const reportOnly = spawnSync(
    process.execPath,
    [summaryScript, '--out', 'summary', '--fail-on-unsigned-featured-releases'],
    { cwd: tmp, encoding: 'utf8', env: withoutReportOnlyFlags(process.env, { PROVENANCE_REPORT_ONLY: '1' }) },
  );
  assert.equal(reportOnly.status, 0, reportOnly.stderr);
  assert.match(reportOnly.stdout, /featured downloadable releases have checksum or attestation \(strict, report-only\)/);
  assert.match(reportOnly.stderr, /PROVENANCE_REPORT_ONLY is set, so this run only reports it: 1 release\(s\)/);
  const reported = JSON.parse(await fs.readFile(path.join(tmp, 'summary', 'summary.json'), 'utf8'));
  assert.equal(reported.releaseProvenancePolicy.unsignedFeaturedDownloadable[0].repo, 'Alpha');
});

// Report-only is for an unsigned release in another repo. A featured list that
// can't be read, or is empty, means the check never ran, and the nightly used to
// deploy past that with nothing reported.
test('report-only mode still fails when there is no featured list to check', async () => {
  const tmp = await makeTempDataDir();
  const now = new Date().toISOString();
  await writeProvenanceFixture(tmp, now, ["export const liveApps = [];", "export const catalog = [{ repo: 'Beta', name: 'Beta' }];"].join('\n'));

  const result = spawnSync(process.execPath, [summaryScript, '--out', 'summary', '--fail-on-unsigned-featured-releases'], {
    cwd: tmp,
    encoding: 'utf8',
    env: withoutReportOnlyFlags(process.env, { PROVENANCE_REPORT_ONLY: '1' }),
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /featured downloadable releases have checksum or attestation \(strict\)/);
  assert.doesNotMatch(result.stderr, /only reports it/);
});

test('deploy preflight script runs strict generated-data gate before tests and build', async () => {
  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  assert.equal(
    pkg.scripts['data:summary:deploy'],
    'node scripts/summarize-generated-data.mjs --fail-on-stale --require-token-backed-readmes --fail-on-unsigned-featured-releases',
  );
  assert.match(
    pkg.scripts['deploy:preflight'],
    // a11y:audit:browser is last on purpose: it is the only step that needs a
    // built dist/ served to a real browser, so it runs after `npm run build`.
    // visual:gate makes its own fixture build first, so the real build that
    // ships comes after it.
    /^npm run data:summary:deploy && npm run catalog:audit && npm run liveapps:audit && npm run verify:signatures && npm run verify:release-tag && npm run deps:audit -- --strict && npm test && npm run check && npm run visual:gate && npm run build && npm run a11y:audit:browser$/,
  );
  // GitHub Pages is a redirect stub now; nothing may publish over it.
  assert.equal(pkg.scripts['publish:pages'], undefined);
});

test('fixture generated-data summary labels reduced corpus without blocking advisory runs', async () => {
  const tmp = await makeTempDataDir();
  const now = new Date().toISOString();

  await writeJson(tmp, '_stars.json', { FixtureRepo: 1 });
  await writeJson(tmp, '_stats.json', {
    totalRepos: 1,
    totalStars: 1,
    lastPushedRepo: 'FixtureRepo',
    lastPushedAt: now,
    fetchedAt: now,
  });
  await writeJson(tmp, '_meta.json', { FixtureRepo: { stars: 1, pushedAt: now } });
  await writeJson(tmp, '_releases.json', []);
  await writeJson(tmp, '_readmes.json', {});
  await writeJson(tmp, '_profile-projects.json', {
    schema: 'sysadmindoc.profile-projects.v1',
    source: 'fixture',
    feedSourceUrl: 'https://example.test/projects.json',
    generatedAt: now,
    cachedAt: now,
    projectCount: 1,
    projects: [{ repo: 'FixtureRepo', title: 'Fixture Repo', updatedAt: now }],
  });
  await writeJson(tmp, '_readme-refresh.json', {
    schema: 'sysadmindoc.readme-refresh.v2',
    generatedAt: now,
    source: 'fixture',
    tokenPresent: false,
    totalPublicRepos: 1,
    attempted: 1,
    refreshed: 0,
    reused: 0,
    misses: 0,
    preserved: 0,
    unattempted: 0,
    missing: 1,
    rateLimited: false,
    failureSamples: [],
    skippedReason: null,
    cacheEntries: 0,
    trimmed: 0,
  });

  const result = spawnSync(process.execPath, [summaryScript, '--out', 'summary'], {
    cwd: tmp,
    encoding: 'utf8',
    env: withoutReportOnlyFlags(process.env, { PROFILE_PROJECTS_OFFLINE: '1' }),
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Mode: fixture/);
  assert.match(result.stdout, /Fixture\/offline mode/);
  assert.match(result.stdout, /README coverage >= 80% of profile-feed projects \(fixture corpus — skipped\)/);
});

test('a strict summary refuses the committed fixtures even when they look fresh', async () => {
  // A killed visual-gate run leaves them in src/data. The fixtures on disk are
  // months old, which the age check catches, but nothing kept them that way.
  const tmp = await makeTempDataDir();
  const now = new Date().toISOString();
  const fixtures = path.join(root, 'src', 'data', 'fixtures', 'generated');
  for (const name of await fs.readdir(fixtures)) {
    const value = JSON.parse(await fs.readFile(path.join(fixtures, name), 'utf8'));
    for (const key of ['fetchedAt', 'generatedAt', 'cachedAt']) if (typeof value?.[key] === 'string') value[key] = now;
    await writeJson(tmp, name, value);
  }

  const result = spawnSync(process.execPath, [summaryScript, '--out', 'summary', '--fail-on-stale'], { cwd: tmp, encoding: 'utf8', env: strictEnv() });
  assert.equal(result.status, 1);
  const summaryJson = JSON.parse(await fs.readFile(path.join(tmp, 'summary', 'summary.json'), 'utf8'));
  const fixtureCheck = summaryJson.checks.find((check) => check.label === 'generated data is live, not the committed test fixtures');
  assert.equal(fixtureCheck?.ok, false);
  assert.equal(summaryJson.checks.find((check) => check.label.startsWith('generated data age'))?.ok, true, 'it was not the age that failed it');
});

test('strict semantic audit failure explains credentialed refresh and fixture escape hatch', async () => {
  const tmp = await makeTempDataDir();
  await fs.writeFile(
    path.join(tmp, 'src', 'data', 'projects.ts'),
    [
      "export const featured = [{ repo: 'Alpha', name: 'Alpha', desc: 'Network monitoring tool', lang: 'ops', tags: ['network'] }];",
      'export const liveApps = [];',
      "export const catalog = [{ repo: 'Beta', name: 'Beta', desc: 'Incident response dashboard', category: 'ops', tags: ['incident'] }];",
    ].join('\n'),
  );
  await writeJson(tmp, '_readmes.json', {});

  const result = spawnSync(process.execPath, [semanticScript, '--strict'], {
    cwd: tmp,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /mode: production-strict/);
  assert.match(result.stderr, /Refresh README caches with GITHUB_TOKEN via npm run fetch-stars/);
  assert.match(result.stderr, /pass --fixture for fixture-corpus audits/);
});
