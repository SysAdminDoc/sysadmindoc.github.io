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

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

function runRemote(script) {
  run('ssh', [...sshOptions, ssh, script]);
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

// 2. Ensure the remote site dir exists.
runRemote(`mkdir -p ${remoteDir}`);

// 3. Ship the server config, then the site itself.
run('scp', [
  ...sshOptions,
  path.join(root, 'deploy', 'vps', 'docker-compose.yml'),
  path.join(root, 'deploy', 'vps', 'Caddyfile'),
  `${ssh}:${remoteDir}/`,
]);

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
runRemote(`cd ${remoteDir} && docker compose up -d --force-recreate --remove-orphans`);

// 5. Verify the deploy against the live origin unless skipped.
if (process.env.SKIP_SMOKE !== '1') {
  run('npm', ['run', 'smoke:live', '--', '--base-url', `${SITE_URL}/`, '--status-only', '--retries', '5']);
}

console.log(`deploy-vps: ${SITE_URL} updated.`);
