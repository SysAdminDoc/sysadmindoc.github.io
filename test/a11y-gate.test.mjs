import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const pathExists = async (target) => fs.access(target).then(() => true, () => false);

test('a11y audit npm script is blocking by default', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));

  assert.equal(pkg.scripts['a11y:audit'], 'node scripts/audit-a11y.mjs --strict');
  assert.equal(pkg.scripts['a11y:audit:advisory'], 'node scripts/audit-a11y.mjs');
  assert.equal(pkg.scripts['audit:playwright'], 'playwright test --config=playwright.audits.config.mjs');
  assert.equal(pkg.scripts['audit:playwright:update'], 'playwright test --config=playwright.audits.config.mjs --update-snapshots');
  assert.equal(
    pkg.scripts['audit:interactions'],
    'playwright test --config=playwright.interactions.config.mjs tests/playwright/interaction-smoke.spec.mjs',
  );
});

test('local release gates keep the blocking a11y gate available', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));

  assert.equal(await pathExists(path.join(root, '.github', 'workflows')), false);
  assert.match(pkg.scripts.test, /node --test/);
  assert.match(pkg.scripts.build, /npm run data:validate/);
  assert.match(pkg.scripts.build, /npm run build:ci/);
  assert.equal(pkg.scripts['a11y:audit'], 'node scripts/audit-a11y.mjs --strict');
});

test('Playwright browser a11y and visual baseline gates run locally', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const config = await fs.readFile(path.join(root, 'playwright.audits.config.mjs'), 'utf8');
  const interactionsConfig = await fs.readFile(path.join(root, 'playwright.interactions.config.mjs'), 'utf8');
  const spec = await fs.readFile(path.join(root, 'tests', 'playwright', 'portfolio-audits.spec.mjs'), 'utf8');
  const stateSpec = await fs.readFile(path.join(root, 'tests', 'playwright', 'state-coverage.spec.mjs'), 'utf8');
  const targetSizeHelper = await fs.readFile(
    path.join(root, 'tests', 'playwright', 'helpers', 'target-size.mjs'),
    'utf8',
  );

  assert.equal(pkg.scripts['audit:playwright'], 'playwright test --config=playwright.audits.config.mjs');
  assert.equal(
    pkg.scripts['audit:interactions'],
    'playwright test --config=playwright.interactions.config.mjs tests/playwright/interaction-smoke.spec.mjs',
  );
  assert.match(config, /snapshotPathTemplate: '\{testDir\}\/__screenshots__\/\{platform\}\/\{projectName\}\/\{arg\}\{ext\}'/);
  assert.equal(await pathExists(path.join(root, 'tests', 'playwright', '__screenshots__', 'linux', 'chromium')), true);
  assert.equal(await pathExists(path.join(root, 'tests', 'playwright', '__screenshots__', 'linux', 'chromium-light')), true);
  assert.equal(await pathExists(path.join(root, 'tests', 'playwright', '__screenshots__', 'chromium')), false);
  assert.equal(await pathExists(path.join(root, 'tests', 'playwright', '__screenshots__', 'chromium-light')), false);
  assert.match(config, /PLAYWRIGHT_AUDIT_PORT \?\? process\.env\.PLAYWRIGHT_PORT \?\? '4324'/);
  // Was: assert.match(config, /reuseExistingServer: false/). That assertion
  // pinned a webServer block that provably cannot work here — Astro 7 preview
  // self-daemonizes under a non-TTY stdout, so Playwright always reported
  // "exited early". The intent behind it (never audit against a leftover server
  // serving an older dist/) is kept, and now pinned against the mechanism that
  // actually runs: setup stops any existing daemon before starting its own.
  const previewSetup = await fs.readFile(path.join(root, 'tests', 'playwright', 'preview-server.mjs'), 'utf8');
  assert.match(previewSetup, /astroPreview\(\['stop'\], \{ ignoreErrors: true \}\);/);
  assert.doesNotMatch(config, /reuseExistingServer/);
  assert.match(interactionsConfig, /playwright\.audits\.config\.mjs/);
  assert.match(interactionsConfig, /outputDir: '\.tmp\/playwright-interactions-results'/);
  assert.match(interactionsConfig, /outputFolder: '\.tmp\/playwright-interactions-report'/);
  assert.match(spec, /@axe-core\/playwright/);
  assert.match(spec, /collectTargetSizeViolations/);
  assert.match(stateSpec, /expectTargetSizeClean/);
  assert.match(targetSizeHelper, /export async function collectTargetSizeViolations/);
  assert.match(spec, /toHaveScreenshot/);
});

