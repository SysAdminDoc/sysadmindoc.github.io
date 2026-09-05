#!/usr/bin/env node
// Unattended refresh + deploy for the portfolio.
//
// The site's generated data carries a 36h freshness contract
// (GENERATED_DATA_MAX_AGE_HOURS), but every refresh step was manual, so the
// deployed site quietly aged past its own contract whenever work paused. This
// runs the whole chain on a schedule:
//
//   fetch-stars -> profile-feed:sync -> deploy:preflight -> deploy:vps
//
// Failure policy: any failing step aborts before deploying, so the last good
// deployment stays live. Every run appends a one-line verdict to
// .tmp/refresh-and-deploy.log and exits non-zero on failure, which is what the
// scheduled task surfaces.
//
// Each step's full stdout and stderr also lands in
// .tmp/refresh-and-deploy-step-<label>.log (rewritten every run), and on failure
// the last lines of it are copied into the main log. The scheduled task runs
// with no console, so before this a failed nightly left "result 0x1" and the
// step name with nothing to say which of the ten preflight gates stopped it;
// the 2026-09-05 03:00 run failed after 25 minutes with exactly that.
//
//   --dry-run    run the refresh and preflight, skip the deploy
//   --skip-deploy  alias for --dry-run
//
// Credentials:
//   GITHUB_TOKEN         falls back to `gh auth token` when unset
//   PORTFOLIO_VPS_SSH    required to deploy (see scripts/deploy-vps.mjs)
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const tmpDir = path.join(root, '.tmp');
const logFile = path.join(tmpDir, 'refresh-and-deploy.log');
const statusFile = path.join(tmpDir, 'refresh-and-deploy-status.json');
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--skip-deploy');
const startedAt = new Date();
const FAIL_TAIL_LINES = 40;

function log(line) {
  const stamped = `${new Date().toISOString()} ${line}`;
  console.log(stamped);
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, `${stamped}\n`);
  } catch {
    /* logging must never mask the real failure */
  }
}

function resolveGithubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  // The build box authenticates the GitHub CLI rather than exporting a token,
  // and fetch-stars needs one for token-backed README telemetry (the deploy
  // gate requires it).
  const result = spawnSync('gh auth token', { encoding: 'utf8', shell: true, windowsHide: true });
  const token = result.status === 0 ? result.stdout.trim() : '';
  return token || '';
}

const githubToken = resolveGithubToken();
// Unattended runs report catalog drift instead of aborting on it. A newly
// published public repo used to freeze the whole deploy, so the live site kept
// serving data that aged past its own 36h contract while waiting on a curation
// decision. The build now records the gap in _catalog-drift.json and /status/
// reports an incomplete catalog, so the claim stays honest while the data ships.
// This run still exits non-zero at the end, which is what the scheduled task and
// the daily health check surface.
const env = {
  ...process.env,
  ...(githubToken ? { GITHUB_TOKEN: githubToken } : {}),
  CATALOG_AUDIT_REPORT_ONLY: '1',
};

function stepLogPath(label) {
  return path.join(tmpDir, `refresh-and-deploy-step-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.log`);
}

// Runs one npm step, streaming its output to the console and to the step's own
// log file while keeping the last FAIL_TAIL_LINES lines in memory. A non-zero
// exit writes that tail into the main log so the failure reads back without a
// rerun, then rejects with the step label (which the caller records as the
// failed step).
function step(label, command, args) {
  return new Promise((resolve, reject) => {
    log(`START ${label}`);
    const stepLog = stepLogPath(label);
    let out = null;
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      out = fs.createWriteStream(stepLog, { flags: 'w' });
    } catch {
      out = null;
    }

    const tail = [];
    let pending = '';
    const capture = (chunk, sink) => {
      sink.write(chunk);
      if (out) out.write(chunk);
      pending += chunk.toString('utf8');
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        tail.push(line);
        if (tail.length > FAIL_TAIL_LINES) tail.shift();
      }
    };

    let settled = false;
    const finish = (code, signal, spawnError) => {
      if (settled) return;
      settled = true;
      if (pending.trim()) tail.push(pending);
      if (out) out.end();
      if (code === 0 && !spawnError) {
        log(`OK    ${label}`);
        resolve();
        return;
      }
      const why = spawnError ? spawnError.message : signal ? `killed by ${signal}` : `exit code ${code}`;
      log(`FAIL  ${label}: ${why}; full output in ${path.relative(root, stepLog)}`);
      for (const line of tail.slice(-FAIL_TAIL_LINES)) log(`  | ${line}`);
      reject(new Error(label));
    };

    // One command string through the shell: npm is npm.cmd on Windows, which
    // spawn refuses without a shell, and passing an args array alongside
    // shell:true trips DEP0190. Every argument here is a literal from this file.
    const child = spawn([command, ...args].join(' '), {
      env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    child.stdout.on('data', (chunk) => capture(chunk, process.stdout));
    child.stderr.on('data', (chunk) => capture(chunk, process.stderr));
    child.on('error', (error) => finish(null, null, error));
    child.on('close', (code, signal) => finish(code, signal, null));
  });
}

