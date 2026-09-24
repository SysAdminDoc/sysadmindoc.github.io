import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { REPORT_ONLY_FLAGS } from '../scripts/lib/report-only-flags.mjs';
import { REMOVED_FILES, SWAPPED_FILES } from '../scripts/visual-gate.mjs';

const root = process.cwd();
const runner = path.join(root, 'scripts', 'refresh-and-deploy.mjs');

// Each test's bound only ends a hang. On 2026-09-23 a busy PC ran this file
// six times slower than usual, so the bound sits far above any honest run.
const HANG_BOUND_MS = 240_000;

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

/** @param {number} pid */
function killTree(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  } else {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

// How long npm takes to start a script in `cwd` right now. A busy PC can spend
// a whole fixed step budget here: on 2026-09-23 the runner killed a fake step
// at 8 s before it had run a line.
/** @param {string} cwd */
function npmStartMs(cwd) {
  const started = Date.now();
  spawnSync('npm run noop', {
    cwd,
    shell: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, npm_config_update_notifier: 'false' },
  });
  return Date.now() - started;
}

/** @param {string} file */
async function waitForPid(file, timeoutMs = 30_000) {
  for (const deadline = Date.now() + timeoutMs; Date.now() < deadline; ) {
    const pid = Number(await fs.readFile(file, 'utf8').catch(() => '0'));
    if (pid) return pid;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${path.basename(file)} never appeared`);
}

// The fake csp:reports writes the summary the runner reads, naming these new
// first-party violations, and notes the arguments the runner gave it.
/** @param {string} dir @param {string[]} newViolations */
async function writeCspFixture(dir, newViolations = []) {
  await fs.writeFile(
    path.join(dir, 'csp.cjs'),
    [
      "const fs = require('node:fs');",
      "fs.mkdirSync('.tmp', { recursive: true });",
      `const newViolations = ${JSON.stringify(newViolations.map((key) => ({ key, count: 4, hours: 2 })))};`,
      "const line = newViolations.length ? 'NEW first-party: ' + newViolations.map((v) => v.key).join(', ') : 'no new first-party violation';",
      "fs.writeFileSync('.tmp/csp-report-summary.json', JSON.stringify({ line, newViolations }));",
      "fs.writeFileSync('csp-args.txt', process.argv.slice(2).join(' '));",
    ].join('\n'),
  );
}

/** @param {string} cwd */
function runRunner(cwd, env) {
  const child = spawn(process.execPath, [runner], { cwd, env, stdio: 'ignore', windowsHide: true });
  const exited = new Promise((resolve) => child.on('close', (code) => resolve(code)));
  return { child, exited };
}

// A regression that stops killing the step's tree leaves the runner waiting on
// the orphan forever, so bound the test and take the whole tree down on the way out.
test('a hung step is killed at its timeout and recorded as aborted, after a running marker', { timeout: HANG_BOUND_MS }, async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-refresh-'));
  /** @type {import('node:child_process').ChildProcess | null} */
  let runnerChild = null;
  // One hook, in this order: a surviving hang keeps its working directory open,
  // so removing the directory first fails with EBUSY and would skip the kill.
  t.after(async () => {
    if (runnerChild && runnerChild.exitCode === null && runnerChild.pid) killTree(runnerChild.pid);
    const leftover = Number(await fs.readFile(path.join(dir, '.tmp', 'hung-step.pid'), 'utf8').catch(() => '0'));
    if (leftover && isAlive(leftover)) killTree(leftover);
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  });

  // The fake fetch-stars records its own pid, snapshots the status file the
  // runner wrote before it, then hangs until something kills it.
  await fs.writeFile(
    path.join(dir, 'hang.cjs'),
    [
      "const fs = require('node:fs');",
      "fs.writeFileSync('.tmp/hung-step.pid', String(process.pid));",
      "fs.copyFileSync('.tmp/refresh-and-deploy-status.json', '.tmp/status-during-step.json');",
      'setInterval(() => {}, 1000);',
    ].join('\n'),
  );
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'refresh-fixture', private: true, scripts: { 'fetch-stars': 'node hang.cjs', noop: 'node -e ""' } }),
  );

  // The step has to reach its first line before the timeout, so the budget
  // follows how slowly npm starts here, and never drops below the usual 8 s.
  const startMs = npmStartMs(dir);
  const timeoutSeconds = Math.min(120, Math.max(8, Math.ceil((4 * startMs) / 1000)));
  const { child, exited } = runRunner(dir, {
    ...process.env,
    GITHUB_TOKEN: 'test-token',
    REFRESH_STEP_TIMEOUT_MS: String(timeoutSeconds * 1000),
    npm_config_update_notifier: 'false',
  });
  runnerChild = child;
  const exitCode = await exited;
  assert.equal(exitCode, 1, 'a timed-out step fails the run');

  const tmp = path.join(dir, '.tmp');
  const snapshot = await fs.readFile(path.join(tmp, 'status-during-step.json'), 'utf8').catch(async () => {
    const ran = await fs.access(path.join(tmp, 'hung-step.pid')).then(
      () => true,
      () => false,
    );
    throw new Error(
      ran
        ? 'the step found no status file when it started, so no running marker came first'
        : `the fake step never ran inside the ${timeoutSeconds}s timeout (npm took ${startMs} ms to start a script just before)`,
    );
  });
  const during = JSON.parse(snapshot);
  assert.equal(during.status, 'running', 'the running marker is on disk before the first step starts');
  assert.equal(typeof during.pid, 'number');
  assert.ok(!Number.isNaN(Date.parse(during.startedAt)));

  const status = JSON.parse(await fs.readFile(path.join(tmp, 'refresh-and-deploy-status.json'), 'utf8'));
  assert.equal(status.status, 'aborted');
  assert.equal(status.step, 'fetch-stars');
  assert.match(status.detail, new RegExp(`timed out after ${timeoutSeconds}s`));
  assert.equal(status.startedAt, during.startedAt);

  const hungPid = Number(await fs.readFile(path.join(tmp, 'hung-step.pid'), 'utf8'));
  let alive = isAlive(hungPid);
  for (let wait = 0; alive && wait < 20; wait += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    alive = isAlive(hungPid);
  }
  assert.equal(alive, false, 'the hung process itself is dead, not just the shell that started it');

  const log = await fs.readFile(path.join(tmp, 'refresh-and-deploy.log'), 'utf8');
  assert.match(log, new RegExp(`STOP {2}fetch-stars: no result after ${timeoutSeconds}s`));
  assert.match(log, /ABORT after \d+s at step "fetch-stars"/);
});

// A step whose shell exits while something it started keeps the output pipes
// open used to hold the runner until that process ended: the timeout's
// `taskkill /T` aimed at a shell that was already gone and killed nothing.
test('a step that leaves a process holding its output does not hold the run', { timeout: HANG_BOUND_MS }, async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-refresh-'));
  /** @type {import('node:child_process').ChildProcess | null} */
  let runnerChild = null;
  t.after(async () => {
    if (runnerChild && runnerChild.exitCode === null && runnerChild.pid) killTree(runnerChild.pid);
    const holder = Number(await fs.readFile(path.join(dir, '.tmp', 'holder.pid'), 'utf8').catch(() => '0'));
    if (holder && isAlive(holder)) killTree(holder);
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  });

  // fetch-stars backgrounds a holder on the inherited stdout and exits 0 at once.
  // It has to come from the shell: a child that node spawns sits in node's
  // kill-on-close job on Windows and dies with it. The next step fails on
  // purpose, which proves the run moved past the first.
  await fs.mkdir(path.join(dir, '.tmp'), { recursive: true });
  await fs.writeFile(
    path.join(dir, 'hold.cjs'),
    [
      "const fs = require('node:fs');",
      "fs.writeFileSync('.tmp/holder.pid', String(process.pid));",
      // Only an end of its own writes this; the test's kill afterwards doesn't.
      "process.on('exit', () => fs.writeFileSync('.tmp/holder.exited', String(Date.now())));",
      'setTimeout(() => {}, 60000);',
    ].join('\n'),
  );
  // The step's last command stamps the time, just before its shell exits, and
  // the next step stamps the moment it really starts running.
  await fs.writeFile(path.join(dir, 'done.cjs'), "require('fs').writeFileSync('.tmp/step-done.txt', String(Date.now()));");
  await fs.writeFile(path.join(dir, 'next.cjs'), "require('fs').writeFileSync('.tmp/next-started.txt', String(Date.now())); process.exit(3);");
  const background = process.platform === 'win32' ? 'start /b node hold.cjs & node done.cjs' : 'node hold.cjs & node done.cjs';
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'refresh-fixture',
      private: true,
      scripts: { 'fetch-stars': background, 'profile-feed:sync': 'node next.cjs', noop: 'node -e ""' },
    }),
  );
  // How long npm takes to get a script running here, right now, which the
  // next step pays before its first line.
  const startMs = npmStartMs(dir);

  const { child, exited } = runRunner(dir, {
    ...process.env,
    GITHUB_TOKEN: 'test-token',
    REFRESH_STEP_TIMEOUT_MS: '45000',
    REFRESH_OUTPUT_GRACE_MS: '2000',
    npm_config_update_notifier: 'false',
  });
  runnerChild = child;
  assert.equal(await exited, 1);
  // The holder lives a minute, and a runner that waited on it could only have
  // finished once it was gone. It notes its own end, so a reused pid can't
  // pass for it. Its pid can land a moment after the run on a slow start.
  const holder = await waitForPid(path.join(dir, '.tmp', 'holder.pid'));
  const holderEnded = await fs.access(path.join(dir, '.tmp', 'holder.exited')).then(
    () => true,
    () => false,
  );
  assert.ok(!holderEnded && isAlive(holder), 'the run waited for the holder to exit');

  const status = JSON.parse(await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy-status.json'), 'utf8'));
  assert.equal(status.step, 'profile-feed:sync', 'fetch-stars counted as passed and the run went on');
  assert.match(status.detail, /exit code 3/);

  const log = await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy.log'), 'utf8');
  assert.match(log, /WARN {2}fetch-stars: finished, but something it started still held its output after 2s/);
  assert.doesNotMatch(log, /STOP/);
  // It also moved on within the grace, give or take: counted from the step's
  // last command to the next step really running. The tenth drain review
  // timed this step's OK line and the twelfth its successor's START line, and
  // a runner can log either on time and still sit on the pipes before it
  // spawns anything. npm's own start, measured just before, is allowed for
  // three times over, so a slow machine can't fail it and a 30 s wait can't
  // pass it.
  const doneAt = Number(await fs.readFile(path.join(dir, '.tmp', 'step-done.txt'), 'utf8'));
  const nextAt = Number(await fs.readFile(path.join(dir, '.tmp', 'next-started.txt'), 'utf8').catch(() => 'NaN'));
  assert.ok(Number.isFinite(doneAt) && Number.isFinite(nextAt), 'the step and the next one both recorded their times');
  const budgetMs = 10_000 + 3 * startMs;
  assert.ok(
    nextAt - doneAt < budgetMs,
    `the next step started ${((nextAt - doneAt) / 1000).toFixed(1)} s after the step's last command; the grace is 2 s and npm takes ${(startMs / 1000).toFixed(1)} s here`,
  );
});

