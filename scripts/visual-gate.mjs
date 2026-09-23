#!/usr/bin/env node
// Screenshot comparison on a fixture build.
//
// The baselines under tests/playwright/__screenshots__/ are rendered from the
// committed fixtures in src/data/fixtures/generated/, so a comparison has to
// render from them too: live star counts, rankings and release lists move the
// pixels on every refresh. This swaps the fixtures in for the gitignored
// generated data, builds, runs the screenshot tests, and puts the live data
// back even when a step fails. A run killed mid-swap leaves its backup behind,
// and the next run restores it before it does anything else, so fixture data
// can't reach a later build or deploy.
//
//   node scripts/visual-gate.mjs                   the five routes deploy:preflight gates
//   node scripts/visual-gate.mjs --all             the whole audits suite (npm run audit:playwright)
//   node scripts/visual-gate.mjs --all --update    the same, rewriting every baseline
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const dataDir = path.join(root, 'src', 'data');
const fixturesDir = path.join(dataDir, 'fixtures', 'generated');
const backupDir = path.join(root, '.tmp', 'visual-gate', 'live-data');

// What install-generated-fixtures.mjs overwrites, plus the catalog check's
// record. That one has no fixture, and the live copy would put today's catalog
// gap on /catalog/.
export const SWAPPED_FILES = Object.freeze([
  '_stars.json',
  '_meta.json',
  '_readmes.json',
  '_releases.json',
  '_stats.json',
  '_readme-refresh.json',
  '_profile-projects.json',
  '_catalog-drift.json',
]);

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

async function main() {
  const args = new Set(process.argv.slice(2));
  const unknown = [...args].filter((arg) => arg !== '--all' && arg !== '--update');
  if (unknown.length > 0) {
    console.error(`visual-gate: unknown argument ${unknown.join(', ')}. Use --all and --update.`);
    return 2;
  }
  const all = args.has('--all');
  const update = args.has('--update');
  if (update && !all) {
    console.error('visual-gate: --update regenerates every baseline, so it needs --all.');
    return 2;
  }

  backUpLiveData();
  try {
    fs.rmSync(path.join(dataDir, '_catalog-drift.json'), { force: true });
    if (run('node', ['scripts/install-generated-fixtures.mjs']) !== 0) return 1;
    if (run('npm', ['run', 'build:ci']) !== 0) return 1;
    return run(process.execPath, [path.join('node_modules', '@playwright', 'test', 'cli.js'), ...playwrightArgs({ all, update })]);
  } finally {
    restoreLiveData({ log: console.log });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
