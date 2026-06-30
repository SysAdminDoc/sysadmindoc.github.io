import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const smokeScript = path.join(repoRoot, 'scripts', 'smoke-live-site.mjs');

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

test('status endpoint and live smoke expose build commit identity', () => {
  const buildIdentity = fs.readFileSync(path.join(repoRoot, 'src', 'data', 'build-identity.ts'), 'utf8');
  const statusEndpoint = fs.readFileSync(path.join(repoRoot, 'src', 'pages', 'status.json.ts'), 'utf8');
  const endpointsAudit = fs.readFileSync(path.join(repoRoot, 'scripts', 'audit-public-endpoints.mjs'), 'utf8');
  const smoke = fs.readFileSync(smokeScript, 'utf8');

  assert.match(buildIdentity, /SYSADMINDOC_BUILD_COMMIT/);
  assert.match(buildIdentity, /GITHUB_SHA/);
  assert.match(buildIdentity, /execFileSync\('git', \['rev-parse', 'HEAD'\]/);
  assert.match(buildIdentity, /UNKNOWN_BUILD_COMMIT = 'unknown'/);
  assert.match(statusEndpoint, /import \{ buildIdentity \} from '\.\.\/data\/build-identity'/);
  assert.match(statusEndpoint, /build:\s*\{\s*commit: buildIdentity\.commit,/);
  assert.match(statusEndpoint, /commitShort: buildIdentity\.commitShort/);
  assert.match(statusEndpoint, /source: buildIdentity\.source/);
  assert.match(endpointsAudit, /route: '\/status\.json', file: 'src\/pages\/status\.json\.ts'/);
  assert.match(endpointsAudit, /status\.json build\.commit must be unknown or a 7-40 character hex commit/);
  assert.match(smoke, /option\('--expected-commit'\) \?\? process\.env\.EXPECTED_COMMIT/);
  assert.match(smoke, /fetchText\(baseUrl, '\/status\.json'/);
  assert.match(smoke, /\/status\.json build\.commit drifted/);
});

test('live smoke contract emits build commit from status.json', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'status-build-contract-'));
  const outputFile = path.join(dist, 'github-output.txt');
  const buildCommit = '0123456789abcdef0123456789abcdef01234567';

  try {
    writeJson(path.join(dist, 'projects.json'), {
      counts: { projects: 2 },
      projects: [{ slug: 'one' }, { slug: 'two' }],
    });
    writeJson(path.join(dist, 'releases.json'), {
      counts: { releases: 1 },
      releases: [{ tag: 'v1.0.0' }],
    });
    writeJson(path.join(dist, 'feed.json'), {
      items: [{ id: 'one' }, { id: 'two' }],
    });
    writeJson(path.join(dist, 'status.json'), {
      build: { commit: buildCommit },
    });

    const stdout = execFileSync(process.execPath, [smokeScript, '--emit-contract', '--dist', dist], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_OUTPUT: outputFile },
    });
    const githubOutput = fs.readFileSync(outputFile, 'utf8');

    assert.match(stdout, /Live smoke contract/);
    assert.match(stdout, new RegExp(`build commit: ${buildCommit}`));
    assert.match(githubOutput, new RegExp(`build_commit=${buildCommit}`));
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
  }
});
