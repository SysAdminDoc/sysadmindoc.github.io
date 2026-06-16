import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ageDaysFromReference,
  computeCatalogViewState,
  computeViewCounts,
  computeCategoryCounts,
} from '../src/data/catalog-views.mjs';

// ---------------------------------------------------------------------------
// ageDaysFromReference
// ---------------------------------------------------------------------------

test('ageDaysFromReference returns null for null/undefined iso', () => {
  assert.equal(ageDaysFromReference(null, Date.now()), null);
  assert.equal(ageDaysFromReference(undefined, Date.now()), null);
  assert.equal(ageDaysFromReference('', Date.now()), null);
});

test('ageDaysFromReference returns null for invalid date string', () => {
  assert.equal(ageDaysFromReference('not-a-date', Date.now()), null);
});

test('ageDaysFromReference returns 0 for same-day timestamps', () => {
  const ref = new Date('2026-06-01T12:00:00Z').getTime();
  assert.equal(ageDaysFromReference('2026-06-01T00:00:00Z', ref), 0);
});

test('ageDaysFromReference returns correct whole-day count', () => {
  const ref = new Date('2026-06-10T00:00:00Z').getTime();
  assert.equal(ageDaysFromReference('2026-06-07T00:00:00Z', ref), 3);
});

test('ageDaysFromReference clamps to 0 for future timestamps', () => {
  const ref = new Date('2026-01-01T00:00:00Z').getTime();
  // iso is in the future relative to ref
  assert.equal(ageDaysFromReference('2026-12-31T00:00:00Z', ref), 0);
});

// ---------------------------------------------------------------------------
// computeCatalogViewState
// ---------------------------------------------------------------------------

const REF_MS = new Date('2026-06-10T00:00:00Z').getTime();

test('computeCatalogViewState marks entry updated 10 days ago as isNew and isRecent', () => {
  const catalog = [{ repo: 'Alpha', updatedAt: '2026-05-31T00:00:00Z' }];
  const state = computeCatalogViewState(catalog, { referenceMs: REF_MS });
  const entry = state.get('Alpha');
  assert.ok(entry.isNew);
  assert.ok(entry.isRecent);
  assert.ok(!entry.hasDownload);
});

test('computeCatalogViewState marks entry updated 60 days ago as isRecent but not isNew', () => {
  const catalog = [{ repo: 'Beta', updatedAt: '2026-04-11T00:00:00Z' }];
  const state = computeCatalogViewState(catalog, { referenceMs: REF_MS });
  const entry = state.get('Beta');
  assert.ok(!entry.isNew, 'should not be isNew at 60 days');
  assert.ok(entry.isRecent, 'should be isRecent at 60 days');
});

test('computeCatalogViewState marks entry updated 120 days ago as neither new nor recent', () => {
  const catalog = [{ repo: 'Gamma', updatedAt: '2026-02-10T00:00:00Z' }];
  const state = computeCatalogViewState(catalog, { referenceMs: REF_MS });
  const entry = state.get('Gamma');
  assert.ok(!entry.isNew);
  assert.ok(!entry.isRecent);
});

test('computeCatalogViewState resolves updatedAt from meta when not on entry', () => {
  const catalog = [{ repo: 'Delta' }];
  const meta = { Delta: { updatedAt: '2026-06-09T00:00:00Z' } };
  const state = computeCatalogViewState(catalog, { meta, referenceMs: REF_MS });
  assert.ok(state.get('Delta').isNew);
});

test('computeCatalogViewState falls back to meta pushedAt when updatedAt absent', () => {
  const catalog = [{ repo: 'Echo' }];
  const meta = { Echo: { pushedAt: '2026-05-01T00:00:00Z' } };
  const state = computeCatalogViewState(catalog, { meta, referenceMs: REF_MS });
  const entry = state.get('Echo');
  assert.ok(!entry.isNew, 'May 1st is >30 days before Jun 10');
  assert.ok(entry.isRecent, 'May 1st is <90 days before Jun 10');
});

test('computeCatalogViewState sets hasDownload from releaseDownloadRepos', () => {
  const catalog = [{ repo: 'Foxtrot' }];
  const releaseDownloadRepos = new Set(['Foxtrot']);
  const state = computeCatalogViewState(catalog, { releaseDownloadRepos, referenceMs: REF_MS });
  assert.ok(state.get('Foxtrot').hasDownload);
});

test('computeCatalogViewState sets hasDownload from entry.hasDownload flag', () => {
  const catalog = [{ repo: 'Golf', hasDownload: true }];
  const state = computeCatalogViewState(catalog, { referenceMs: REF_MS });
  assert.ok(state.get('Golf').hasDownload);
});

test('computeCatalogViewState handles empty catalog', () => {
  const state = computeCatalogViewState([], { referenceMs: REF_MS });
  assert.equal(state.size, 0);
});

test('computeCatalogViewState handles non-array catalog gracefully', () => {
  const state = computeCatalogViewState(null, { referenceMs: REF_MS });
  assert.equal(state.size, 0);
});

// ---------------------------------------------------------------------------
// computeViewCounts
// ---------------------------------------------------------------------------

test('computeViewCounts reflects all flag totals from viewStateMap', () => {
  const map = new Map([
    ['a', { isNew: true, isRecent: true, hasDownload: false }],
    ['b', { isNew: false, isRecent: true, hasDownload: true }],
    ['c', { isNew: false, isRecent: false, hasDownload: false }],
  ]);
  const counts = computeViewCounts(map);
  assert.equal(counts.all, 3);
  assert.equal(counts.new, 1);
  assert.equal(counts.recent, 2);
  assert.equal(counts.download, 1);
});

test('computeViewCounts returns zeros for empty map', () => {
  const counts = computeViewCounts(new Map());
  assert.deepEqual(counts, { all: 0, new: 0, recent: 0, download: 0 });
});

// ---------------------------------------------------------------------------
// computeCategoryCounts
// ---------------------------------------------------------------------------

test('computeCategoryCounts tallies each category correctly', () => {
  const catalog = [
    { repo: 'a', category: 'ps' },
    { repo: 'b', category: 'ps' },
    { repo: 'c', category: 'py' },
  ];
  const counts = computeCategoryCounts(catalog);
  assert.equal(counts['ps'], 2);
  assert.equal(counts['py'], 1);
});

test('computeCategoryCounts skips entries without a category', () => {
  const catalog = [{ repo: 'a' }, { repo: 'b', category: 'web' }];
  const counts = computeCategoryCounts(catalog);
  assert.equal(Object.keys(counts).length, 1);
  assert.equal(counts['web'], 1);
});

test('computeCategoryCounts handles empty and non-array catalog', () => {
  assert.deepEqual(computeCategoryCounts([]), {});
  assert.deepEqual(computeCategoryCounts(null), {});
});
