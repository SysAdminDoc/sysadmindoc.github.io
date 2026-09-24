import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// The eleventh drain review: by hand, this command used to write the fixtures
// over the live data with the live ETags still beside them, the state that let
// the nightly's 304s keep fixture rows. Now it swaps the way the gate does.
function liveRoot() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-fixtures-swap-'));
  const data = path.join(base, 'src', 'data');
  fs.mkdirSync(data, { recursive: true });
  for (const name of ['_stars.json', '_releases.json', '_etags.json', '_catalog-drift.json']) {
    fs.writeFileSync(path.join(data, name), `live ${name}\n`);
  }
  return { base, data };
}

test('by hand, the fixtures go in under the gate lock, with the live data and its ETags backed up', async () => {
  const { base, data } = liveRoot();
  try {
    const output = execFileSync(process.execPath, [scriptPath, '--fixtures', fixturesDir], { cwd: base, encoding: 'utf8', windowsHide: true });
    assert.match(output, /Generated-data fixtures installed/);
    assert.match(output, /backed up in \.tmp\/visual-gate\/live-data/);
    assert.equal(fs.readFileSync(path.join(data, '_stars.json'), 'utf8'), fs.readFileSync(path.join(fixturesDir, '_stars.json'), 'utf8'));
    assert.equal(fs.existsSync(path.join(data, '_etags.json')), false, 'no live ETag is left beside a fixture cache');
    assert.equal(fs.existsSync(path.join(base, '.tmp', 'visual-gate', 'lock.json')), false, 'and the lock is let go');
    const backup = path.join(base, '.tmp', 'visual-gate', 'live-data');
    assert.equal(fs.readFileSync(path.join(backup, '_etags.json'), 'utf8'), 'live _etags.json\n');

    // What the nightly, fetch-stars and deploy:vps do first.
    const { restoreKilledRun } = await import(pathToFileURL(path.join(repoRoot, 'scripts', 'visual-gate.mjs')).href);
    await restoreKilledRun({ dir: data, backup, lock: path.join(base, '.tmp', 'visual-gate', 'lock.json'), log: () => {} });
    for (const name of ['_stars.json', '_releases.json', '_etags.json', '_catalog-drift.json']) {
      assert.equal(fs.readFileSync(path.join(data, name), 'utf8'), `live ${name}\n`, name);
    }
    assert.equal(fs.existsSync(path.join(data, '_meta.json')), false, 'a fixture with no live file before goes away');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('--under-gate installs only for the gate run that holds the lock', () => {
  const { base, data } = liveRoot();
  try {
    const result = spawnSync(process.execPath, [scriptPath, '--fixtures', fixturesDir, '--under-gate'], { cwd: base, encoding: 'utf8', windowsHide: true });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--under-gate is for visual-gate\.mjs/);
    assert.equal(fs.readFileSync(path.join(data, '_stars.json'), 'utf8'), 'live _stars.json\n', 'nothing was installed');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
  const gate = fs.readFileSync(path.join(repoRoot, 'scripts', 'visual-gate.mjs'), 'utf8');
  assert.match(gate, /run\(process\.execPath, \['scripts\/install-generated-fixtures\.mjs', '--under-gate'\]\)/, 'the gate says it holds the lock');
});