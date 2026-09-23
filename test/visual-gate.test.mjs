import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { GATE_ROUTES, SWAPPED_FILES, backUpLiveData, playwrightArgs, restoreLiveData } from '../scripts/visual-gate.mjs';

const root = process.cwd();
const quiet = () => {};

/** A data dir holding live copies of every swapped file, and a fixtures dir. */
function setup() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-gate-'));
  const dir = path.join(base, 'data');
  const fixtures = path.join(base, 'fixtures');
  const backup = path.join(base, 'backup');
  fs.mkdirSync(dir);
  fs.mkdirSync(fixtures);
  for (const name of SWAPPED_FILES) {
    fs.writeFileSync(path.join(dir, name), `live ${name}\n`);
    // The catalog record has no fixture, as in the repo.
    if (name !== '_catalog-drift.json') fs.writeFileSync(path.join(fixtures, name), `fixture ${name}\n`);
  }
  return { base, dir, fixtures, backup };
}

/** What the gate does between backup and restore. */
function swap({ dir, fixtures }) {
  fs.rmSync(path.join(dir, '_catalog-drift.json'), { force: true });
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
  // What install-generated-fixtures.mjs copies over, plus the catalog record
  // the gate deletes itself. A file missing here would be overwritten, or
  // deleted, and never put back.
  const installer = fs.readFileSync(path.join(root, 'scripts', 'install-generated-fixtures.mjs'), 'utf8');
  const installed = [...(installer.match(/const requiredFiles = \[([\s\S]*?)\];/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.ok(installed.length >= 7, 'the installer list was read');
  const gate = fs.readFileSync(path.join(root, 'scripts', 'visual-gate.mjs'), 'utf8');
  const deleted = [...gate.matchAll(/fs\.rmSync\(path\.join\(dataDir, '([^']+)'\)/g)].map((match) => match[1]);
  assert.deepEqual(deleted, ['_catalog-drift.json']);
  assert.deepEqual([...SWAPPED_FILES].sort(), [...new Set([...installed, ...deleted])].sort());
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
