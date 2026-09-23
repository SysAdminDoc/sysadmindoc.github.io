import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  GATE_ROUTES,
  LOCK_MAX_AGE_MS,
  REMOVED_FILES,
  SWAPPED_FILES,
  backUpLiveData,
  playwrightArgs,
  releaseLock,
  restoreKilledRun,
  restoreLiveData,
  tryLock,
  withLock,
} from '../scripts/visual-gate.mjs';

const root = process.cwd();
const quiet = () => {};

/** A data dir holding live copies of every swapped file, and a fixtures dir. */
function setup() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-gate-'));
  const dir = path.join(base, 'data');
  const fixtures = path.join(base, 'fixtures');
  const backup = path.join(base, 'backup');
  const lock = path.join(base, 'lock.json');
  fs.mkdirSync(dir);
  fs.mkdirSync(fixtures);
  for (const name of SWAPPED_FILES) {
    fs.writeFileSync(path.join(dir, name), `live ${name}\n`);
    // The catalog record and the ETags have no fixture, as in the repo.
    if (!REMOVED_FILES.includes(name)) fs.writeFileSync(path.join(fixtures, name), `fixture ${name}\n`);
  }
  return { base, dir, fixtures, backup, lock };
}

/** What the gate does between backup and restore. */
function swap({ dir, fixtures }) {
  for (const name of REMOVED_FILES) fs.rmSync(path.join(dir, name), { force: true });
  for (const name of fs.readdirSync(fixtures)) fs.copyFileSync(path.join(fixtures, name), path.join(dir, name));
}

const read = (dir, name) => (fs.existsSync(path.join(dir, name)) ? fs.readFileSync(path.join(dir, name), 'utf8') : null);

