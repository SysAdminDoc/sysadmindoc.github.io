#!/usr/bin/env node
// Screenshot comparison on a fixture build.
//
// The baselines under tests/playwright/__screenshots__/ are rendered from the
// committed fixtures in src/data/fixtures/generated/, so a comparison has to
// render from them too: live star counts, rankings and release lists move the
// pixels on every refresh. This swaps the fixtures in for the gitignored
// generated data, builds, runs the screenshot tests, and puts the live data
// back even when a step fails. A run killed mid-swap leaves its backup behind.
// The next gate run restores it before anything else, and so does the nightly
// refresh (refresh-and-deploy.mjs) before it fetches, since a refresh on top of
// fixture caches keeps fixture rows wherever GitHub answers 304. deploy-vps
// refuses a build whose status.json says it came from fixtures, whatever path
// got it there. One run at a time holds .tmp/visual-gate/lock.json.
//
//   node scripts/visual-gate.mjs                   the five routes deploy:preflight gates
//   node scripts/visual-gate.mjs --all             the whole audits suite (npm run audit:playwright)
//   node scripts/visual-gate.mjs --all --update    the same, rewriting every baseline
//   node scripts/visual-gate.mjs --restore         only put back what a killed run left
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const dataDir = path.join(root, 'src', 'data');
const fixturesDir = path.join(dataDir, 'fixtures', 'generated');
const backupDir = path.join(root, '.tmp', 'visual-gate', 'live-data');
const lockPath = path.join(root, '.tmp', 'visual-gate', 'lock.json');

// Generated files with no fixture, which the swap removes for the run. The
// catalog check's live record would put today's catalog gap on /catalog/. The
// ETags would outlive a killed run beside the fixture caches, and fetch-stars
// would then take GitHub's 304s as leave to keep the fixture rows.
export const REMOVED_FILES = Object.freeze(['_catalog-drift.json', '_etags.json']);

// What install-generated-fixtures.mjs overwrites, plus the files it has no
// fixture for.
export const SWAPPED_FILES = Object.freeze([
  '_stars.json',
  '_meta.json',
  '_readmes.json',
  '_releases.json',
  '_stats.json',
  '_readme-refresh.json',
  '_profile-projects.json',
  ...REMOVED_FILES,
]);

// No gate run lasts an hour, so a lock that old belongs to a run that died,
// whatever process its pid names by now.
export const LOCK_MAX_AGE_MS = 60 * 60_000;

// The routes whose look matters most, compared in both themes and at both
// viewport sizes before every deploy.
export const GATE_ROUTES = Object.freeze(['home', 'ai', 'healthcare', 'resume', 'catalog']);

/**
 * The Playwright CLI arguments for a run. The gate compares the key routes'
 * viewport screenshots; --all runs every audits spec (axe, target size,
 * layout, screenshots and the rest), which all pass on the fixture data.
 */
export function playwrightArgs({ all = false, update = false } = {}) {
  const args = ['test', '--config=playwright.audits.config.mjs'];
  if (!all) {
    args.push('tests/playwright/portfolio-audits.spec.mjs', '-g', `visual baselines (${GATE_ROUTES.join('|')}) (desktop|mobile) viewport matches baseline`);
  }
  // `all`, not the default `changed`: a baseline within the diff threshold
  // would otherwise stay a render of whatever data it was taken from.
  if (update) args.push('--update-snapshots=all');
  return args;
}

