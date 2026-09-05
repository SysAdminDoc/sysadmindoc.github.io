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
//   --dry-run    run the refresh and preflight, skip the deploy
//   --skip-deploy  alias for --dry-run
//
// Credentials:
//   GITHUB_TOKEN         falls back to `gh auth token` when unset
//   PORTFOLIO_VPS_SSH    required to deploy (see scripts/deploy-vps.mjs)
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const logFile = path.join(root, '.tmp', 'refresh-and-deploy.log');
const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--skip-deploy');
const startedAt = new Date();

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
  const result = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8', shell: process.platform === 'win32' });
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

function step(label, command, args) {
  log(`START ${label}`);
  try {
    execFileSync(command, args, { stdio: 'inherit', env, shell: process.platform === 'win32' });
    log(`OK    ${label}`);
  } catch (error) {
    log(`FAIL  ${label}: ${error.message}`);
    throw new Error(label);
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

try {
  log(`RUN   refresh-and-deploy${dryRun ? ' (dry run)' : ''}`);
  if (!githubToken) {
    // Not fatal on its own: the preflight's own gate decides. Surfacing it here
    // makes the eventual preflight failure self-explanatory in the log.
    log('WARN  no GITHUB_TOKEN and `gh auth token` returned nothing; README telemetry will not be token-backed');
  }

  step('fetch-stars', 'npm', ['run', 'fetch-stars']);
  step('profile-feed:sync', 'npm', ['run', 'profile-feed:sync']);
  log(`DATA  generated caches are now ${readFreshness()}`);

  // deploy:preflight is the gate: strict generated-data freshness, catalog and
  // live-app audits, signature verification, dependency audit, tests, check,
  // and a full build. Nothing ships unless it passes.
  step('deploy:preflight', 'npm', ['run', 'deploy:preflight']);

  if (dryRun) {
    const uncataloged = readCatalogDrift();
    log('DONE  dry run complete; preflight passed and nothing was deployed');
    if (uncataloged.length > 0) {
      log(`DRIFT ${uncataloged.length} uncataloged public repo(s): ${uncataloged.join(', ')}; /status/ reports an incomplete catalog`);
      process.exit(1);
    }
    process.exit(0);
  }

  if (!process.env.PORTFOLIO_VPS_SSH) {
    log('FAIL  PORTFOLIO_VPS_SSH is not set; refusing to deploy');
    process.exit(1);
  }

  // The build already ran inside preflight; reuse it rather than rebuilding.
  step('deploy:vps', 'npm', ['run', 'deploy:vps']);

  const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(0);
  const uncataloged = readCatalogDrift();
  if (uncataloged.length > 0) {
    // The site is fresh and honest about the gap, but somebody still has to
    // catalog these, so the run reports failure rather than passing quietly.
    log(`DONE  deployed in ${elapsed}s`);
    log(`DRIFT ${uncataloged.length} uncataloged public repo(s): ${uncataloged.join(', ')}; /status/ reports an incomplete catalog`);
    process.exit(1);
  }
  log(`DONE  deployed in ${elapsed}s`);
  process.exit(0);
} catch (error) {
  const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(0);
  log(`ABORT after ${elapsed}s at step "${error.message}"; the previous deployment is still live`);
  process.exit(1);
}
