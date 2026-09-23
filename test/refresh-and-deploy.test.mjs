import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const runner = path.join(root, 'scripts', 'refresh-and-deploy.mjs');

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

/** @param {string} cwd */
function runRunner(cwd, env) {
  const child = spawn(process.execPath, [runner], { cwd, env, stdio: 'ignore', windowsHide: true });
  const exited = new Promise((resolve) => child.on('close', (code) => resolve(code)));
  return { child, exited };
}

// A regression that stops killing the step's tree leaves the runner waiting on
// the orphan forever, so bound the test and take the whole tree down on the way out.
test('a hung step is killed at its timeout and recorded as aborted, after a running marker', { timeout: 45_000 }, async (t) => {
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

  // The fake fetch-stars snapshots the status file the runner wrote before it,
  // records its own pid, then hangs until something kills it.
  await fs.writeFile(
    path.join(dir, 'hang.cjs'),
    [
      "const fs = require('node:fs');",
      "fs.copyFileSync('.tmp/refresh-and-deploy-status.json', '.tmp/status-during-step.json');",
      "fs.writeFileSync('.tmp/hung-step.pid', String(process.pid));",
      'setInterval(() => {}, 1000);',
    ].join('\n'),
  );
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'refresh-fixture', private: true, scripts: { 'fetch-stars': 'node hang.cjs' } }),
  );

  const { child, exited } = runRunner(dir, {
    ...process.env,
    GITHUB_TOKEN: 'test-token',
    REFRESH_STEP_TIMEOUT_MS: '8000',
    npm_config_update_notifier: 'false',
  });
  runnerChild = child;
  const exitCode = await exited;
  assert.equal(exitCode, 1, 'a timed-out step fails the run');

  const tmp = path.join(dir, '.tmp');
  const during = JSON.parse(await fs.readFile(path.join(tmp, 'status-during-step.json'), 'utf8'));
  assert.equal(during.status, 'running', 'the running marker is on disk before the first step starts');
  assert.equal(typeof during.pid, 'number');
  assert.ok(!Number.isNaN(Date.parse(during.startedAt)));

  const status = JSON.parse(await fs.readFile(path.join(tmp, 'refresh-and-deploy-status.json'), 'utf8'));
  assert.equal(status.status, 'aborted');
  assert.equal(status.step, 'fetch-stars');
  assert.match(status.detail, /timed out after 8s/);
  assert.equal(status.startedAt, during.startedAt);

  const hungPid = Number(await fs.readFile(path.join(tmp, 'hung-step.pid'), 'utf8'));
  let alive = isAlive(hungPid);
  for (let wait = 0; alive && wait < 20; wait += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    alive = isAlive(hungPid);
  }
  assert.equal(alive, false, 'the hung process itself is dead, not just the shell that started it');

  const log = await fs.readFile(path.join(tmp, 'refresh-and-deploy.log'), 'utf8');
  assert.match(log, /STOP {2}fetch-stars: no result after 8s/);
  assert.match(log, /ABORT after \d+s at step "fetch-stars"/);
});
