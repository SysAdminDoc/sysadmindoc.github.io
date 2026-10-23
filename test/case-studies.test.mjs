import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { exportedArray, sourceFile } from '../scripts/lib/ts-data-utils.mjs';

const root = process.cwd();
const caseStudiesPath = path.join(root, 'src', 'data', 'case-studies.ts');
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const workPagePath = path.join(root, 'src', 'pages', 'work.astro');

async function loadCaseStudies() {
  const text = await fs.readFile(caseStudiesPath, 'utf8');
  return exportedArray(sourceFile(caseStudiesPath, text), 'caseStudies');
}

test('case studies are a short, complete set of public projects', async () => {
  const studies = await loadCaseStudies();
  const projects = await fs.readFile(projectsPath, 'utf8');

  assert.ok(studies.length >= 4 && studies.length <= 8, `expected four to eight studies, found ${studies.length}`);
  assert.equal(new Set(studies.map((study) => study.slug)).size, studies.length, 'slugs must be unique');

  for (const study of studies) {
    assert.match(study.slug, /^[a-z0-9-]+$/, `${study.slug} should be a URL-safe slug`);
    for (const field of ['name', 'lane', 'stack', 'problem', 'built', 'result', 'caveat']) {
      assert.ok(typeof study[field] === 'string' && study[field].trim().length > 0, `${study.slug} needs ${field}`);
    }
    assert.ok(Array.isArray(study.repos) && study.repos.length > 0, `${study.slug} needs at least one repo`);
    assert.ok(Array.isArray(study.shows) && study.shows.length >= 2, `${study.slug} should list what it shows`);
    for (const repo of study.repos) {
      assert.ok(
        projects.includes(`repo: "${repo}"`),
        `${study.slug} names ${repo}, which is not in the local catalog; a private or renamed repo would ship a dead link`,
      );
    }
  }
});

test('case study prose follows the public writing rules', async () => {
  const studies = await loadCaseStudies();
  for (const study of studies) {
    for (const field of ['problem', 'built', 'result', 'caveat']) {
      const text = study[field];
      assert.doesNotMatch(text, /[–—]/, `${study.slug}.${field} uses a dash the public voice rules forbid`);
      assert.doesNotMatch(text, / - /, `${study.slug}.${field} uses a spaced hyphen as a dash`);
      assert.doesNotMatch(text, /\b(leverage|robust|seamless|delve|streamline|empower)\b/i, `${study.slug}.${field} uses a banned word`);
    }
    // Figures are computed at build time; the result copy must not hardcode a
    // star or download count that the data cache would then contradict.
    assert.doesNotMatch(study.result, /\b\d[\d,]*\s*(stars?|downloads?)\b/i, `${study.slug}.result hardcodes a figure`);
  }
});

test('the work page renders every study and the private-work note', async () => {
  const source = await fs.readFile(workPagePath, 'utf8');
  assert.match(source, /caseStudies\.map\(/, 'the page should iterate the shared case study data');
  assert.match(source, /caseStudyFigures\(/, 'the page should show build-time figures');
  assert.match(source, /id="private-work"/, 'the page should say why employer and customer work is absent');
  assert.match(source, /data-pagefind-filter="Scope:Work"/, 'the page should join the search index under its own scope');
  assert.match(source, /href="\/healthcare-it\/"/, 'the private-work note should hand off to the Experience page');
});
