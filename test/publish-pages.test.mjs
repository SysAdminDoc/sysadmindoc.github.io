import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const publisherPath = path.join(root, 'scripts', 'publish-pages.mjs');

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function writeJson(filePath, value) {
  fsSync.writeFileSync(filePath, `${JSON.stringify(value)}\n`);
}

test('GitHub Pages publisher is wired to the local deploy gate and live smoke', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const publisher = await fs.readFile(path.join(root, 'scripts', 'publish-pages.mjs'), 'utf8');
  const smoke = await fs.readFile(path.join(root, 'scripts', 'smoke-live-site.mjs'), 'utf8');
  const nojekyll = await fs.readFile(path.join(root, 'public', '.nojekyll'), 'utf8');

  assert.equal(pkg.scripts['publish:pages'], 'node scripts/publish-pages.mjs');
  assert.match(publisher, /const DEFAULT_PAGES_BRANCH = 'gh-pages'/);
  assert.match(publisher, /verifyGitHubPagesSource/);
  assert.match(publisher, /optionalOutput\('gh', \['api', `repos\/\$\{repoSlug\}\/pages`, '--jq', '\.source'\]\)/);
  assert.match(publisher, /sourceBranch !== pagesBranch \|\| sourcePath !== '\/'/);
  assert.match(publisher, /run\('npm', \['run', 'deploy:preflight'\]/);
  assert.match(publisher, /copyDistToWorktree/);
  assert.match(publisher, /\.nojekyll/);
  assert.match(publisher, /smoke-live-site\.mjs/);
  assert.match(publisher, /--expected-commit/);
  assert.match(publisher, /push', 'origin', pagesBranch/);
  assert.match(smoke, /fetchText\(baseUrl, '\/', 'text\/html,\*\/\*'\)/);
  assert.match(smoke, /findFirstAssetPath\(homepage\.body/);
  assert.match(smoke, /Astro CSS asset/);
  assert.match(smoke, /_assets/);
  assert.match(smoke, /\/pagefind\/pagefind\.js/);
  assert.match(nojekyll, /Astro|Pagefind|Jekyll/i);
});

test('GitHub Pages publisher repairs a missing registered worktree and fast-forwards its branch', async () => {
  const tmp = fsSync.mkdtempSync(path.join(os.tmpdir(), 'pages-worktree-recovery-'));
  const remote = path.join(tmp, 'remote.git');
  const seed = path.join(tmp, 'seed');
  const repo = path.join(tmp, 'repo');

  try {
    git(tmp, ['init', '--bare', remote]);
    git(tmp, ['init', '-b', 'main', seed]);
    fsSync.writeFileSync(path.join(seed, 'source.txt'), 'main\n');
    git(seed, ['add', 'source.txt']);
    git(seed, ['commit', '-m', 'main']);
    git(seed, ['remote', 'add', 'origin', remote]);
    git(seed, ['push', '-u', 'origin', 'main']);

    git(seed, ['checkout', '--orphan', 'gh-pages']);
    git(seed, ['rm', '-rf', '.']);
    fsSync.writeFileSync(path.join(seed, 'deployed.txt'), 'first\n');
    git(seed, ['add', 'deployed.txt']);
    git(seed, ['commit', '-m', 'first deploy']);
    git(seed, ['push', '-u', 'origin', 'gh-pages']);

    git(tmp, ['clone', '--branch', 'main', remote, repo]);
    git(repo, ['branch', 'gh-pages', 'origin/gh-pages']);
    const worktree = path.join(repo, '.tmp', 'gh-pages-publish');
    fsSync.mkdirSync(path.dirname(worktree), { recursive: true });
    git(repo, ['worktree', 'add', worktree, 'gh-pages']);
    fsSync.rmSync(worktree, { recursive: true, force: true });

    fsSync.writeFileSync(path.join(seed, 'deployed.txt'), 'second\n');
    git(seed, ['add', 'deployed.txt']);
    git(seed, ['commit', '-m', 'second deploy']);
    const remoteAdvance = git(seed, ['rev-parse', 'HEAD']);
    git(seed, ['push', 'origin', 'gh-pages']);

    const sourceCommit = git(repo, ['rev-parse', 'HEAD']);
    const dist = path.join(repo, 'dist');
    fsSync.mkdirSync(path.join(dist, 'pagefind'), { recursive: true });
    fsSync.writeFileSync(path.join(repo, 'package.json'), '{"version":"1.2.3"}\n');
    fsSync.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>fixture</title>\n');
    fsSync.writeFileSync(path.join(dist, 'pagefind', 'pagefind.js'), 'export {};\n');
    writeJson(path.join(dist, 'status.json'), { build: { commit: sourceCommit } });
    writeJson(path.join(dist, 'projects.json'), { counts: { projects: 1 }, projects: [{}] });
    writeJson(path.join(dist, 'releases.json'), { counts: { releases: 1 }, releases: [{}] });
    writeJson(path.join(dist, 'feed.json'), { items: [{}] });

    const result = spawnSync(process.execPath, [
      publisherPath,
      '--allow-dirty',
      '--skip-pages-api',
      '--skip-build',
      '--skip-live-smoke',
      '--repo',
      'Example/site',
      '--worktree',
      worktree,
    ], {
      cwd: repo,
      encoding: 'utf8',
      env: process.env,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Published v1\.2\.3/);
    assert.equal(fsSync.existsSync(path.join(worktree, '.git')), true);
    assert.equal(git(repo, ['merge-base', '--is-ancestor', remoteAdvance, 'gh-pages']), '');
    assert.equal(git(worktree, ['show', 'HEAD:index.html']), '<!doctype html><title>fixture</title>');
  } finally {
    fsSync.rmSync(tmp, { recursive: true, force: true });
  }
});
