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
//   node scripts/visual-gate.mjs                   the five routes deploy:preflight gates, plus GATE_CHECKS
//   node scripts/visual-gate.mjs --all             the whole audits suite (npm run audit:playwright)
//   node scripts/visual-gate.mjs --all --update    the same, rewriting every baseline
//   node scripts/visual-gate.mjs --restore         only put back what a killed run left
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const dataDir = path.join(root, 'src', 'data');
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
// How long a second run waits for the first before it gives up, and how often
// it looks.
const LOCK_WAIT_MS = 20 * 60_000;
const LOCK_POLL_MS = 5_000;

// The routes whose look matters most, compared in both themes and at both
// viewport sizes before every deploy.
export const GATE_ROUTES = Object.freeze(['home', 'ai', 'healthcare', 'resume', 'catalog']);

// The browser checks the gate runs besides the screenshots: every route's
// text kept off a phone screen's edge, and the command palette working offline
// for a returning visitor. Only audit:playwright ran them before, and nothing
// runs that on a schedule (eighth drain review).
export const GATE_CHECKS = Object.freeze([
  'Mobile gutter audit [\\w-]+ keeps its text off the screen edge at 390px',
  'the command palette works offline for a returning visitor who never opened it',
]);

/**
 * The Playwright CLI arguments for a run. The gate compares the key routes'
 * viewport screenshots and runs GATE_CHECKS; --all runs every audits spec
 * (axe, target size, layout, screenshots and the rest), which all pass on the
 * fixture data.
 */
export function playwrightArgs({ all = false, update = false } = {}) {
  const args = ['test', '--config=playwright.audits.config.mjs'];
  if (!all) {
    const screenshots = `visual baselines (${GATE_ROUTES.join('|')}) (desktop|mobile) viewport matches baseline`;
    args.push('tests/playwright/portfolio-audits.spec.mjs', 'tests/playwright/sw-lifecycle.spec.mjs', '-g', [screenshots, ...GATE_CHECKS].join('|'));
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

/**
 * Put the live data back from the backup, every swapped file of it, and drop
 * the backup. That includes a file something rewrote after a run was killed: a
 * refresh on top of the fixture caches keeps a fixture row wherever GitHub
 * answers 304, and a token-less one can rewrite a fixture file without making
 * it live, so nothing written since the swap can be trusted. The backup is at
 * worst a day older, and whole: its ETags describe its own bodies.
 * @returns {string[]} the names restored
 */
export function restoreLiveData({ dir = dataDir, backup = backupDir, log = console.warn } = {}) {
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
    const file = path.join(dir, name);
    if (present.includes(name)) fs.copyFileSync(path.join(backup, name), file);
    else fs.rmSync(file, { force: true });
    restored.push(name);
  }
  fs.rmSync(backup, { recursive: true, force: true });
  log(`visual-gate: restored ${restored.length} live data file(s).`);
  return restored;
}

/** Whatever a killed run left, put back without taking the lock; the caller holds it. */
export function restoreLeftovers({ dir = dataDir, backup = backupDir, log = console.warn } = {}) {
  return fs.existsSync(backup) ? restoreLiveData({ dir, backup, log }) : [];
}

export function backUpLiveData({ dir = dataDir, backup = backupDir, log = console.warn } = {}) {
  if (fs.existsSync(backup)) {
    log('visual-gate: found the backup of a run that stopped before restoring; restoring it first.');
    restoreLiveData({ dir, backup, log });
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
 * The lock file as it stands: absent, busy (Windows is still deleting it), or
 * there, with its parsed record (null if it doesn't parse) and an `id` naming
 * this lock instance, its nonce or a hash of its text.
 */
function readLock(lock) {
  let raw;
  try {
    raw = fs.readFileSync(lock, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { state: 'absent' };
    if (error.code === 'EPERM' || error.code === 'EACCES' || error.code === 'EBUSY') return { state: 'busy' };
    throw error;
  }
  let holder = null;
  try {
    holder = JSON.parse(raw);
  } catch {
    holder = null;
  }
  const nonce = holder?.nonce;
  const id = typeof nonce === 'string' && /^[\w.-]{1,80}$/.test(nonce) ? nonce : `h${createHash('sha256').update(raw).digest('hex').slice(0, 32)}`;
  return { state: 'present', holder, id };
}

/**
 * Claim the lock instance `id`: create its claim file, which only one process
 * can. Only a claim's owner replaces or removes that instance, so a stale lock
 * is replaced once, and a run never takes a lock someone else took first. A
 * claim is held for milliseconds; one left by a process killed in that window
 * is itself claimed (one level down) and removed once that process is gone.
 * @returns {(() => void) | null} the claim's release, or null if another process has it
 */
function claimInstance(lock, id, isAlive, depth = 0) {
  const claim = `${lock}.${id}.claim`;
  const record = `${JSON.stringify({ pid: process.pid, nonce: randomUUID() })}\n`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.writeFileSync(claim, record, { flag: 'wx' });
      return () => fs.rmSync(claim, { force: true });
    } catch (error) {
      if (error.code !== 'EEXIST' && error.code !== 'EPERM') throw error;
    }
    if (depth > 0) return null;
    const left = readLock(claim);
    if (left.state !== 'present' || (Number.isSafeInteger(left.holder?.pid) && isAlive(left.holder.pid))) return null;
    const releaseStale = claimInstance(claim, left.id, isAlive, depth + 1);
    if (!releaseStale) return null;
    try {
      if (readLock(claim).id === left.id) fs.rmSync(claim, { force: true });
    } finally {
      releaseStale();
    }
  }
  return null;
}

/** A holder whose process is gone, or whose lock is over an hour old. A lock from the future is fresh. */
function isStale(holder, now, isAlive) {
  if (holder === null || !Number.isSafeInteger(holder?.pid) || !isAlive(holder.pid)) return true;
  const takenAt = Date.parse(holder.takenAt ?? '');
  return !Number.isFinite(takenAt) || now - takenAt > LOCK_MAX_AGE_MS;
}

/** Move `from` over `to`, retrying while Windows holds `to` open. */
function replaceFile(from, to) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (error) {
      if (attempt >= 20 || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      const until = Date.now() + 10;
      while (Date.now() < until) {
        // A reader has the file open for a moment; wait it out.
      }
    }
  }
}

/**
 * Take the gate's lock, or say who holds it. Two runs at once would share one
 * backup, and the second would put the live data back under the first. The
 * record is written to a file of this process's own first and then hard-linked
 * into place, which fails if a lock exists, so no reader ever sees half a lock.
 * A stale lock is replaced in one rename by the one process that claims it
 * (claimInstance), so the lock is never missing while runs contend for it.
 * The eleventh drain review got two holders at once out of the old way, which
 * moved a stale lock aside and put back one that turned out fresh.
 * @returns {{ taken: boolean, holder: { pid?: number, takenAt?: string } | null }}
 */
export function tryLock({ lock = lockPath, now = Date.now(), isAlive = pidAlive } = {}) {
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  const nonce = `${process.pid}.${randomUUID()}`;
  const draft = `${lock}.${nonce}.new`;
  fs.writeFileSync(draft, `${JSON.stringify({ pid: process.pid, takenAt: new Date(now).toISOString(), nonce })}\n`);
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        fs.linkSync(draft, lock);
        return { taken: true, holder: null };
      } catch (error) {
        // EPERM: on Windows, a lock that's being deleted can't be replaced yet.
        if (error.code !== 'EEXIST' && error.code !== 'EPERM') throw error;
      }
      const current = readLock(lock);
      if (current.state !== 'present') continue;
      if (!isStale(current.holder, now, isAlive)) return { taken: false, holder: current.holder };
      const release = claimInstance(lock, current.id, isAlive);
      if (!release) return { taken: false, holder: current.holder };
      try {
        // Nobody else can replace or remove this instance while the claim is
        // ours, so if it's still the one judged stale, it's ours to replace.
        if (readLock(lock).id !== current.id) continue;
        replaceFile(draft, lock);
        return { taken: true, holder: null };
      } finally {
        release();
      }
    }
    const current = readLock(lock);
    return { taken: false, holder: current.state === 'present' ? current.holder : null };
  } finally {
    fs.rmSync(draft, { force: true });
  }
}

