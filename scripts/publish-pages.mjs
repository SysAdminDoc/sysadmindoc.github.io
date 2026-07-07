#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const DEFAULT_REPO = 'SysAdminDoc/sysadmindoc.github.io';
const DEFAULT_BASE_URL = 'https://sysadmindoc.github.io/';
const DEFAULT_PAGES_BRANCH = 'gh-pages';
const DEFAULT_WORKTREE = path.join(root, '.tmp', 'gh-pages-publish');

function hasFlag(name) {
  return process.argv.includes(name);
}

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
  return value;
}

function commandInvocation(command, args) {
  if (process.platform === 'win32' && command === 'npm') {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm', ...args],
    };
  }
  return { command, args };
}

function run(command, args, { cwd = root, env = {}, stdio = 'inherit' } = {}) {
  const invocation = commandInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    env: { ...process.env, ...env },
    stdio,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}.`);
  }
  return result;
}

function output(command, args, { cwd = root } = {}) {
  const result = run(command, args, { cwd, stdio: 'pipe' });
  return String(result.stdout ?? '').trim();
}

function optionalOutput(command, args, { cwd = root } = {}) {
  const invocation = commandInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    env: process.env,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0) return null;
  return String(result.stdout ?? '').trim();
}

function normalizeVersion(value) {
  const version = String(value ?? '').trim().replace(/^v/i, '');
  if (!version) throw new Error('Package version is empty.');
  return version;
}

function normalizeCommit(value, label) {
  const commit = String(value ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(commit)) throw new Error(`${label} must be a 7-40 character git commit.`);
  return commit;
}

function normalizeRepoSlug(value) {
  const slug = String(value ?? '').trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(slug)) {
    throw new Error(`GitHub repo must be owner/name, got "${value}".`);
  }
  return slug;
}

function requirePositiveCount(value, label) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 1) throw new Error(`${label} must be a positive integer.`);
  return count;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function assertCleanSourceTree() {
  const dirty = output('git', ['status', '--porcelain', '--untracked-files=no']);
  if (dirty) {
    throw new Error('Refusing to publish from a source tree with tracked changes. Commit first or pass --allow-dirty for a local recovery publish.');
  }
}

async function verifyGitHubPagesSource(repoSlug, pagesBranch) {
  if (hasFlag('--skip-pages-api')) {
    console.warn('Skipping GitHub Pages source verification.');
    return;
  }

  const ghSource = optionalOutput('gh', ['api', `repos/${repoSlug}/pages`, '--jq', '.source']);
  if (ghSource) {
    const source = JSON.parse(ghSource);
    requirePagesSource(repoSlug, source, pagesBranch);
    return;
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const response = await fetch(`https://api.github.com/repos/${repoSlug}/pages`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'sysadmindoc-pages-publisher',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await response.text();
  if (response.status !== 200) {
    throw new Error(`GitHub Pages API returned HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const pages = JSON.parse(body);
  requirePagesSource(repoSlug, pages.source, pagesBranch);
}

function requirePagesSource(repoSlug, source, pagesBranch) {
  const sourceBranch = source?.branch;
  const sourcePath = source?.path;
  if (sourceBranch !== pagesBranch || sourcePath !== '/') {
    throw new Error(`GitHub Pages source is ${sourceBranch}:${sourcePath}; expected ${pagesBranch}:/`);
  }
  console.log(`Verified GitHub Pages source: ${repoSlug} -> ${sourceBranch}:${sourcePath}`);
}

async function readDistContract(distDir) {
  const pkg = await readJson(path.join(root, 'package.json'));
  const projects = await readJson(path.join(distDir, 'projects.json'));
  const releases = await readJson(path.join(distDir, 'releases.json'));
  const feed = await readJson(path.join(distDir, 'feed.json'));
  const status = await readJson(path.join(distDir, 'status.json'));

  return {
    version: normalizeVersion(pkg.version),
    commit: normalizeCommit(status.build?.commit, 'dist/status.json build.commit'),
    projects: requirePositiveCount(projects.counts?.projects ?? projects.projects?.length, 'dist/projects.json project count'),
    releases: requirePositiveCount(releases.counts?.releases ?? releases.releases?.length, 'dist/releases.json release count'),
    feedItems: requirePositiveCount(feed.items?.length, 'dist/feed.json item count'),
  };
}

async function assertDistReady(distDir) {
  const indexPath = path.join(distDir, 'index.html');
  const statusPath = path.join(distDir, 'status.json');
  const pagefindPath = path.join(distDir, 'pagefind', 'pagefind.js');
  for (const filePath of [indexPath, statusPath, pagefindPath]) {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) throw new Error('not a file');
    } catch {
      throw new Error(`Built dist artifact is missing: ${path.relative(root, filePath)}`);
    }
  }
}

function ensureManagedWorktreePath(worktreeDir) {
  const resolved = path.resolve(worktreeDir);
  const managedRoot = path.resolve(root, '.tmp');
  const relative = path.relative(managedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Publish worktree must stay under ${managedRoot}; got ${resolved}`);
  }
  return resolved;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensurePagesWorktree(worktreeDir, pagesBranch) {
  await fs.mkdir(path.dirname(worktreeDir), { recursive: true });
  run('git', ['fetch', 'origin', pagesBranch]);

  if (await pathExists(path.join(worktreeDir, '.git'))) {
    run('git', ['-C', worktreeDir, 'checkout', pagesBranch]);
    const dirty = output('git', ['-C', worktreeDir, 'status', '--porcelain']);
    if (dirty) throw new Error(`${worktreeDir} has uncommitted changes; clean it before publishing.`);
    run('git', ['-C', worktreeDir, 'pull', '--ff-only', 'origin', pagesBranch]);
    return;
  }

  if (await pathExists(worktreeDir)) {
    await fs.rm(worktreeDir, { recursive: true, force: true });
  }

  const hasLocalBranch = spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${pagesBranch}`], { cwd: root }).status === 0;
  if (hasLocalBranch) {
    run('git', ['worktree', 'add', worktreeDir, pagesBranch]);
  } else {
    run('git', ['worktree', 'add', '-b', pagesBranch, worktreeDir, `origin/${pagesBranch}`]);
  }
}

async function copyDistToWorktree(distDir, worktreeDir) {
  const entries = await fs.readdir(worktreeDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    await fs.rm(path.join(worktreeDir, entry.name), { recursive: true, force: true });
  }
  await fs.cp(distDir, worktreeDir, { recursive: true });
  await fs.writeFile(
    path.join(worktreeDir, '.nojekyll'),
    'GitHub Pages must not run Jekyll; Astro _assets and Pagefind output need raw static serving.\n',
  );
}

async function commitAndPushWorktree(worktreeDir, pagesBranch, contract) {
  run('git', ['-C', worktreeDir, 'add', '-A']);
  const dirty = output('git', ['-C', worktreeDir, 'status', '--porcelain']);
  if (!dirty) {
    console.log(`No ${pagesBranch} changes to publish.`);
    return;
  }

  const gitIdentity = {
    GIT_AUTHOR_NAME: 'SysAdminDoc',
    GIT_AUTHOR_EMAIL: 'matt_parker@outlook.com',
    GIT_COMMITTER_NAME: 'SysAdminDoc',
    GIT_COMMITTER_EMAIL: 'matt_parker@outlook.com',
  };
  run('git', ['-C', worktreeDir, 'commit', '-m', `deploy: publish portfolio v${contract.version}`], { env: gitIdentity });
  run('git', ['-C', worktreeDir, 'push', 'origin', pagesBranch]);
}

async function runLiveSmoke(baseUrl, contract) {
  if (hasFlag('--skip-live-smoke')) {
    console.warn('Skipping live smoke verification.');
    return;
  }

  run(process.execPath, [
    path.join(root, 'scripts', 'smoke-live-site.mjs'),
    '--base-url',
    baseUrl,
    '--expected-version',
    contract.version,
    '--expected-commit',
    contract.commit,
    '--expected-projects',
    String(contract.projects),
    '--expected-releases',
    String(contract.releases),
    '--expected-feed-items',
    String(contract.feedItems),
  ]);
}

async function main() {
  const repoSlug = normalizeRepoSlug(option('--repo', DEFAULT_REPO));
  const pagesBranch = option('--branch', DEFAULT_PAGES_BRANCH);
  const distDir = path.resolve(option('--dist', path.join(root, 'dist')));
  const worktreeDir = ensureManagedWorktreePath(option('--worktree', DEFAULT_WORKTREE));
  const baseUrl = new URL(option('--base-url', DEFAULT_BASE_URL)).toString();
  const sourceCommit = normalizeCommit(output('git', ['rev-parse', 'HEAD']), 'source HEAD commit');

  if (!hasFlag('--allow-dirty')) await assertCleanSourceTree();
  await verifyGitHubPagesSource(repoSlug, pagesBranch);

  if (!hasFlag('--skip-build')) {
    run('npm', ['run', 'deploy:preflight'], {
      env: {
        SYSADMINDOC_BUILD_COMMIT: sourceCommit,
      },
    });
  }

  await assertDistReady(distDir);
  const contract = await readDistContract(distDir);
  if (contract.commit !== sourceCommit) {
    throw new Error(`dist/status.json build.commit is ${contract.commit}; expected current source commit ${sourceCommit}.`);
  }

  await ensurePagesWorktree(worktreeDir, pagesBranch);
  await copyDistToWorktree(distDir, worktreeDir);
  await commitAndPushWorktree(worktreeDir, pagesBranch, contract);
  await runLiveSmoke(baseUrl, contract);

  console.log(`Published v${contract.version} (${contract.commit}) to ${baseUrl}`);
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