test('the a11y gates are reachable from a chain, not merely declared', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));

  // The previous assertions in this file check that the scripts EXIST. That is
  // what let a11y sit outside every chain: `deploy:preflight` never reached
  // `a11y:audit` and nothing reached the axe suite, so both read green while
  // blocking nothing. Assert the call path instead.
  assert.match(pkg.scripts['build:ci'], /npm run a11y:audit\b/, 'build:ci must run the static a11y gate');
  assert.match(
    pkg.scripts['deploy:preflight'],
    /npm run a11y:audit:browser\b/,
    'deploy:preflight must run the axe-core browser gate',
  );

  // build:ci reads dist/, so the gate has to come after the build produces it.
  const ci = pkg.scripts['build:ci'];
  assert.ok(ci.indexOf('astro build') < ci.indexOf('npm run a11y:audit'), 'a11y:audit must run after astro build');

  // The browser gate deliberately excludes the screenshot suites: those baselines
  // are fixture-backed and per-platform, so they cannot run against live data.
  assert.match(pkg.scripts['a11y:audit:browser'], /-g "accessibility audit\|target-size audit"/);
});

test('the audits config manages the preview itself because Astro 7 daemonizes it', async () => {
  const config = await fs.readFile(path.join(root, 'playwright.audits.config.mjs'), 'utf8');

  // `astro preview` self-daemonizes under a non-TTY stdout, so Playwright's
  // managed webServer always reports "exited early". Reintroducing webServer here
  // would make deploy:preflight fail on a server that is actually running fine.
  assert.doesNotMatch(config, /webServer\s*:/);
  assert.match(config, /globalSetup: '\.\/tests\/playwright\/preview-server\.mjs'/);
  assert.match(config, /globalTeardown: '\.\/tests\/playwright\/preview-server-teardown\.mjs'/);

  // Setup and teardown must be separate modules: Playwright invokes each hook's
  // default export, so pointing both at one file runs setup twice.
  const setup = await fs.readFile(path.join(root, 'tests', 'playwright', 'preview-server.mjs'), 'utf8');
  const teardown = await fs.readFile(path.join(root, 'tests', 'playwright', 'preview-server-teardown.mjs'), 'utf8');
  assert.match(setup, /export default async function globalSetup/);
  assert.match(teardown, /export default async function globalTeardown/);
  // Ownership crosses a module boundary, so it cannot ride on an env var. The
  // marker path itself now lives in preview-server-control.mjs, so these assert
  // the accessors rather than the constant.
  assert.match(setup, /writeMarker\(\{ pid: process\.pid/);
  assert.match(teardown, /readMarker\(\)/);
  assert.doesNotMatch(setup, /process\.env\.PLAYWRIGHT_OWNS_PREVIEW/);
});

test('the preview hooks refuse a concurrent run instead of stopping another run server', async () => {
  const setup = await fs.readFile(path.join(root, 'tests', 'playwright', 'preview-server.mjs'), 'utf8');
  const teardown = await fs.readFile(path.join(root, 'tests', 'playwright', 'preview-server-teardown.mjs'), 'utf8');
  const control = await fs.readFile(path.join(root, 'tests', 'playwright', 'preview-server-control.mjs'), 'utf8');

  // Astro keys its preview lock on the project root, not the port, so only one
  // preview daemon exists per checkout however many ports the configs declare.
  // A second run used to stop the first run's server mid-test, and the first
  // run's teardown then stopped the second run's.
  assert.match(setup, /markerOwnerAlive\(existing\)/);
  assert.match(setup, /already owns the preview server/);
  assert.match(control, /process\.kill\(marker\.pid, 0\)/);

  // Only the process that wrote the marker may stop the server.
  assert.match(teardown, /marker\.pid !== process\.pid/);

  // A killed run must not block every later run with a stale marker.
  const { markerOwnerAlive, MARKER_MAX_AGE_MS } = await import('../tests/playwright/preview-server-control.mjs');
  const now = Date.now();
  const fresh = new Date(now).toISOString();

  assert.equal(markerOwnerAlive(null, now), false);
  assert.equal(markerOwnerAlive({}, now), false);
  assert.equal(markerOwnerAlive({ pid: 0x7ffffffe, startedAt: fresh }, now), false, 'a dead owner must not look alive');
  assert.equal(markerOwnerAlive({ pid: process.pid, startedAt: fresh }, now), true);

  // process.kill(pid, 0) answers "does some process exist", not "is it the run
  // that wrote this marker". Windows recycles pids quickly, so a hard-killed run
  // whose pid gets reused would otherwise refuse every later audit for as long
  // as that unrelated process happened to live.
  assert.equal(
    markerOwnerAlive({ pid: process.pid, startedAt: new Date(now - MARKER_MAX_AGE_MS - 1000).toISOString() }, now),
    false,
    'a marker older than the cap must be stale even when its pid is live',
  );
  // No timestamp means it cannot be aged out, so it must not be trusted either.
  assert.equal(markerOwnerAlive({ pid: process.pid }, now), false);
});