test('an unsigned featured release still deploys, then fails the run as drift', { timeout: HANG_BOUND_MS }, async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-refresh-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }));
  // The fake preflight stands in for data:summary:deploy under
  // PROVENANCE_REPORT_ONLY: it passes, and leaves the release in summary.json.
  await fs.writeFile(
    path.join(dir, 'preflight.cjs'),
    [
      "const fs = require('node:fs');",
      "if (process.env.PROVENANCE_REPORT_ONLY !== '1') process.exit(9);",
      "fs.mkdirSync('data-refresh-summary', { recursive: true });",
      "fs.writeFileSync('data-refresh-summary/summary.json', JSON.stringify({ releaseProvenancePolicy: { unsignedFeaturedDownloadable: [{ repo: 'Alpha', tag: 'v1.0.0' }] } }));",
      "fs.writeFileSync('deployed.marker', 'no');",
    ].join('\n'),
  );
  await writeCspFixture(dir);
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'refresh-fixture',
      private: true,
      scripts: {
        'fetch-stars': 'node -e ""',
        'profile-feed:sync': 'node -e ""',
        'deploy:preflight': 'node preflight.cjs',
        'deploy:vps': "node -e \"require('fs').writeFileSync('deployed.marker', 'yes')\"",
        'csp:reports': 'node csp.cjs',
      },
    }),
  );

  const { exited } = runRunner(dir, {
    ...process.env,
    GITHUB_TOKEN: 'test-token',
    PORTFOLIO_VPS_SSH: 'deploy@203.0.113.10',
    npm_config_update_notifier: 'false',
  });
  assert.equal(await exited, 1, 'the run reports failure');
  assert.equal(await fs.readFile(path.join(dir, 'deployed.marker'), 'utf8'), 'yes', 'but the deploy went ahead');

  const status = JSON.parse(await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy-status.json'), 'utf8'));
  assert.equal(status.status, 'drift');
  assert.equal(status.step, 'data:summary:deploy');
  assert.match(status.detail, /featured releases without a checksum or attestation: Alpha@v1\.0\.0/);
  const log = await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy.log'), 'utf8');
  assert.match(log, /PROVENANCE 1 featured release\(s\) without a checksum or attestation: Alpha@v1\.0\.0/);
});

