#!/usr/bin/env node
// Deploy the built static portfolio to the Contabo VPS, behind the shared edge
// Caddy (see deploy/vps/). This is the only deploy path: the gh-pages branch is
// a three-file redirect stub to portfolio.getparkerai.com, and the publisher
// that could overwrite it was removed on 2026-09-23.
//
//   PORTFOLIO_VPS_SSH          required, e.g. deploy@203.0.113.10
//   PORTFOLIO_VPS_DIR          optional, default /home/deploy/sites/portfolio
//   PORTFOLIO_VPS_SSH_KEY      optional, identity file for non-interactive runs
//   PORTFOLIO_VPS_KNOWN_HOSTS  optional, pinned known_hosts for the same
//   SKIP_BUILD=1               optional, reuse an existing dist/
//   SKIP_SMOKE=1               optional, skip the post-deploy live smoke
//
// The edge Caddy route block (deploy/vps/caddy-block.txt) is added once, out of
// band, through the Contabo-VPS-Ops repo (its Caddyfile is the source of truth);
// this script only ships the site and (re)starts its container.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { SITE_URL } from '../site.config.mjs';
import { buildCspHeaderValue } from './lib/csp-header.mjs';
import { projectRedirectsCaddy } from './lib/project-redirects.mjs';
import { edgeLogExclusionProblem } from './lib/edge-log-check.mjs';

const root = process.cwd();
const ssh = process.env.PORTFOLIO_VPS_SSH;
const remoteDir = process.env.PORTFOLIO_VPS_DIR || '/home/deploy/sites/portfolio';

if (!ssh) {
  console.error('deploy-vps: set PORTFOLIO_VPS_SSH (e.g. deploy@203.0.113.10).');
  process.exit(1);
}

// Unattended runs need an explicit identity and a pinned host key; an
// interactive session can rely on the agent and the user's known_hosts.
const sshOptions = [
  '-o',
  'BatchMode=yes',
  '-o',
  'ConnectTimeout=15',
  '-o',
  'ServerAliveInterval=15',
];
if (process.env.PORTFOLIO_VPS_SSH_KEY) {
  sshOptions.push('-i', process.env.PORTFOLIO_VPS_SSH_KEY, '-o', 'IdentitiesOnly=yes');
}
if (process.env.PORTFOLIO_VPS_KNOWN_HOSTS) {
  sshOptions.push('-o', `UserKnownHostsFile=${process.env.PORTFOLIO_VPS_KNOWN_HOSTS}`);
}

// The smoke compares the live endpoints against these. Reading them from the
// built tree rather than hardcoding keeps the deploy honest as the catalog grows.
function readArtifactCounts() {
  const readJson = (name) => {
    const file = path.join(root, 'dist', name);
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      throw new Error(`deploy-vps: cannot read dist/${name} for the live smoke: ${error.message}`);
    }
  };
  const projects = readJson('projects.json').projects;
  const releases = readJson('releases.json').releases;
  const feedItems = readJson('feed.json').items;
  for (const [name, value] of [['projects', projects], ['releases', releases], ['feed items', feedItems]]) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`deploy-vps: built ${name} artifact is empty or malformed; refusing to smoke against it.`);
    }
  }
  return { projects: projects.length, releases: releases.length, feedItems: feedItems.length };
}

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  // npm is npm.cmd on Windows; execFileSync cannot spawn .cmd files directly
  // (ENOENT, and Node >=18.20 refuses .cmd without a shell), so route through
  // cmd.exe. Args here are fixed strings, never user input.
  if (process.platform === 'win32' && command === 'npm') {
    execFileSync('cmd.exe', ['/d', '/s', '/c', ['npm', ...args].join(' ')], { stdio: 'inherit', ...options });
    return;
  }
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

function runRemote(script) {
  run('ssh', [...sshOptions, ssh, script]);
}

function captureRemote(script) {
  return execFileSync('ssh', [...sshOptions, ssh, script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    windowsHide: true,
  }).trim();
}

// Keep in step with the image pins in deploy/vps/docker-compose.yml.
const PORTFOLIO_CADDY_VERSION = '2.11.4';
const PORTFOLIO_NTFY_VERSION = '2.28.0';