test('a gate run leaves every live data file as it found it', () => {
  const env = setup();
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  assert.equal(read(env.dir, '_stars.json'), 'fixture _stars.json\n', 'the swap is in place during the run');
  assert.equal(read(env.dir, '_catalog-drift.json'), null);

  const restored = restoreLiveData({ ...env, log: quiet });
  assert.deepEqual(restored, [...SWAPPED_FILES]);
  for (const name of SWAPPED_FILES) assert.equal(read(env.dir, name), `live ${name}\n`, name);
  assert.equal(fs.existsSync(env.backup), false, 'the backup is gone once restored');
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('a file that was missing before the swap is missing after it', () => {
  const env = setup();
  fs.rmSync(path.join(env.dir, '_readme-refresh.json'));
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  restoreLiveData({ ...env, log: quiet });
  assert.equal(read(env.dir, '_readme-refresh.json'), null);
  assert.equal(read(env.dir, '_stars.json'), 'live _stars.json\n');
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('a killed run is undone by the next one, without undoing a refresh that came between', () => {
  const env = setup();
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  // Killed here: no restore. Then the nightly refresh rewrites the stars and
  // the catalog record before the next gate runs.
  fs.writeFileSync(path.join(env.dir, '_stars.json'), 'fresher _stars.json\n');
  fs.writeFileSync(path.join(env.dir, '_catalog-drift.json'), 'fresher _catalog-drift.json\n');

  const messages = [];
  backUpLiveData({ ...env, log: (message) => messages.push(message) });
  assert.match(messages.join('\n'), /stopped before restoring/);
  assert.equal(read(env.dir, '_stars.json'), 'fresher _stars.json\n', 'the refresh wins over the older backup');
  assert.equal(read(env.dir, '_catalog-drift.json'), 'fresher _catalog-drift.json\n');
  assert.equal(read(env.dir, '_meta.json'), 'live _meta.json\n', 'what still held the fixture comes back');

  // And that new run's own cycle keeps the fresher copies.
  swap(env);
  restoreLiveData({ ...env, log: quiet });
  assert.equal(read(env.dir, '_stars.json'), 'fresher _stars.json\n');
  assert.equal(read(env.dir, '_catalog-drift.json'), 'fresher _catalog-drift.json\n');
  assert.equal(read(env.dir, '_meta.json'), 'live _meta.json\n');
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('a backup without its manifest touches nothing', () => {
  const env = setup();
  // Killed while copying: the manifest is written last, and the swap only
  // starts after it.
  fs.mkdirSync(env.backup);
  fs.writeFileSync(path.join(env.backup, '_stars.json'), 'partial copy\n');
  assert.deepEqual(restoreLiveData({ ...env, log: quiet }), []);
  assert.equal(read(env.dir, '_stars.json'), 'live _stars.json\n');
  assert.equal(fs.existsSync(env.backup), false);
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('the backup covers every file the swap touches, or a gate run would lose it', () => {
  // What install-generated-fixtures.mjs copies over, plus the files with no
  // fixture that the gate deletes itself. A file missing here would be
  // overwritten, or deleted, and never put back.
  const installer = fs.readFileSync(path.join(root, 'scripts', 'install-generated-fixtures.mjs'), 'utf8');
  const installed = [...(installer.match(/const requiredFiles = \[([\s\S]*?)\];/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.ok(installed.length >= 7, 'the installer list was read');
  const gate = fs.readFileSync(path.join(root, 'scripts', 'visual-gate.mjs'), 'utf8');
  assert.match(gate, /for \(const name of REMOVED_FILES\) fs\.rmSync\(path\.join\(dataDir, name\), \{ force: true \}\);/, 'the gate deletes what it has no fixture for');
  assert.deepEqual([...REMOVED_FILES].sort(), ['_catalog-drift.json', '_etags.json']);
  for (const name of REMOVED_FILES) {
    assert.equal(fs.existsSync(path.join(root, 'src', 'data', 'fixtures', 'generated', name)), false, `${name} has no fixture`);
  }
  assert.deepEqual([...SWAPPED_FILES].sort(), [...new Set([...installed, ...REMOVED_FILES])].sort());
});

test('a killed run leaves no live ETags beside the fixture caches', () => {
  // With the live ETags still there, fetch-stars took GitHub's 304s as leave to
  // keep the fixture rows it found in the caches (eighth drain review).
  const env = setup();
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  assert.equal(read(env.dir, '_etags.json'), null, 'no ETags while the fixtures are in');
  // Killed here. A plain restore brings the live ETags back...
  restoreLiveData({ ...env, log: quiet });
  assert.equal(read(env.dir, '_etags.json'), 'live _etags.json\n');

  // ...but ETags written by a refresh after the kill are newer, and stay.
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  fs.writeFileSync(path.join(env.dir, '_etags.json'), 'fresher _etags.json\n');
  restoreLiveData({ ...env, log: quiet });
  assert.equal(read(env.dir, '_etags.json'), 'fresher _etags.json\n');
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('one gate run holds the lock at a time, and a dead or hour-old holder loses it', () => {
  const env = setup();
  const now = Date.parse('2026-09-24T03:00:00Z');
  const alive = () => true;
  const dead = () => false;
  assert.deepEqual(tryLock({ lock: env.lock, now, isAlive: alive }), { taken: true, holder: null });
  const held = tryLock({ lock: env.lock, now: now + 60_000, isAlive: alive });
  assert.equal(held.taken, false);
  assert.equal(held.holder.pid, process.pid);

  // A holder whose process is gone, or that's older than any real run, is taken over.
  assert.equal(tryLock({ lock: env.lock, now: now + 60_000, isAlive: dead }).taken, true);
  // That takeover stamped the lock at now + 60 s; an hour after that it's stale.
  assert.equal(tryLock({ lock: env.lock, now: now + 60_000 + LOCK_MAX_AGE_MS - 1, isAlive: alive }).taken, false);
  assert.equal(tryLock({ lock: env.lock, now: now + 60_000 + LOCK_MAX_AGE_MS + 1, isAlive: alive }).taken, true);
  fs.writeFileSync(env.lock, 'not json');
  assert.equal(tryLock({ lock: env.lock, now, isAlive: alive }).taken, true);

  // Only the holder releases it.
  fs.writeFileSync(env.lock, JSON.stringify({ pid: process.pid + 1, takenAt: new Date(now).toISOString() }));
  releaseLock({ lock: env.lock });
  assert.equal(fs.existsSync(env.lock), true);
  fs.writeFileSync(env.lock, JSON.stringify({ pid: process.pid, takenAt: new Date(now).toISOString() }));
  releaseLock({ lock: env.lock });
  assert.equal(fs.existsSync(env.lock), false);
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('a second run waits for the lock, and gives up with the holder named', async () => {
  const env = setup();
  fs.writeFileSync(env.lock, JSON.stringify({ pid: 424242, takenAt: new Date().toISOString() }));
  const messages = [];
  let ran = false;
  await assert.rejects(
    withLock(() => {
      ran = true;
    }, { lock: env.lock, waitMs: 300, pollMs: 50, isAlive: () => true, log: (message) => messages.push(message) }),
    /another visual-gate run \(pid 424242, since [^)]+\) still holds/,
  );
  assert.equal(ran, false);
  assert.equal(messages.length, 1, 'it says once that it is waiting');

  // Once the holder is gone it runs, and lets go afterwards.
  const result = await withLock(() => 'ran', { lock: env.lock, waitMs: 300, pollMs: 50, isAlive: () => false, log: quiet });
  assert.equal(result, 'ran');
  assert.equal(fs.existsSync(env.lock), false);
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('the nightly restore puts back what a killed run left, and does nothing otherwise', async () => {
  const env = setup();
  assert.deepEqual(await restoreKilledRun({ ...env, log: quiet }), [], 'no backup, nothing to do');
  backUpLiveData({ ...env, log: quiet });
  swap(env);
  // Killed here.
  const restored = await restoreKilledRun({ ...env, log: quiet });
  assert.deepEqual(restored, [...SWAPPED_FILES]);
  for (const name of SWAPPED_FILES) assert.equal(read(env.dir, name), `live ${name}\n`, name);
  assert.equal(fs.existsSync(env.lock), false, 'the lock is released');
  fs.rmSync(env.base, { recursive: true, force: true });
});

test('the gate compares the five key routes, and the full run runs every audits spec', () => {
  const spec = fs.readFileSync(path.join(root, 'tests', 'playwright', 'portfolio-audits.spec.mjs'), 'utf8');
  const routePaths = Object.fromEntries([...spec.matchAll(/\{ name: '([\w-]+)', path: '([^']+)', ready: '[^']+' \}/g)].map((match) => [match[1], match[2]]));
  for (const name of ['colophon', 'privacy']) assert.ok(routePaths[name], `the spec renders ${name}`);
  // The routes the roadmap item named for the deploy gate.
  assert.deepEqual(GATE_ROUTES.map((name) => routePaths[name]), ['/', '/ai/', '/healthcare-it/', '/resume/', '/catalog/']);

  const gateArgs = playwrightArgs();
  assert.ok(gateArgs.includes('tests/playwright/portfolio-audits.spec.mjs'));
  const gate = new RegExp(gateArgs[gateArgs.indexOf('-g') + 1]);
  // Playwright matches the project, file, describe and test titles, space-separated.
  const title = (route, viewport) => `chromium portfolio-audits.spec.mjs Playwright visual baselines ${route} ${viewport} viewport matches baseline`;
  for (const route of GATE_ROUTES) {
    for (const viewport of ['desktop', 'mobile']) assert.match(title(route, viewport), gate);
  }
  assert.doesNotMatch(title('status', 'desktop'), gate);
  assert.doesNotMatch('chromium portfolio-audits.spec.mjs Playwright axe accessibility audit home is clean', gate);
  assert.ok(!gateArgs.some((arg) => arg.startsWith('--update-snapshots')), 'the gate never rewrites a baseline');

  assert.deepEqual(playwrightArgs({ all: true }), ['test', '--config=playwright.audits.config.mjs']);
  assert.deepEqual(playwrightArgs({ all: true, update: true }), ['test', '--config=playwright.audits.config.mjs', '--update-snapshots=all']);
});

test('deploy:preflight runs the gate on its own fixture build before the real one', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const steps = pkg.scripts['deploy:preflight'].split('&&').map((step) => step.trim());
  const gate = steps.indexOf('npm run visual:gate');
  assert.ok(gate > 0, 'the gate is a preflight step');
  assert.ok(gate < steps.indexOf('npm run build'), 'the real build comes after it, so dist/ ships live data');
  assert.equal(pkg.scripts['visual:gate'], 'node scripts/visual-gate.mjs');
  assert.equal(pkg.scripts['audit:playwright'], 'node scripts/visual-gate.mjs --all');
  assert.equal(pkg.scripts['audit:playwright:update'], 'node scripts/visual-gate.mjs --all --update');
});