test('a security.txt inside its 60-day window still deploys, and the status carries the warning', { timeout: HANG_BOUND_MS }, async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-refresh-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }));
  // The fake preflight stands in for the build: it leaves a dist/ whose
  // security.txt expires in 30 days.
  const expires = new Date(Date.now() + 30 * 86_400_000).toISOString();
  await fs.writeFile(
    path.join(dir, 'preflight.cjs'),
    [
      "const fs = require('node:fs');",
      "fs.mkdirSync('dist/.well-known', { recursive: true });",
      `fs.writeFileSync('dist/.well-known/security.txt', 'Contact: https://example.test/\\nExpires: ${expires}\\n');`,
    ].join('\n'),
  );
  await writeCspFixture(dir);
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'refresh-fixture',
      private: true,
      scripts: {
        'fetch-stars': 'node -e ""',
        'profile-feed:sync': 'node -e ""',
        'deploy:preflight': 'node preflight.cjs',
        'deploy:vps': "node -e \"require('fs').writeFileSync('deployed.marker', 'yes')\"",
        'csp:reports': 'node csp.cjs',
      },
    }),
  );

  const { exited } = runRunner(dir, {
    ...process.env,
    GITHUB_TOKEN: 'test-token',
    PORTFOLIO_VPS_SSH: 'deploy@203.0.113.10',
    npm_config_update_notifier: 'false',
  });
  assert.equal(await exited, 0, 'a warning does not fail the run');
  assert.equal(await fs.readFile(path.join(dir, 'deployed.marker'), 'utf8'), 'yes');

  const status = JSON.parse(await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy-status.json'), 'utf8'));
  assert.equal(status.status, 'deployed');
  assert.equal(status.warnings.length, 1);
  assert.match(status.warnings[0], new RegExp(`^security\\.txt expires ${expires.replace(/\./g, '\\.')}, 30 day\\(s\\) from now`));
  const log = await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy.log'), 'utf8');
  assert.match(log, /WARN {2}security\.txt expires /);
});

