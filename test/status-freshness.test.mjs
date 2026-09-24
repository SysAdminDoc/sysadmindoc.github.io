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

// The third drain review: the profile feed and the catalog check keep their
// own 36-hour clocks, so a fresh fetch carried an older feed past its deadline.
test('staleAfter is the earliest deadline of the fetch, the profile feed and the catalog check', () => {
  /** @type {any} */
  const measured = { generatedAt: '2026-09-21T10:45:00Z', complete: true };
  const trust = (profileAt, catalog = measured, source = 'live') =>
    buildGeneratedDataTrust({
      stats: { fetchedAt: '2026-09-21T10:00:00Z', totalRepos: 10, totalStars: 5 },
      starEntries: 0,
      metadataEntries: 0,
      readmeEntries: 0,
      releaseEntries: 0,
      profileFeedInfo: { active: true, source, projectCount: 0, cachedAt: profileAt },
      catalogDrift: catalog,
      now: BUILD,
    });
  assert.equal(trust('2026-09-20T12:00:00Z').staleAfter, '2026-09-22T00:00:00.000Z', 'a feed a day older than the stars expires first');
  assert.equal(trust('2026-09-21T10:30:00Z').staleAfter, '2026-09-22T22:00:00.000Z', 'a newer feed leaves the fetch deadline');
  assert.equal(trust('2026-09-21T10:30:00Z', { generatedAt: '2026-09-20T20:00:00Z', complete: true }).staleAfter, '2026-09-22T08:00:00.000Z', 'so does an older catalog check');
  assert.equal(trust('2026-09-21T10:30:00Z', { generatedAt: '2026-09-18T20:00:00Z', complete: true }).staleAfter, '2026-09-20T08:00:00.000Z', 'an expired catalog check puts it in the past');
  // The eighteenth drain review: a part with no time of its own is past its
  // contract already, so less evidence can't buy a later deadline.
  assert.equal(trust('2026-09-21T10:30:00Z', { generatedAt: '2026-09-18T20:00:00Z' }).staleAfter, BUILD.toISOString(), 'a record with no verdict measured nothing');
  assert.equal(trust('2026-09-21T10:30:00Z', null).staleAfter, BUILD.toISOString(), 'nor did a missing one');
  assert.equal(trust(null).staleAfter, BUILD.toISOString(), 'a feed with no time is already stale');
  assert.equal(trust('not-a-date').staleAfter, BUILD.toISOString());
  assert.equal(trust('2026-09-21T10:30:00Z', null, 'fixture').staleAfter, '2026-09-22T22:00:00.000Z', 'a fixture build is never catalog-checked, and says so nowhere');
  // The live file keeps failing once the earliest deadline passes.
  const live = { generatedData: trust('2026-09-20T12:00:00Z') };
  assert.throws(() => checkStatusFreshness(live, Date.parse('2026-09-22T01:00:00Z')), /went past its 36h freshness contract at 2026-09-22T00:00:00\.000Z/);
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
