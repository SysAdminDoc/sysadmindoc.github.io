import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  normalizeDigest,
  parseArgs,
  smokeReleaseArtifact,
  validateReleaseArtifact,
} from '../scripts/smoke-release-artifact.mjs';

const digestA = 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const digestB = 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function releaseFixture(overrides = {}) {
  const tag = overrides.tag_name ?? 'v0.21.8';
  const assetName = overrides.assetName ?? `sysadmindoc-portfolio-${tag}.zip`;
  return {
    tag_name: tag,
    target_commitish: 'main',
    name: tag,
    draft: false,
    prerelease: false,
    published_at: '2026-07-06T03:04:32Z',
    assets: [
      {
        name: assetName,
        state: 'uploaded',
        content_type: 'application/zip',
        size: 25_955_159,
        digest: digestA,
        download_count: 0,
        created_at: '2026-07-06T03:04:30Z',
        updated_at: '2026-07-06T03:04:32Z',
        browser_download_url: `https://github.com/SysAdminDoc/sysadmindoc.github.io/releases/download/${tag}/${assetName}`,
      },
    ],
    ...overrides,
  };
}

function expected(overrides = {}) {
  return {
    repo: 'SysAdminDoc/sysadmindoc.github.io',
    tag: 'v0.21.8',
    assetName: 'sysadmindoc-portfolio-v0.21.8.zip',
    minSize: 1_000_000,
    expectedSize: null,
    expectedDigest: null,
    contentType: 'application/zip',
    token: null,
    ...overrides,
  };
}

test('release artifact smoke validates the expected static-site ZIP metadata', () => {
  const result = validateReleaseArtifact(releaseFixture(), expected());

  assert.equal(result.tag, 'v0.21.8');
  assert.equal(result.asset.name, 'sysadmindoc-portfolio-v0.21.8.zip');
  assert.equal(result.asset.size, 25_955_159);
  assert.equal(result.asset.digest, digestA);
  assert.equal(result.asset.contentType, 'application/zip');
  assert.equal(result.asset.updatedAt, '2026-07-06T03:04:32Z');
});

test('release artifact smoke fails clearly when the expected artifact is missing', () => {
  assert.throws(
    () =>
      validateReleaseArtifact(
        releaseFixture({
          assets: [{ name: 'source.zip' }],
        }),
        expected(),
      ),
    /missing expected asset sysadmindoc-portfolio-v0\.21\.8\.zip; found: source\.zip/,
  );
});

test('release artifact smoke detects stale size and digest expectations', () => {
  assert.throws(
    () =>
      validateReleaseArtifact(
        releaseFixture(),
        expected({
          expectedSize: 123,
          expectedDigest: digestB,
        }),
      ),
    /size is stale:[\s\S]*digest is stale/,
  );
});

test('release artifact smoke fetches the requested release from the GitHub API', async () => {
  let requestedUrl = '';
  const result = await smokeReleaseArtifact({
    ...expected(),
    fetchImpl: async (url) => {
      requestedUrl = url;
      return new Response(JSON.stringify(releaseFixture()), { status: 200 });
    },
  });

  assert.equal(requestedUrl, 'https://api.github.com/repos/SysAdminDoc/sysadmindoc.github.io/releases/tags/v0.21.8');
  assert.equal(result.asset.digest, digestA);
});

test('release artifact smoke normalizes CLI tag, asset, and digest options', () => {
  const parsed = parseArgs(
    [
      '--tag',
      '0.21.8',
      '--asset',
      'site.zip',
      '--min-size',
      '42',
      '--expected-digest',
      digestA.replace('sha256:', ''),
    ],
    '0.21.11',
  );

  assert.equal(parsed.tag, 'v0.21.8');
  assert.equal(parsed.assetName, 'site.zip');
  assert.equal(parsed.minSize, 42);
  assert.equal(parsed.expectedDigest, digestA);
  assert.equal(normalizeDigest(digestB), digestB);
});
