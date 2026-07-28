#!/usr/bin/env node
// Deploy the built static portfolio to the Contabo VPS, behind the shared edge
// Caddy (see deploy/vps/). Replaces the GitHub Pages `publish:pages` flow once
// portfolio.getparkerai.com is cut over.
//
//   PORTFOLIO_VPS_SSH   required, e.g. deploy@161.97.118.191
//   PORTFOLIO_VPS_DIR   optional, default /home/deploy/sites/portfolio
//   SKIP_BUILD=1        optional, reuse an existing dist/
//   SKIP_SMOKE=1        optional, skip the post-deploy live smoke
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

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', ...options });
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
run('ssh', [ssh, `mkdir -p ${remoteDir}`]);

// 3. Ship the server config, then mirror dist/ (deletes removed files).
run('scp', [
  path.join(root, 'deploy', 'vps', 'docker-compose.yml'),
  path.join(root, 'deploy', 'vps', 'Caddyfile'),
  `${ssh}:${remoteDir}/`,
]);
run('rsync', ['-az', '--delete', `${distDir}/`, `${ssh}:${remoteDir}/dist/`]);

// 4. Recreate the container from the shipped compose file.
run('ssh', [ssh, `cd ${remoteDir} && docker compose up -d --remove-orphans`]);

// 5. Verify the deploy against the live origin unless skipped.
if (process.env.SKIP_SMOKE !== '1') {
  run('npm', ['run', 'smoke:live', '--', '--base-url', `${SITE_URL}/`, '--status-only', '--retries', '5']);
}

console.log(`deploy-vps: ${SITE_URL} updated.`);
