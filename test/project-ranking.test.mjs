import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROJECT_RANKING_WEIGHTS,
  computeProjectRankings,
  formatProjectRankingLabel,
  getReleaseDownloadTotals,
  rankCatalogEntries,
} from '../src/data/project-ranking.mjs';

test('project ranking weights stay normalized', () => {
  const total = Object.values(PROJECT_RANKING_WEIGHTS).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 1);
});

test('release download totals aggregate by repo', () => {
  const totals = getReleaseDownloadTotals([
    { repo: 'ToolA', downloads: 5 },
    { repo: 'ToolA', downloads: 7 },
    { repo: 'ToolB', downloads: 0 },
    { repo: '', downloads: 99 },
  ]);

  assert.equal(totals.get('ToolA'), 12);
  assert.equal(totals.get('ToolB'), 0);
  assert.equal(totals.has(''), false);
});

test('rankCatalogEntries blends stars, recency, and release activity', () => {
  const entries = [
    { repo: 'StalePopular', name: 'Stale Popular', updatedAt: '2025-01-01T00:00:00Z' },
    { repo: 'FreshQuiet', name: 'Fresh Quiet', updatedAt: '2026-06-01T00:00:00Z' },
    { repo: 'FreshReleased', name: 'Fresh Released', updatedAt: '2026-06-01T00:00:00Z', hasDownload: true },
  ];

  const rankings = computeProjectRankings(entries, {
    stars: {
      StalePopular: 100,
      FreshQuiet: 30,
      FreshReleased: 30,
    },
    releases: [{ repo: 'FreshReleased', downloads: 200 }],
    referenceDate: '2026-06-04T00:00:00Z',
  });

  assert.deepEqual(rankCatalogEntries(entries, rankings).map((entry) => entry.repo), [
    'FreshReleased',
    'FreshQuiet',
    'StalePopular',
  ]);
  assert.equal(rankings.get('FreshReleased').rank, 1);
  assert.match(formatProjectRankingLabel(rankings.get('FreshReleased')), /release downloads/);
});

test('rankCatalogEntries keeps source order for exact ties', () => {
  const entries = [
    { repo: 'Alpha', name: 'Alpha', updatedAt: '2026-06-01T00:00:00Z' },
    { repo: 'Beta', name: 'Beta', updatedAt: '2026-06-01T00:00:00Z' },
  ];
  const rankings = computeProjectRankings(entries, {
    stars: { Alpha: 1, Beta: 1 },
    referenceDate: '2026-06-04T00:00:00Z',
  });

  assert.deepEqual(rankCatalogEntries(entries, rankings).map((entry) => entry.repo), ['Alpha', 'Beta']);
});
