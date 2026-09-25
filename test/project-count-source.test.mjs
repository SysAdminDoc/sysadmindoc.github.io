import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { readmeCountDrift, readmeCountInputs } from '../scripts/lib/readme-counts.mjs';

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

// The twenty-first drain review: any read error meant "not installed", so a
// truncated data file turned the README count test into a skip.
test('only a missing data file reads as not installed; one that does not parse fails', async (t) => {
  const os = await import('node:os');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'readme-counts-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.mkdir(path.join(dir, 'src', 'data'), { recursive: true });
  await fs.mkdir(path.join(dir, 'dist'));
  await fs.writeFile(path.join(dir, 'README.md'), 'catalog (1 feed-backed / 1 local fallback)\n--expected-releases 1\n');
  await fs.writeFile(path.join(dir, 'src', 'data', 'projects.ts'), 'export const catalog: CatalogEntry[] = [\n  { repo: "a" },\n];\n');
  assert.equal(readmeCountInputs(dir), null, 'nothing generated yet');

  await fs.writeFile(path.join(dir, 'src', 'data', '_profile-projects.json'), JSON.stringify({ projectCount: 1 }));
  await fs.writeFile(path.join(dir, 'src', 'data', '_releases.json'), JSON.stringify([{ tag: 'v1' }]));
  assert.deepEqual(readmeCountInputs(dir)?.counts, { feedCount: 1, fallbackCount: 1, releaseCount: 1, renderedCount: null }, 'no build yet');
  await fs.writeFile(path.join(dir, 'dist', 'projects.json'), JSON.stringify({ projects: [{}, {}] }));
  assert.equal(readmeCountInputs(dir)?.counts.renderedCount, 2);

  await fs.writeFile(path.join(dir, 'dist', 'projects.json'), '{"projects": [');
  assert.throws(() => readmeCountInputs(dir), /dist\/projects\.json doesn't parse/);
  await fs.writeFile(path.join(dir, 'dist', 'projects.json'), JSON.stringify({ items: [] }));
  assert.throws(() => readmeCountInputs(dir), /dist\/projects\.json has no projects list/);
  await fs.rm(path.join(dir, 'dist', 'projects.json'));
  await fs.writeFile(path.join(dir, 'src', 'data', '_releases.json'), '[{"tag":');
  assert.throws(() => readmeCountInputs(dir), /src\/data\/_releases\.json doesn't parse/);
});

test('README public command examples match generated portfolio counts', async (t) => {
  // The nightly syncs the data first and reports this as drift after it
  // deploys (scripts/refresh-and-deploy.mjs), so a new upstream repo can't stop
  // the deploy of everything else over a line of documentation.
  if (process.env.README_COUNTS_REPORT_ONLY === '1') { t.skip('README count drift is reported by the nightly after it deploys'); return; }
  const inputs = readmeCountInputs(root);
  if (!inputs) { t.skip('fixture files not installed, run npm run generated:fixtures'); return; }
  const readme = inputs.readme;
  assert.ok(inputs.counts.fallbackCount > 0);
  // The catalog counts describe the SOURCE corpora, which is what the README sentence claims.
  assert.deepEqual(readmeCountDrift(readme, { ...inputs.counts, renderedCount: null }), []);

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
