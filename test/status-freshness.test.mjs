import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { buildGeneratedDataTrust } from '../src/data/generated-trust.ts';
import { checkStatusFreshness } from '../scripts/lib/status-freshness.mjs';

const root = process.cwd();
const BUILD = new Date('2026-09-21T11:00:00.000Z');

function trustAt(fetchedAt, now = BUILD) {
  return buildGeneratedDataTrust({
    stats: { fetchedAt, totalRepos: 10, totalStars: 5 },
    starEntries: 0,
    metadataEntries: 0,
    readmeEntries: 0,
    releaseEntries: 0,
    profileFeedInfo: { active: true, source: 'fixture', projectCount: 0, cachedAt: fetchedAt },
    now,
  });
}

test('staleAfter is fetchedAt plus the contract, and evaluatedAt is the build', () => {
  const trust = trustAt('2026-09-21T10:55:31Z');
  assert.equal(trust.maxAgeHours, 36);
  assert.equal(trust.staleAfter, '2026-09-22T22:55:31.000Z');
  assert.equal(trust.evaluatedAt, BUILD.toISOString());
  // The build-time verdict is what the live file kept saying for days.
  assert.equal(trust.stale, false);
  assert.equal(trustAt(null).staleAfter, null);
});

test('status.json evaluates at generatedAt and says so', async () => {
  const endpoint = await fs.readFile(path.join(root, 'src', 'pages', 'status.json.ts'), 'utf8');
  assert.match(endpoint, /const now = new Date\(\);/);
  assert.match(endpoint, /catalogDrift,\n\s+now,\n\s+\}\);/, 'the trust verdict uses the same clock as generatedAt');
  assert.match(endpoint, /generatedAt: now\.toISOString\(\),/);
  assert.match(endpoint, /status, stale and ageHours were evaluated at generatedAt/);
});

test('the live check passes inside the contract and fails once staleAfter has passed', () => {
  // The live file of 2026-09-23T00:45Z: "fresh", built from data fetched 37.8h earlier.
  const live = { generatedData: { ...trustAt('2026-09-21T10:55:31Z'), status: 'fresh' } };
  const inside = checkStatusFreshness(live, Date.parse('2026-09-22T20:55:31Z'));
  assert.deepEqual(inside, { staleAfter: '2026-09-22T22:55:31.000Z', hoursLeft: 2 });
  assert.throws(
    () => checkStatusFreshness(live, Date.parse('2026-09-23T00:45:00Z')),
    /went past its 36h freshness contract at 2026-09-22T22:55:31\.000Z \(1\.8h ago\)/,
  );
  assert.throws(() => checkStatusFreshness({ generatedData: { status: 'fresh' } }), /no generatedData\.staleAfter/);
});

test('both live smoke paths judge freshness', async () => {
  const smoke = await fs.readFile(path.join(root, 'scripts', 'smoke-live-site.mjs'), 'utf8');
  assert.match(smoke, /import \{ checkStatusFreshness \} from '\.\/lib\/status-freshness\.mjs';/);
  // Once in the full smoke:live run, once in the --status-only deploy check.
  assert.equal(smoke.match(/checkStatusFreshness\(status\)/g)?.length, 2);
});
