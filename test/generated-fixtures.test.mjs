import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const scriptPath = path.join(repoRoot, 'scripts', 'install-generated-fixtures.mjs');
const fixturesDir = path.join(repoRoot, 'src', 'data', 'fixtures', 'generated');

function runFixtures(args) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function copyFixtureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(fixturesDir)) {
    fs.copyFileSync(path.join(fixturesDir, entry), path.join(targetDir, entry));
  }
}

test('generated-data fixtures pass schema and ranking audit', () => {
  const output = runFixtures(['--check']);

  assert.match(output, /Generated-data fixtures checked:/);
  assert.match(output, /16 repos/);
  assert.match(output, /9 releases/);
  assert.match(output, /16 README excerpts/);
  assert.match(output, /16 profile projects/);
});

test('generated-data fixture audit rejects empty release fixtures', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-fixtures-test-'));
  try {
    copyFixtureDir(dir);
    fs.writeFileSync(path.join(dir, '_releases.json'), '[]\n');

    const result = spawnSync(process.execPath, [scriptPath, '--check', '--fixtures', dir], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Generated-data fixture audit failed:[\s\S]*_releases\.json must be a non-empty array/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
