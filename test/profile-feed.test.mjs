import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCachedProfileFeed,
  filterPortfolioProjects,
  validateProfileFeed,
} from '../scripts/lib/profile-feed.mjs';

const visible = {
  repo: 'VisibleRepo',
  title: 'VisibleRepo',
  category: 'python',
  description: 'Visible project',
  repoUrl: 'https://github.com/SysAdminDoc/VisibleRepo',
  includeInPortfolio: true,
  suppressed: false,
};

test('filterPortfolioProjects removes suppressed and non-portfolio rows', () => {
  const rows = filterPortfolioProjects([
    visible,
    { ...visible, repo: 'SuppressedRepo', suppressed: true },
    { ...visible, repo: 'HiddenRepo', includeInPortfolio: false },
  ]);

  assert.deepEqual(rows.map((row) => row.repo), ['VisibleRepo']);
});

test('validateProfileFeed rejects missing required project fields', () => {
  assert.throws(
    () => validateProfileFeed({ projects: [{ ...visible, repo: '' }] }),
    /missing repo/,
  );
});

test('buildCachedProfileFeed writes only portfolio-visible rows', () => {
  const cached = buildCachedProfileFeed(
    {
      schema: 'https://example.test/schema.json',
      suppressedCount: 2,
      projects: [
        visible,
        { ...visible, repo: 'SuppressedRepo', suppressed: true },
        { ...visible, repo: 'HiddenRepo', includeInPortfolio: false },
      ],
    },
    'https://example.test/projects.json',
    '2026-06-04T00:00:00Z',
  );

  assert.equal(cached.projectCount, 1);
  assert.equal(cached.feedSourceUrl, 'https://example.test/projects.json');
  assert.equal(cached.cachedAt, '2026-06-04T00:00:00Z');
  assert.deepEqual(cached.projects.map((row) => row.repo), ['VisibleRepo']);
});