/** A whole fake run whose csp:reports step is `cspScript`. */
async function runWithCspStep(dir, cspScript) {
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'refresh-fixture',
      private: true,
      scripts: {
        'fetch-stars': 'node -e ""',
        'profile-feed:sync': 'node -e ""',
        'deploy:preflight': 'node -e ""',
        'deploy:vps': "node -e \"require('fs').writeFileSync('deployed.marker', 'yes')\"",
        'csp:reports': cspScript,
      },
    }),
  );
  const { exited } = runRunner(dir, {
    ...process.env,
    GITHUB_TOKEN: 'test-token',
    PORTFOLIO_VPS_SSH: 'deploy@203.0.113.10',
    npm_config_update_notifier: 'false',
  });
  const exitCode = await exited;
  const status = JSON.parse(await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy-status.json'), 'utf8'));
  const log = await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy.log'), 'utf8');
  return { exitCode, status, log };
}

test('a new first-party CSP violation still deploys, then fails the run as drift', { timeout: HANG_BOUND_MS }, async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-refresh-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }));
  await writeCspFixture(dir, ['style-src-elem inline']);

  const { exitCode, status, log } = await runWithCspStep(dir, 'node csp.cjs');
  assert.equal(exitCode, 1, 'the run reports failure');
  assert.equal(await fs.readFile(path.join(dir, 'deployed.marker'), 'utf8'), 'yes', 'but the deploy went ahead');
  assert.equal(await fs.readFile(path.join(dir, 'csp-args.txt'), 'utf8'), '--record', 'so the same violation fails only this run');
  assert.equal(status.status, 'drift');
  assert.equal(status.step, 'csp:reports');
  assert.equal(status.detail, 'new first-party CSP violations: style-src-elem inline');
  assert.match(log, /CSP {3}NEW first-party: style-src-elem inline/);
  assert.match(log, /CSP {3}1 new first-party violation\(s\): style-src-elem inline/);
});

