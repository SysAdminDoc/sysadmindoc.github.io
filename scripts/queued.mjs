#!/usr/bin/env node
// Runs one npm script inside a slot of the machine's build queue, so a build
// here waits its turn instead of starting beside every other build on the PC.
// The queue is the PowerShell script that BUILD_QUEUE_SCRIPT names; it gives
// each slot its own cores at below-normal priority, and every process the
// script starts inherits both. A call made inside a slot (BUILD_QUEUE_TICKET
// is set) and a machine with no queue run the script directly.
//
//   npm run queued -- deploy:preflight
//   npm run queued -- visual:gate -- --update
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

// Words that mean the same thing to cmd.exe and to PowerShell, so the command
// line needs no quoting in either shell.
const PLAIN_WORD = /^[\w@%+=:,./-]+$/;

/** @param {string} name @param {NodeJS.ProcessEnv} env */
function readUserRegistryEnv(name, env) {
  const result = spawnSync('reg', ['query', 'HKCU\\Environment', '/v', name], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return '';
  const match = /^\s*\S+\s+REG_(?:EXPAND_)?SZ\s+(.+?)\s*$/m.exec(result.stdout);
  return match ? match[1].replace(/%([^%]+)%/g, (whole, key) => env[key] ?? whole) : '';
}

/**
 * The queue script, or '' when this machine has none. On Windows a shell that
 * started before the variable was set doesn't carry it, so the user's
 * registered environment is read too.
 * @param {NodeJS.ProcessEnv} env
 * @param {string} platform
 * @param {(name: string, env: NodeJS.ProcessEnv) => string} readUserEnv
 */
export function queueScriptPath(env, platform, readUserEnv = readUserRegistryEnv) {
  if (env.BUILD_QUEUE_SCRIPT) return env.BUILD_QUEUE_SCRIPT;
  return platform === 'win32' ? readUserEnv('BUILD_QUEUE_SCRIPT', env) : '';
}

/**
 * What to spawn for `npm run <script> [-- args]`. A queue named but not on
 * disk (a stale variable) counts as no queue, as the nightly registration does.
 * @param {{ script: string, args?: string[], env: NodeJS.ProcessEnv, platform: string, readUserEnv?: (name: string, env: NodeJS.ProcessEnv) => string, exists?: (file: string) => boolean }} options
 * @returns {{ queued: boolean, command: string, file: string, args: string[] }}
 */
export function planQueuedRun({ script, args = [], env, platform, readUserEnv, exists = fs.existsSync }) {
  for (const word of [script, ...args]) {
    if (!PLAIN_WORD.test(word ?? '')) throw new Error(`"${word}" needs quoting; give the queue plain words only`);
  }
  const command = ['npm', 'run', script, ...(args.length > 0 ? ['--', ...args] : [])].join(' ');
  const queue = env.BUILD_QUEUE_TICKET ? '' : queueScriptPath(env, platform, readUserEnv);
  if (!queue || !exists(queue)) return { queued: false, command, file: command, args: [] };
  return {
    queued: true,
    command,
    file: 'pwsh',
    args: ['-NoProfile', '-NonInteractive', '-File', queue, '-Label', `portfolio ${script}`, '-Run', command],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [script, ...rest] = process.argv.slice(2);
  if (!script) {
    console.error('Usage: npm run queued -- <npm script> [-- args]');
    process.exit(2);
  }
  let plan;
  try {
    plan = planQueuedRun({ script, args: rest[0] === '--' ? rest.slice(1) : rest, env: process.env, platform: process.platform });
  } catch (error) {
    console.error(`queued: ${error.message}`);
    process.exit(2);
  }
  if (!plan.queued && !process.env.BUILD_QUEUE_TICKET) {
    console.log(`queued: no build queue on this machine; running ${plan.command} directly`);
  }
  // npm is npm.cmd on Windows, which spawn refuses without a shell, and the
  // command is plain words, so the direct run goes through the shell whole.
  const result = plan.queued
    ? spawnSync(plan.file, plan.args, { stdio: 'inherit', windowsHide: true })
    : spawnSync(plan.file, { stdio: 'inherit', windowsHide: true, shell: true });
  if (result.error) console.error(`queued: ${result.error.message}`);
  process.exit(result.status ?? 1);
}
