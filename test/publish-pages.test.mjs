import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('GitHub Pages publisher is wired to the local deploy gate and live smoke', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const publisher = await fs.readFile(path.join(root, 'scripts', 'publish-pages.mjs'), 'utf8');
  const smoke = await fs.readFile(path.join(root, 'scripts', 'smoke-live-site.mjs'), 'utf8');
  const nojekyll = await fs.readFile(path.join(root, 'public', '.nojekyll'), 'utf8');

  assert.equal(pkg.scripts['publish:pages'], 'node scripts/publish-pages.mjs');
  assert.match(publisher, /const DEFAULT_PAGES_BRANCH = 'gh-pages'/);
  assert.match(publisher, /verifyGitHubPagesSource/);
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
