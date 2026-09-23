import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { REPORT_ONLY_FLAGS } from '../scripts/lib/report-only-flags.mjs';

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
    "require('fs').writeFileSync('.tmp/holder.pid', String(process.pid)); setTimeout(() => {}, 60000);",
  );
  const background = process.platform === 'win32' ? 'start /b node hold.cjs' : 'node hold.cjs &';
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'refresh-fixture',
      private: true,
      scripts: { 'fetch-stars': background, 'profile-feed:sync': 'node -e "process.exit(3)"' },
    }),
  );

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
  // finished once it was gone, so it has to be alive now however slow the run
  // was. Its pid can land a moment after the run on a slow start.
  const holder = await waitForPid(path.join(dir, '.tmp', 'holder.pid'));
  assert.ok(isAlive(holder), 'the run waited for the holder to exit');

  const status = JSON.parse(await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy-status.json'), 'utf8'));
  assert.equal(status.step, 'profile-feed:sync', 'fetch-stars counted as passed and the run went on');
  assert.match(status.detail, /exit code 3/);

  const log = await fs.readFile(path.join(dir, '.tmp', 'refresh-and-deploy.log'), 'utf8');
  assert.match(log, /WARN {2}fetch-stars: finished, but something it started still held its output after 2s/);
  assert.match(log, /OK {4}fetch-stars/);
  assert.doesNotMatch(log, /STOP/);
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