test('a CSP report store the run cannot read leaves the deploy standing and says so', { timeout: HANG_BOUND_MS }, async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-refresh-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }));
  // Scripts, not `node -e`: npm appends --record, which node itself would
  // refuse as an option after -e.
  await fs.writeFile(path.join(dir, 'unreadable.cjs'), 'process.exit(1);');

  const { exitCode, status } = await runWithCspStep(dir, 'node unreadable.cjs');
  assert.equal(exitCode, 0);
  assert.equal(status.status, 'deployed');
  assert.equal(status.warnings.length, 1);
  assert.match(status.warnings[0], /^csp:reports could not read the CSP report store \(exit code 1\); see \.tmp[\\/]refresh-and-deploy-step-csp-reports\.log$/);

  // A step that exits 0 without its summary is as good as no read at all.
  const quietDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-refresh-'));
  t.after(() => fs.rm(quietDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }));
  await fs.writeFile(path.join(quietDir, 'quiet.cjs'), '');
  const quiet = await runWithCspStep(quietDir, 'node quiet.cjs');
  assert.equal(quiet.exitCode, 0);
  assert.deepEqual(quiet.status.warnings, [`csp:reports finished without a readable ${path.join('.tmp', 'csp-report-summary.json')}`]);
});

test('the nightly puts back what a killed visual-gate run left before it fetches anything', { timeout: HANG_BOUND_MS }, async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-refresh-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }));
  const data = path.join(dir, 'src', 'data');
  const fixtures = path.join(data, 'fixtures', 'generated');
  const backup = path.join(dir, '.tmp', 'visual-gate', 'live-data');
  await fs.mkdir(fixtures, { recursive: true });
  await fs.mkdir(backup, { recursive: true });
  // Killed mid-swap: every fixture in place, no ETags, the live copies waiting
  // in the backup the gate wrote before swapping.
  for (const name of SWAPPED_FILES) {
    await fs.writeFile(path.join(backup, name), `"live ${name}"\n`);
    if (REMOVED_FILES.includes(name)) continue;
    await fs.writeFile(path.join(fixtures, name), `"fixture ${name}"\n`);
    await fs.writeFile(path.join(data, name), `"fixture ${name}"\n`);
  }
  await fs.writeFile(path.join(backup, 'manifest.json'), JSON.stringify({ present: [...SWAPPED_FILES] }));
  // fetch-stars notes what it found, then stops the run.
  await fs.writeFile(
    path.join(dir, 'fetch.cjs'),
    [
      "const fs = require('node:fs');",
      "const read = (name) => (fs.existsSync(`src/data/${name}`) ? fs.readFileSync(`src/data/${name}`, 'utf8') : null);",
      "fs.writeFileSync('seen-by-fetch.json', JSON.stringify({ releases: read('_releases.json'), etags: read('_etags.json') }));",
      'process.exit(4);',
    ].join('\n'),
  );
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'refresh-fixture', private: true, scripts: { 'fetch-stars': 'node fetch.cjs' } }));

  const { exited } = runRunner(dir, { ...process.env, GITHUB_TOKEN: 'test-token', npm_config_update_notifier: 'false' });
  assert.equal(await exited, 1);
  const seen = JSON.parse(await fs.readFile(path.join(dir, 'seen-by-fetch.json'), 'utf8'));
  assert.equal(seen.releases, '"live _releases.json"\n', 'fetch-stars starts from the live releases, not the fixtures');
  assert.equal(seen.etags, '"live _etags.json"\n', 'and from the live ETags, which match those rows');
  await assert.rejects(fs.access(backup), 'the backup is used up');
  const log = await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy.log'), 'utf8');
  assert.match(log, new RegExp(`DATA  put back ${SWAPPED_FILES.length} live data file\\(s\\) that a killed visual-gate run left as fixtures`));
  assert.ok(log.indexOf('DATA  put back') < log.indexOf('START fetch-stars'), 'before the first fetch');
});

