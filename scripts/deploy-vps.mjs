#!/usr/bin/env node
// Deploy the built static portfolio to the Contabo VPS, behind the shared edge
// Caddy (see deploy/vps/). Replaces the GitHub Pages `publish:pages` flow once
// portfolio.getparkerai.com is cut over.
//
//   PORTFOLIO_VPS_SSH          required, e.g. deploy@161.97.118.191
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

const root = process.cwd();
const ssh = process.env.PORTFOLIO_VPS_SSH;
const remoteDir = process.env.PORTFOLIO_VPS_DIR || '/home/deploy/sites/portfolio';

if (!ssh) {
  console.error('deploy-vps: set PORTFOLIO_VPS_SSH (e.g. deploy@161.97.118.191).');
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

// Keep in step with the image pin in deploy/vps/docker-compose.yml.
const PORTFOLIO_CADDY_VERSION = '2.11.4';

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

function decodeHtmlAttribute(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function buildCspHeaderValue(distDir) {
  const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const cspMeta = html
    .match(/<meta\b[^>]*>/gi)
    ?.find((tag) => /\bhttp-equiv\s*=\s*(["'])Content-Security-Policy\1/i.test(tag));
  const contentMatch = cspMeta?.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i);
  if (!contentMatch?.[2]) {
    throw new Error('deploy-vps: dist/index.html is missing the production CSP meta policy.');
  }
  const policy = decodeHtmlAttribute(contentMatch[2]).replace(/[\r\n]+/g, ' ').trim();
  if (!policy.includes('report-to csp-endpoint')) {
    throw new Error('deploy-vps: built CSP policy is missing report-to csp-endpoint.');
  }
  if (policy.includes('"') || policy.includes('`') || policy.includes('\n')) {
    throw new Error('deploy-vps: built CSP policy contains unsupported env-file characters.');
  }
  // frame-ancestors and report-uri are header-only directives: a <meta> policy
  // ignores both, which is why the meta source policy carries neither and the
  // edge has been relying on X-Frame-Options alone for clickjacking. The header
  // form can carry frame-ancestors, which supersedes X-Frame-Options in every
  // browser that supports CSP, so it is added here rather than to the meta tag.
  if (policy.includes('frame-ancestors')) {
    throw new Error('deploy-vps: the meta policy already declares frame-ancestors, which browsers ignore there.');
  }
  return `${policy}; frame-ancestors 'none'; report-uri /csp-report`;
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

// 2. Ensure the remote site dir exists.
runRemote(`mkdir -p ${remoteDir} ${remoteDir}/csp-reports`);

// 3. Ship the server config, reporter, CSP environment, then the site itself.
run('scp', [
  ...sshOptions,
  path.join(root, 'deploy', 'vps', 'docker-compose.yml'),
  path.join(root, 'deploy', 'vps', 'Caddyfile'),
  path.join(root, 'deploy', 'vps', 'csp-report-server.mjs'),
  cspEnvFile,
  `${ssh}:${remoteDir}/`,
]);
fs.rmSync(cspEnvFile, { force: true });

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
  ]);
}

console.log(`deploy-vps: ${SITE_URL} updated.`);
