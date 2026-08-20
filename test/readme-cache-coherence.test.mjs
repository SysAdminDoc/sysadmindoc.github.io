import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const dataDir = path.join(root, 'src', 'data');
const fetchStars = path.join(root, 'scripts', 'fetch-stars.mjs');

function readJsonIfPresent(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  } catch {
    return null;
  }
}

function readmeRepoFromEtagKey(key) {
  const match = key.match(/repos\/[^/]+\/([^/]+)\/readme$/i);
  return match ? match[1] : null;
}

// Regression guard for the 2026-08-20 README coverage collapse.
//
// _etags.json and _readmes.json are two halves of one cache. An ETag is only
// meaningful while the body it describes is still cached: if the README cache
// loses an entry but the ETag survives, every later conditional request answers
// 304 and that README can never be refetched. It stays missing until someone
// edits it upstream. That is exactly what happened — 42 of 193 repos held a
// live ETag with no cached body, pinning README coverage at 78.2% under an 80%
// gate and publishing a warning on /status/.
test('fetch-stars drops a README ETag whose cached body is missing', () => {
  const source = fs.readFileSync(fetchStars, 'utf8');

  // The repair must happen before the conditional fetch, and must delete the
  // saved ETag so the request goes out unconditionally.
  assert.match(
    source,
    /delete savedEtags\[readmeUrl\]/,
    'fetch-stars must delete a stale README ETag when the cached body is gone',
  );
  assert.match(
    source,
    /readmeRecovered\s*\+=\s*1/,
    'fetch-stars must count recovered READMEs so a recurrence is visible in telemetry',
  );
  assert.match(
    source,
    /recovered,?\s*$/m,
    'the refresh summary must publish the recovered count',
  );
});

test('the generated README cache has a body for every README ETag it holds', (t) => {
  const etags = readJsonIfPresent('_etags.json');
  const readmes = readJsonIfPresent('_readmes.json');
  if (!etags || !readmes) {
    t.skip('generated caches are not present (they are gitignored); run npm run fetch-stars');
    return;
  }

  const cached = new Set(Object.keys(readmes));
  const orphaned = Object.keys(etags)
    .map(readmeRepoFromEtagKey)
    .filter((repo) => repo && !cached.has(repo));

  assert.deepEqual(
    orphaned,
    [],
    `these repos hold a README ETag with no cached README, so GitHub will answer 304 forever and they can never be recovered: ${orphaned.join(', ')}`,
  );
});

test('README refresh telemetry arithmetic adds up', (t) => {
  const refresh = readJsonIfPresent('_readme-refresh.json');
  if (!refresh || refresh.source !== 'github-api') {
    t.skip('no token-backed README refresh telemetry present');
    return;
  }

  const { attempted, refreshed, reused, misses, totalPublicRepos, cacheEntries, missing } = refresh;
  assert.equal(
    refreshed + reused + misses,
    attempted,
    'refreshed + reused + misses must equal attempted, or the counters are lying about what happened',
  );
  assert.ok(attempted <= totalPublicRepos, 'cannot attempt more repos than exist');
  assert.equal(
    missing,
    Math.max(0, totalPublicRepos - cacheEntries),
    'missing must reconcile with the cache entry count',
  );
});
