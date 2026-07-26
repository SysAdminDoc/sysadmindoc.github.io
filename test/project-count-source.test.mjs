import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const indexPath = path.join(root, 'src', 'pages', 'index.astro');
const githubScriptPath = path.join(root, 'public', 'scripts', 'home-github.js');
const basePath = path.join(root, 'src', 'layouts', 'Base.astro');
const readmePath = path.join(root, 'README.md');

test('homepage project count copy uses rendered catalog count', async () => {
  const source = await fs.readFile(indexPath, 'utf8');

  assert.match(source, /const publicProjectCount = catalog\.length;/);
  assert.match(source, /id="statRepos">\{publicProjectCount\}/);
  assert.doesNotMatch(source, /stats\.totalRepos/);
});

test('homepage project count remains build-time truth without GitHub hydration', async () => {
  const [index, base] = await Promise.all([
    fs.readFile(indexPath, 'utf8'),
    fs.readFile(basePath, 'utf8'),
  ]);

  await assert.rejects(fs.access(githubScriptPath), { code: 'ENOENT' });
  assert.doesNotMatch(base, /home-github\.js/);
  assert.doesNotMatch(index, /data-live|stats\.totalRepos|total_count/);
});

test('README public command examples match generated portfolio counts', async (t) => {
  const profilePath = path.join(root, 'src', 'data', '_profile-projects.json');
  const releasesPath = path.join(root, 'src', 'data', '_releases.json');
  const profileExists = await fs.access(profilePath).then(() => true, () => false);
  const releasesExists = await fs.access(releasesPath).then(() => true, () => false);
  if (!profileExists || !releasesExists) { t.skip('fixture files not installed — run npm run generated:fixtures'); return; }
  const readme = await fs.readFile(readmePath, 'utf8');
  const profile = JSON.parse(await fs.readFile(profilePath, 'utf8'));
  const releases = JSON.parse(await fs.readFile(releasesPath, 'utf8'));
  const projectsSource = await fs.readFile(path.join(root, 'src', 'data', 'projects.ts'), 'utf8');
  const catalogBlock = projectsSource.match(/export const catalog: CatalogEntry\[] = \[[\s\S]*?\n\];/)?.[0] ?? '';
  const localFallbackCount = catalogBlock.match(/\{ repo: /g)?.length ?? 0;

  assert.ok(localFallbackCount > 0);
  // These two describe the SOURCE corpora, which is what the README sentence claims.
  assert.match(readme, new RegExp(`catalog \\(${profile.projectCount} feed-backed / ${localFallbackCount} local fallback\\)`));
  assert.match(readme, new RegExp(`--expected-releases ${releases.length}`));

  // `--expected-projects` / `--expected-feed-items` are different numbers:
  // smoke-live-site.mjs compares them against the RENDERED /status.json,
  // /projects.json, /feed.json, and /atom.xml counts, and portfolio.ts narrows
  // the feed to repos that also appear in the reviewed local catalog. Pinning
  // them to the raw feed total documented a command that fails on the live site.
  // Assert against the built artifacts so the contract is checked, not restated.
  const projectsJsonPath = path.join(root, 'dist', 'projects.json');
  const builtExists = await fs.access(projectsJsonPath).then(() => true, () => false);
  if (!builtExists) {
    t.skip('dist/projects.json not built — run npm run build to verify rendered counts');
    return;
  }
  const builtProjects = JSON.parse(await fs.readFile(projectsJsonPath, 'utf8'));
  const renderedCount = Array.isArray(builtProjects.projects) ? builtProjects.projects.length : 0;
  assert.ok(renderedCount > 0, 'dist/projects.json should list projects');
  assert.match(readme, new RegExp(`--expected-projects ${renderedCount}\\b`));
  assert.match(readme, new RegExp(`--expected-feed-items ${renderedCount}\\b`));
});