function verifyNtfyVersion() {
  const output = captureRemote('docker exec portfolio-ntfy ntfy --version 2>/dev/null | head -1');
  const running = output.match(/(\d+\.\d+\.\d+)/)?.[1];
  if (running !== PORTFOLIO_NTFY_VERSION) {
    throw new Error(
      `deploy-vps: portfolio-ntfy reports "${output || '(empty)'}" but the compose file pins ${PORTFOLIO_NTFY_VERSION}.`,
    );
  }
  console.log(`deploy-vps: portfolio-ntfy is running the pinned ntfy ${running}.`);
}

function verifyCaddyVersion() {
  const output = captureRemote('docker exec portfolio-app caddy version 2>/dev/null | head -1');
  const running = output.match(/v?(\d+\.\d+\.\d+)/)?.[1];
  if (!running) {
    throw new Error(`deploy-vps: could not read the running Caddy version (got "${output || '(empty)'}").`);
  }
  if (running !== PORTFOLIO_CADDY_VERSION) {
    throw new Error(
      `deploy-vps: portfolio-app is running Caddy ${running} but the compose file pins ${PORTFOLIO_CADDY_VERSION}. ` +
        'The image on the box drifted from the pin; check `docker compose pull` output.',
    );
  }
  console.log(`deploy-vps: portfolio-app is running the pinned Caddy ${running}.`);
}

// /privacy/ says portfolio requests stay out of the edge container's own log.
// That rests on the shared edge Caddyfile (Contabo-VPS-Ops), so each deploy
// reads the running default logger's exclusions back through the admin API,
// which listens on IPv4 loopback only.
function verifyEdgeLogging() {
  const output = captureRemote('docker exec caddy wget -qO- http://127.0.0.1:2019/config/logging/logs/default/exclude 2>&1 || true');
  const problem = edgeLogExclusionProblem(output);
  if (problem) throw new Error(`deploy-vps: ${problem}.`);
  console.log('deploy-vps: the edge keeps portfolio requests out of its container log.');
}

function writeProjectRedirects(distDir) {
  const file = path.join(root, '.tmp', 'project-redirects.caddy');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const projects = JSON.parse(fs.readFileSync(path.join(distDir, 'projects.json'), 'utf8'));
  const text = projectRedirectsCaddy(projects);
  if (!text.includes('redir /projects/')) {
    throw new Error('deploy-vps: dist/projects.json produced no project redirects.');
  }
  fs.writeFileSync(file, text, 'utf8');
  return file;
}

function writeComposeEnvFile(distDir) {
  const envFile = path.join(root, '.tmp', 'csp.env');
  fs.mkdirSync(path.dirname(envFile), { recursive: true });
  const policy = buildCspHeaderValue(distDir);
  fs.writeFileSync(envFile, `CSP_POLICY="${policy}"\n`, 'utf8');
  return envFile;
}

// 1. Build the static site unless reusing an existing dist/.
if (process.env.SKIP_BUILD !== '1') {
  run('npm', ['run', 'build']);
}
const distDir = path.join(root, 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('deploy-vps: dist/index.html not found — build first or unset SKIP_BUILD.');
  process.exit(1);
}
const cspEnvFile = writeComposeEnvFile(distDir);
const projectRedirectsFile = writeProjectRedirects(distDir);

// 2. Ensure the remote site dir exists.
runRemote(`mkdir -p ${remoteDir} ${remoteDir}/csp-reports ${remoteDir}/contact-data ${remoteDir}/ntfy-cache ${remoteDir}/ntfy-data ${remoteDir}/bin`);

// 2b. The lead-notification secrets live only on the server. The script that
// creates them ships first, so a new server has it to run. Stop here with the
// fix named, rather than letting compose fail halfway through a recreate.
run('scp', [...sshOptions, path.join(root, 'deploy', 'vps', 'provision-notify-secrets.sh'), `${ssh}:${remoteDir}/`]);
runRemote(
  `cd ${remoteDir} && { test -s ntfy-auth.env && test -s contact-secrets.env; } || ` +
    `{ echo "deploy-vps: ntfy-auth.env or contact-secrets.env is missing in ${remoteDir}; run 'sh provision-notify-secrets.sh' there first (see README, Deploy)." >&2; exit 1; }`,
);