function run(command, args) {
  console.log(`$ ${command} ${args.join(' ')}`);
  // npm is a .cmd shim on Windows, which spawnSync can't start without a
  // shell. Only `npm run build:ci` goes that way; Playwright's grep pattern
  // holds characters cmd.exe would read as pipes, so it runs through node.
  const result = process.platform === 'win32' && command === 'npm'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', ['npm', ...args].join(' ')], { stdio: 'inherit', windowsHide: true })
    : spawnSync(command, args, { stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

/** Whether `name` in `dir` is still what the swap put there. */
function holdsFixture(dir, fixtures, name) {
  const file = path.join(dir, name);
  const fixture = path.join(fixtures, name);
  // A file with no fixture (the catalog record) is removed by the swap.
  if (!fs.existsSync(fixture)) return !fs.existsSync(file);
  return fs.existsSync(file) && fs.readFileSync(file).equals(fs.readFileSync(fixture));
}

/**
 * Put the live data back from the backup, and drop the backup. Only files that
 * still hold what the swap put there are restored: after a killed run, the next
 * data refresh rewrites them, and that copy is newer than the backup.
 * @returns {string[]} the names restored
 */
export function restoreLiveData({ dir = dataDir, backup = backupDir, fixtures = fixturesDir, log = console.warn } = {}) {
  const manifest = path.join(backup, 'manifest.json');
  if (!fs.existsSync(manifest)) {
    // The manifest is written last, and nothing is swapped until it exists, so
    // a backup without one means the live files were never touched.
    fs.rmSync(backup, { recursive: true, force: true });
    return [];
  }
  const { present } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  const restored = [];
  for (const name of SWAPPED_FILES) {
    if (!holdsFixture(dir, fixtures, name)) continue;
    const file = path.join(dir, name);
    if (present.includes(name)) fs.copyFileSync(path.join(backup, name), file);
    else fs.rmSync(file, { force: true });
    restored.push(name);
  }
  fs.rmSync(backup, { recursive: true, force: true });
  log(`visual-gate: restored ${restored.length} live data file(s).`);
  return restored;
}

export function backUpLiveData({ dir = dataDir, backup = backupDir, fixtures = fixturesDir, log = console.warn } = {}) {
  if (fs.existsSync(backup)) {
    log('visual-gate: found the backup of a run that stopped before restoring; restoring it first.');
    restoreLiveData({ dir, backup, fixtures, log });
  }
  fs.mkdirSync(backup, { recursive: true });
  const present = [];
  for (const name of SWAPPED_FILES) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    fs.copyFileSync(file, path.join(backup, name));
    present.push(name);
  }
  fs.writeFileSync(path.join(backup, 'manifest.json'), `${JSON.stringify({ present })}\n`, 'utf8');
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

/**
 * Take the gate's lock, or say who holds it. Two runs at once would share one
 * backup, and the second would put the live data back under the first. A lock
 * whose process is gone, or that's over an hour old, is taken over.
 * @returns {{ taken: boolean, holder: { pid?: number, takenAt?: string } | null }}
 */
export function tryLock({ lock = lockPath, now = Date.now(), isAlive = pidAlive } = {}) {
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  let holder = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.writeFileSync(lock, `${JSON.stringify({ pid: process.pid, takenAt: new Date(now).toISOString() })}\n`, { flag: 'wx' });
      return { taken: true, holder: null };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    try {
      holder = JSON.parse(fs.readFileSync(lock, 'utf8'));
    } catch {
      holder = null;
    }
    const age = now - Date.parse(holder?.takenAt ?? '');
    if (Number.isSafeInteger(holder?.pid) && isAlive(holder.pid) && age >= 0 && age < LOCK_MAX_AGE_MS) {
      return { taken: false, holder };
    }
    fs.rmSync(lock, { force: true });
  }
  return { taken: false, holder };
}

/** Drop the lock if this process holds it. */
export function releaseLock({ lock = lockPath } = {}) {
  try {
    if (JSON.parse(fs.readFileSync(lock, 'utf8')).pid !== process.pid) return;
  } catch {
    return;
  }
  fs.rmSync(lock, { force: true });
}

/** Run `callback` holding the lock, waiting up to `waitMs` for another run to finish. */
export async function withLock(callback, { lock = lockPath, waitMs = 20 * 60_000, pollMs = 5_000, log = console.warn, isAlive = pidAlive } = {}) {
  const deadline = Date.now() + waitMs;
  let announced = false;
  for (;;) {
    const { taken, holder } = tryLock({ lock, isAlive });
    if (taken) break;
    const who = `pid ${holder?.pid ?? '?'}, since ${holder?.takenAt ?? '?'}`;
    if (Date.now() >= deadline) throw new Error(`another visual-gate run (${who}) still holds ${lock}`);
    if (!announced) log(`visual-gate: waiting for the run that holds the lock (${who}).`);
    announced = true;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  try {
    return await callback();
  } finally {
    releaseLock({ lock });
  }
}

/**
 * Put back whatever a killed run left, under the lock. The nightly calls this
 * before it fetches anything.
 * @returns {Promise<string[]>} the names restored
 */
export function restoreKilledRun({ dir = dataDir, backup = backupDir, fixtures = fixturesDir, lock = lockPath, log = console.warn, waitMs, pollMs } = {}) {
  return withLock(() => (fs.existsSync(backup) ? restoreLiveData({ dir, backup, fixtures, log }) : []), { lock, log, waitMs, pollMs });
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const unknown = [...args].filter((arg) => !['--all', '--update', '--restore'].includes(arg));
  if (unknown.length > 0) {
    console.error(`visual-gate: unknown argument ${unknown.join(', ')}. Use --all, --update or --restore.`);
    return 2;
  }
  if (args.has('--restore')) {
    await restoreKilledRun({ log: console.log });
    return 0;
  }
  const all = args.has('--all');
  const update = args.has('--update');
  if (update && !all) {
    console.error('visual-gate: --update regenerates every baseline, so it needs --all.');
    return 2;
  }

  return withLock(() => {
    backUpLiveData();
    try {
      for (const name of REMOVED_FILES) fs.rmSync(path.join(dataDir, name), { force: true });
      if (run('node', ['scripts/install-generated-fixtures.mjs']) !== 0) return 1;
      if (run('npm', ['run', 'build:ci']) !== 0) return 1;
      return run(process.execPath, [path.join('node_modules', '@playwright', 'test', 'cli.js'), ...playwrightArgs({ all, update })]);
    } finally {
      restoreLiveData({ log: console.log });
    }
  }, { log: console.log });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