/**
 * Drop the lock if this process holds it. It claims the instance first, the
 * way a takeover does, so a release never removes a lock that has just
 * replaced its own.
 */
export function releaseLock({ lock = lockPath, isAlive = pidAlive } = {}) {
  const current = readLock(lock);
  if (current.state !== 'present' || current.holder?.pid !== process.pid) return;
  const release = claimInstance(lock, current.id, isAlive);
  if (!release) return;
  try {
    if (readLock(lock).id === current.id) fs.rmSync(lock, { force: true });
  } finally {
    release();
  }
}

/**
 * Take the lock, waiting up to `waitMs` for another run to finish, and return
 * the function that releases it.
 * @returns {Promise<() => void>}
 */
export async function acquireLock({ lock = lockPath, waitMs = LOCK_WAIT_MS, pollMs = LOCK_POLL_MS, log = console.warn, isAlive = pidAlive } = {}) {
  const deadline = Date.now() + waitMs;
  let announced = false;
  for (;;) {
    const { taken, holder } = tryLock({ lock, isAlive });
    if (taken) return () => releaseLock({ lock });
    const who = `pid ${holder?.pid ?? '?'}, since ${holder?.takenAt ?? '?'}`;
    if (Date.now() >= deadline) throw new Error(`another visual-gate run (${who}) still holds ${lock}`);
    if (!announced) log(`visual-gate: waiting for the run that holds the lock (${who}).`);
    announced = true;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

/** Run `callback` holding the lock. */
export async function withLock(callback, { lock = lockPath, waitMs = LOCK_WAIT_MS, pollMs = LOCK_POLL_MS, log = console.warn, isAlive = pidAlive } = {}) {
  const release = await acquireLock({ lock, waitMs, pollMs, log, isAlive });
  try {
    return await callback();
  } finally {
    release();
  }
}

/**
 * Put back whatever a killed run left, under the lock. The nightly and
 * fetch-stars call this before they fetch anything.
 * @returns {Promise<string[]>} the names restored
 */
export function restoreKilledRun({
  dir = dataDir,
  backup = backupDir,
  lock = lockPath,
  log = console.warn,
  waitMs = LOCK_WAIT_MS,
  pollMs = LOCK_POLL_MS,
} = {}) {
  return withLock(() => restoreLeftovers({ dir, backup, log }), { lock, log, waitMs, pollMs });
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
