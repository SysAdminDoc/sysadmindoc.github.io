import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { planQueuedRun, queueScriptPath } from '../scripts/queued.mjs';

const QUEUE = 'C:\\tools\\build-queue.ps1';
const noRegistry = () => '';

test('a heavy script takes a queue slot when the machine has a queue', () => {
  const plan = planQueuedRun({ script: 'deploy:preflight', env: { BUILD_QUEUE_SCRIPT: QUEUE }, platform: 'win32', readUserEnv: noRegistry });
  assert.equal(plan.queued, true);
  assert.equal(plan.file, 'pwsh');
  assert.deepEqual(plan.args, ['-NoProfile', '-NonInteractive', '-File', QUEUE, '-Label', 'portfolio deploy:preflight', '-Run', 'npm run deploy:preflight']);
});

test('a call already inside a slot runs directly instead of queueing behind its parent', () => {
  const plan = planQueuedRun({
    script: 'build',
    env: { BUILD_QUEUE_SCRIPT: QUEUE, BUILD_QUEUE_TICKET: 'C:\\q\\1-0-42.json' },
    platform: 'win32',
    readUserEnv: () => QUEUE,
  });
  assert.equal(plan.queued, false);
  assert.equal(plan.file, 'npm run build');
});

test('with no queue the script runs as it always has', () => {
  assert.equal(planQueuedRun({ script: 'build', env: {}, platform: 'linux' }).file, 'npm run build');
  assert.equal(planQueuedRun({ script: 'build', env: {}, platform: 'win32', readUserEnv: noRegistry }).queued, false);
});

test("a shell that predates the variable still finds the queue in the user's registered environment", () => {
  let asked = '';
  const fromRegistry = (name) => {
    asked = name;
    return QUEUE;
  };
  assert.equal(queueScriptPath({}, 'win32', fromRegistry), QUEUE);
  assert.equal(asked, 'BUILD_QUEUE_SCRIPT');
  // The registry is a Windows idea; elsewhere the environment is the only source.
  assert.equal(queueScriptPath({}, 'linux', fromRegistry), '');
  assert.equal(queueScriptPath({ BUILD_QUEUE_SCRIPT: '/opt/queue.ps1' }, 'win32', fromRegistry), '/opt/queue.ps1');
});

test('arguments pass through after --, and a word that needs quoting is refused', () => {
  const plan = planQueuedRun({ script: 'visual:gate', args: ['--update'], env: { BUILD_QUEUE_SCRIPT: QUEUE }, platform: 'win32', readUserEnv: noRegistry });
  assert.equal(plan.command, 'npm run visual:gate -- --update');
  assert.equal(plan.args.at(-1), 'npm run visual:gate -- --update');
  // cmd.exe and PowerShell quote differently, so nothing that needs quoting gets through.
  for (const word of ['two words', 'a;b', 'a&b', '$(x)', "it's", '']) {
    assert.throws(() => planQueuedRun({ script: 'build', args: [word], env: {}, platform: 'linux' }), /needs quoting/);
  }
});

test('the queue runner is reachable as an npm script', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts.queued, 'node scripts/queued.mjs');
});