// 3. Ship the server config, reporter, CSP environment, then the site itself.
run('scp', [
  ...sshOptions,
  path.join(root, 'deploy', 'vps', 'docker-compose.yml'),
  path.join(root, 'deploy', 'vps', 'Caddyfile'),
  path.join(root, 'deploy', 'vps', 'csp-report-server.mjs'),
  path.join(root, 'deploy', 'vps', 'contact-handler.mjs'),
  cspEnvFile,
  projectRedirectsFile,
  `${ssh}:${remoteDir}/`,
]);
// The daily traffic-report cron (15 4 * * *) runs bin/analytics-report.sh, and
// its retention behaviour is part of what /privacy/ states, so the copy in the
// repo is the one that runs.
run('scp', [...sshOptions, path.join(root, 'deploy', 'vps', 'analytics-report.sh'), `${ssh}:${remoteDir}/bin/analytics-report.sh`]);
fs.rmSync(cspEnvFile, { force: true });
fs.rmSync(projectRedirectsFile, { force: true });

// tar over ssh rather than rsync: rsync is not present on the Windows build
// box, and this needs no extra remote tooling. The tree is unpacked into a
// staging directory and swapped in, so a transfer that dies partway leaves the
// live dist/ untouched instead of serving a half-written site. The previous
// tree stays behind as dist.old for a one-command rollback.
const tarball = path.join(root, '.tmp', 'dist-deploy.tar.gz');
fs.mkdirSync(path.dirname(tarball), { recursive: true });
fs.rmSync(tarball, { force: true });
run('tar', ['-czf', tarball, '-C', distDir, '.']);
run('scp', [...sshOptions, tarball, `${ssh}:${remoteDir}/dist-deploy.tar.gz`]);
runRemote(
  [
    `cd ${remoteDir}`,
    'rm -rf dist.new',
    'mkdir -p dist.new',
    'tar -xzf dist-deploy.tar.gz -C dist.new',
    'test -f dist.new/index.html',
    'rm -rf dist.old',
    'if [ -d dist ]; then mv dist dist.old; fi',
    'mv dist.new dist',
    'rm -f dist-deploy.tar.gz',
  ].join(' && '),
);
fs.rmSync(tarball, { force: true });

// 4. Recreate the container from the shipped compose file. The bind mount
// resolves at container start, so swapping the dist/ directory above requires a
// recreate for the container to serve the new tree rather than the moved one.
//
// `pull` is separate and deliberate: `up --force-recreate` reuses the image
// already on the box, so before the compose file was pinned to an exact patch a
// "2.11-alpine" container could sit on an old patch indefinitely while every
// deploy reported success.
runRemote(`cd ${remoteDir} && docker compose --env-file csp.env pull --quiet`);
runRemote(`cd ${remoteDir} && docker compose --env-file csp.env up -d --force-recreate --remove-orphans`);

// 4b. Assert the running server is the pinned version. Caddy does not disclose
// its version over HTTP (and should not), so the live smoke cannot see this;
// checking it here is the only place a drifted image becomes visible instead of
// assumed.
verifyCaddyVersion();
verifyNtfyVersion();
verifyEdgeLogging();

// 5. Verify the deploy against the live origin unless skipped.
//
// This used to pass --status-only, which returns after comparing the live
// version and commit. Every security-header assertion (HSTS, X-Frame-Options,
// Permissions-Policy, COOP, Referrer-Policy, X-Content-Type-Options), the
// Reporting-Endpoints and report-to/report-uri checks, the synthetic CSP report
// POST, and the artifact count checks all live past that early return, so an
// unattended deploy verified none of them. The counts come from the tree that
// was just shipped, which is the only artifact that can define them.
if (process.env.SKIP_SMOKE !== '1') {
  const counts = readArtifactCounts();
  run('npm', [
    'run',
    'smoke:live',
    '--',
    '--base-url',
    `${SITE_URL}/`,
    '--expected-projects',
    String(counts.projects),
    '--expected-releases',
    String(counts.releases),
    '--expected-feed-items',
    String(counts.feedItems),
    '--retries',
    '5',
    '--require-lead-delivery',
  ]);
}

console.log(`deploy-vps: ${SITE_URL} updated.`);