// The scheduled task only exposes an exit code, so a failed nightly reads as
// "result 0x1" with no clue which gate stopped it. This records the step by
// name for the daily health check to quote, and is rewritten on every terminal
// path so a stale failure cannot outlive the deploy that fixed it.
function writeStatus(status, { failedStep = null, detail = null } = {}) {
  const payload = {
    schema: 'sysadmindoc.refresh-deploy-status.v1',
    status,
    step: failedStep,
    detail,
    at: new Date().toISOString(),
    elapsedSeconds: Number(((Date.now() - startedAt.getTime()) / 1000).toFixed(0)),
    dryRun,
  };
  try {
    fs.mkdirSync(path.dirname(statusFile), { recursive: true });
    fs.writeFileSync(statusFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  } catch {
    /* status reporting must never mask the real failure */
  }
}

function readCatalogDrift() {
  try {
    const drift = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', '_catalog-drift.json'), 'utf8'));
    return Array.isArray(drift.uncataloged) ? drift.uncataloged : [];
  } catch {
    return [];
  }
}

function readFreshness() {
  try {
    const stats = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', '_stats.json'), 'utf8'));
    if (!stats.fetchedAt) return 'unknown';
    const hours = (Date.now() - new Date(stats.fetchedAt).getTime()) / 3_600_000;
    return `${hours.toFixed(2)}h old (${stats.fetchedAt})`;
  } catch {
    return 'unreadable';
  }
}

async function main() {
  try {
    log(`RUN   refresh-and-deploy${dryRun ? ' (dry run)' : ''}`);
    if (!githubToken) {
      // Not fatal on its own: the preflight's own gate decides. Surfacing it here
      // makes the eventual preflight failure self-explanatory in the log.
      log('WARN  no GITHUB_TOKEN and `gh auth token` returned nothing; README telemetry will not be token-backed');
    }

    await step('fetch-stars', 'npm', ['run', 'fetch-stars']);
    await step('profile-feed:sync', 'npm', ['run', 'profile-feed:sync']);
    log(`DATA  generated caches are now ${readFreshness()}`);

    // deploy:preflight is the gate: strict generated-data freshness, catalog and
    // live-app audits, signature verification, dependency audit, tests, check,
    // and a full build. Nothing ships unless it passes.
    await step('deploy:preflight', 'npm', ['run', 'deploy:preflight']);

    if (dryRun) {
      const uncataloged = readCatalogDrift();
      log('DONE  dry run complete; preflight passed and nothing was deployed');
      if (uncataloged.length > 0) {
        log(`DRIFT ${uncataloged.length} uncataloged public repo(s): ${uncataloged.join(', ')}; /status/ reports an incomplete catalog`);
        writeStatus('drift', { failedStep: 'catalog:audit', detail: `uncataloged: ${uncataloged.join(', ')}` });
        process.exit(1);
      }
      writeStatus('dry-run');
      process.exit(0);
    }

    if (!process.env.PORTFOLIO_VPS_SSH) {
      log('FAIL  PORTFOLIO_VPS_SSH is not set; refusing to deploy');
      writeStatus('aborted', { failedStep: 'deploy:vps', detail: 'PORTFOLIO_VPS_SSH is not set' });
      process.exit(1);
    }

    // The build already ran inside preflight; reuse it rather than rebuilding.
    await step('deploy:vps', 'npm', ['run', 'deploy:vps']);

    const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(0);
    const uncataloged = readCatalogDrift();
    if (uncataloged.length > 0) {
      // The site is fresh and honest about the gap, but somebody still has to
      // catalog these, so the run reports failure rather than passing quietly.
      log(`DONE  deployed in ${elapsed}s`);
      log(`DRIFT ${uncataloged.length} uncataloged public repo(s): ${uncataloged.join(', ')}; /status/ reports an incomplete catalog`);
      writeStatus('drift', { failedStep: 'catalog:audit', detail: `uncataloged: ${uncataloged.join(', ')}` });
      process.exit(1);
    }
    log(`DONE  deployed in ${elapsed}s`);
    writeStatus('deployed');
    process.exit(0);
  } catch (error) {
    const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(0);
    const failedStep = error.message;
    const stepLog = stepLogPath(failedStep);
    const where = fs.existsSync(stepLog) ? `; see ${path.relative(root, stepLog)}` : '';
    log(`ABORT after ${elapsed}s at step "${failedStep}"; the previous deployment is still live${where}`);
    writeStatus('aborted', { failedStep, detail: `the previous deployment is still live${where}` });
    process.exit(1);
  }
}

main();