test('a failed deploy:vps does not claim the old deployment is still live', { timeout: HANG_BOUND_MS }, async (t) => {
  // deploy:vps checks the live site after it has shipped, so its failure can
  // leave either build serving (tenth drain review). A failure before it can't.
  const status = async (failing) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-refresh-'));
    t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }));
    await fs.writeFile(path.join(dir, 'fail.cjs'), 'process.exit(1);');
    const scripts = { 'fetch-stars': 'node -e ""', 'profile-feed:sync': 'node -e ""', 'deploy:preflight': 'node -e ""', 'deploy:vps': 'node -e ""' };
    scripts[failing] = 'node fail.cjs';
    await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'refresh-fixture', private: true, scripts }));
    const { exited } = runRunner(dir, { ...process.env, GITHUB_TOKEN: 'test-token', PORTFOLIO_VPS_SSH: 'deploy@203.0.113.10', npm_config_update_notifier: 'false' });
    assert.equal(await exited, 1);
    return JSON.parse(await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy-status.json'), 'utf8'));
  };
  const afterShip = await status('deploy:vps');
  assert.equal(afterShip.step, 'deploy:vps');
  assert.match(afterShip.detail, /the live site may be on either the previous build or this one/);
  assert.doesNotMatch(afterShip.detail, /previous deployment is still live/);
  const beforeShip = await status('deploy:preflight');
  assert.equal(beforeShip.step, 'deploy:preflight');
  assert.match(beforeShip.detail, /the previous deployment is still live/);
});

// npm test runs inside the preflight and inherits these flags. Tests strip the
// shared list, so a flag the runner sets has to be on it.
test('every report-only flag the nightly sets is one the tests know to strip', async () => {
  const source = await fs.readFile(runner, 'utf8');
  // Any mention counts, however the flag is set ('1', 'true', env.X = ...).
  const mentioned = [...new Set([...source.matchAll(/\b([A-Z][A-Z0-9_]*_REPORT_ONLY)\b/g)].map((match) => match[1]))].sort();
  assert.deepEqual(mentioned, [...REPORT_ONLY_FLAGS].sort());
});

test('the run is marked running before it asks gh for a token, and gh cannot hang it', async () => {
  const source = await fs.readFile(runner, 'utf8');
  // A gh waiting on a credential store used to hold the run before the running
  // record existed, so the status file kept the previous day's verdict.
  assert.ok(
    source.indexOf("writeStatus('running');") < source.indexOf('const githubToken = resolveGithubToken();'),
    'the running record comes first',
  );
  assert.match(source, /spawnSync\('gh', \['auth', 'token'\], \{ encoding: 'utf8', windowsHide: true, timeout: GH_TOKEN_TIMEOUT_MS \}\)/);
  assert.doesNotMatch(source, /spawnSync\('gh auth token'/, 'no shell between the runner and gh, so the timeout reaches gh itself');
});
