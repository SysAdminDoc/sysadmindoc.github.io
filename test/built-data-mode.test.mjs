import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { builtDataProblem } from '../scripts/lib/built-data-mode.mjs';

const root = process.cwd();
const status = (generatedData) => JSON.stringify({ generatedData });

test('a build from the committed fixtures, or one that cannot say, is refused', () => {
  for (const mode of ['production-fresh', 'production-attention', 'unauthenticated-partial']) {
    assert.equal(builtDataProblem(status({ mode })), null, mode);
  }
  assert.match(builtDataProblem(status({ mode: 'fixture' })), /built from the committed test fixtures .*visual-gate\.mjs --restore/);
  assert.match(builtDataProblem(status({})), /has no generatedData\.mode/);
  assert.match(builtDataProblem(JSON.stringify({})), /has no generatedData\.mode/);
  assert.match(builtDataProblem(''), /missing or unreadable/);
  assert.match(builtDataProblem('{not json'), /missing or unreadable/);
});

test('deploy-vps checks what the build holds before anything reaches the server', async () => {
  const deploy = await fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  const check = deploy.indexOf('const builtData = builtDataProblem(');
  const firstShip = deploy.indexOf('// 2. Ensure the remote site dir exists.');
  assert.ok(check > 0 && firstShip > check, 'the check runs before the remote dir is touched');
  assert.match(deploy, /if \(builtData\) \{\s*console\.error\(`deploy-vps: \$\{builtData\}\.`\);\s*process\.exit\(1\);\s*\}/);
});

test('deploy-vps holds the gate lock from its build to its tarball, and restores leftovers first', async () => {
  // The tenth drain review: nothing held the lock across the build, so a gate
  // run could swap the fixtures in under it, and a killed run's leftovers were
  // only put back by the nightly, not by a deploy run on its own.
  const deploy = await fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  const locked = deploy.indexOf('const releaseGateLock = await acquireLock(');
  const restored = deploy.indexOf('restoreLeftovers({ log: console.log });');
  const built = deploy.indexOf("run('npm', ['run', 'build']);");
  const checked = deploy.indexOf('const builtData = builtDataProblem(');
  const tarred = deploy.indexOf("run('tar', ['-czf', tarball, '-C', distDir, '.']);");
  const released = deploy.indexOf('\nreleaseGateLock();');
  assert.ok(locked > 0 && locked < restored && restored < built && built < checked && checked < tarred && tarred < released, 'lock, restore, build, check, tar, release');
  assert.match(deploy, /process\.on\('exit', releaseGateLock\);/, 'an early exit lets go too');

  const fetch = await fs.readFile(path.join(root, 'scripts', 'fetch-stars.mjs'), 'utf8');
  const main = fetch.indexOf('async function main() {');
  const fetchRestore = fetch.indexOf('await restoreKilledRun(', main);
  const firstRead = fetch.indexOf('readJson(starsPath', main);
  assert.ok(main > 0 && fetchRestore > main && fetchRestore < firstRead, 'fetch-stars puts leftovers back before it reads a cache');
});

test('the built status.json says fixture when the fixtures are in', async () => {
  // The mode the check reads is the one the site computes from the data.
  const trust = await fs.readFile(path.join(root, 'src', 'data', 'generated-trust.ts'), 'utf8');
  assert.match(trust, /const fixtureMode = input\.profileFeedInfo\.source === 'fixture' \|\| readmeRefresh\?\.source === 'fixture';/);
  assert.match(trust, /const mode = fixtureMode\s*\? 'fixture'/);
  for (const name of ['_profile-projects.json', '_readme-refresh.json']) {
    const fixture = JSON.parse(await fs.readFile(path.join(root, 'src', 'data', 'fixtures', 'generated', name), 'utf8'));
    assert.equal(fixture.source, 'fixture', `${name} marks itself as a fixture`);
  }
});
