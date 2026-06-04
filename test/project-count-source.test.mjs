import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const indexPath = path.join(root, 'src', 'pages', 'index.astro');
const mainScriptPath = path.join(root, 'public', 'scripts', 'main.js');

test('homepage project count copy uses rendered catalog count', async () => {
  const source = await fs.readFile(indexPath, 'utf8');

  assert.match(source, /const publicProjectCount = catalogTotal;/);
  assert.match(source, /id="statRepos" data-live>\{publicProjectCount\}/);
  assert.match(source, /id="aboutReposText">\{publicProjectCount\}\+/);
  assert.match(source, /id="aboutRepos">\{publicProjectCount\}/);
  assert.doesNotMatch(source, /stats\.totalRepos/);
});

test('live GitHub refresh does not overwrite project count with raw repo totals', async () => {
  const source = await fs.readFile(mainScriptPath, 'utf8');

  assert.match(source, /const projectCount=getFallbackRepoCount\(\)\|\|cached\.displayTotal\|\|cached\.total;/);
  assert.match(source, /writeJsonCache\(GITHUB_CACHE_KEY,\{data:ghData,total:count,displayTotal:projectCount,/);
  assert.match(source, /applyGitHubData\(projectCount,totalStars,langCount,\{skipAggregate\}\);/);
  assert.doesNotMatch(source, /applyGitHubData\(cached\.total/);
  assert.doesNotMatch(source, /applyGitHubData\(count,totalStars/);
});
