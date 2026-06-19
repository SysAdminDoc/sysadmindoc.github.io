import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const root = process.cwd();
const summaryScript = path.join(root, 'scripts', 'summarize-generated-data.mjs');
const semanticScript = path.join(root, 'scripts', 'audit-semantic-index.mjs');

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
    schema: 'sysadmindoc.readme-refresh.v1',
    generatedAt: now,
    source: 'github-api',
    tokenPresent: true,
    totalPublicRepos: 2,
    attempted: 2,
    refreshed: 1,
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
    { cwd: tmp, encoding: 'utf8' },
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
    schema: 'sysadmindoc.readme-refresh.v1',
    generatedAt: now,
    source: 'fixture',
    tokenPresent: false,
    totalPublicRepos: 1,
    attempted: 1,
    refreshed: 0,
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
    env: { ...process.env, PROFILE_PROJECTS_OFFLINE: '1' },
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Mode: fixture/);
  assert.match(result.stdout, /Fixture\/offline mode/);
  assert.match(result.stdout, /README coverage >= 80% of profile-feed projects \(fixture corpus — skipped\)/);
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
