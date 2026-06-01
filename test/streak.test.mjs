import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getUtcDayKey, computeStreak } from '../scripts/lib/streak.mjs';

const NOW = new Date('2026-06-01T12:00:00Z');
const key = (offset) => {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - offset);
  return getUtcDayKey(d);
};

test('getUtcDayKey normalizes to UTC YYYY-MM-DD', () => {
  assert.equal(getUtcDayKey('2026-06-01T23:30:00Z'), '2026-06-01');
  assert.equal(getUtcDayKey(new Date('2026-01-05T00:00:00Z')), '2026-01-05');
});

test('getUtcDayKey returns empty string for unparseable input', () => {
  assert.equal(getUtcDayKey('not-a-date'), '');
  assert.equal(getUtcDayKey(undefined), '');
});

test('empty push set yields zero streak', () => {
  assert.equal(computeStreak(new Set(), NOW), 0);
});

test('consecutive run ending today counts every day', () => {
  const set = new Set([key(0), key(1), key(2), key(3)]);
  assert.equal(computeStreak(set, NOW), 4);
});

test('no push today but pushed yesterday carries the streak', () => {
  // The current UTC day is not over, so yesterday anchors the streak.
  const set = new Set([key(1), key(2), key(3)]);
  assert.equal(computeStreak(set, NOW), 3);
});

test('latest push older than yesterday resets streak to zero', () => {
  // This is the bug the old algorithm hid: it would report 2 here.
  const set = new Set([key(3), key(4)]);
  assert.equal(computeStreak(set, NOW), 0);
});

test('a gap stops the count at the most recent unbroken run', () => {
  const set = new Set([key(0), key(1), /* gap at 2 */ key(3), key(4)]);
  assert.equal(computeStreak(set, NOW), 2);
});

test('non-adjacent days do not inflate the streak', () => {
  // Old loop conflated non-adjacent pushed days into one count.
  const set = new Set([key(0), key(5), key(6), key(7)]);
  assert.equal(computeStreak(set, NOW), 1);
});

test('accepts an iterable and filters empty keys', () => {
  assert.equal(computeStreak([key(0), key(1), ''], NOW), 2);
});
