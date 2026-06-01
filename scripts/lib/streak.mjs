// Pure date/streak helpers shared by the build-time data pipeline.
// Kept dependency-free and side-effect-free so they can be unit-tested
// directly (see test/streak.test.mjs).

/**
 * Normalize any date-like value to a UTC `YYYY-MM-DD` key.
 * Returns '' for unparseable input so callers can filter it out.
 */
export function getUtcDayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Current consecutive-day push streak.
 *
 * A genuine "current" streak must end at today or — because the current UTC day
 * is not over yet — at yesterday. If the most recent push is older than that,
 * the streak is 0. From the anchor day we walk strictly backward, counting only
 * unbroken consecutive days. The previous implementation looped 0..89 from today
 * and never broke when today had no push, so it silently reported a positive
 * streak that did not end now.
 *
 * @param {Set<string>|Iterable<string>} pushDays - set/iterable of `YYYY-MM-DD` UTC keys
 * @param {Date} [now] - injectable clock for testing
 * @returns {number}
 */
export function computeStreak(pushDays, now = new Date()) {
  const set = pushDays instanceof Set ? pushDays : new Set(pushDays);
  set.delete('');
  if (set.size === 0) return 0;

  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  let cursor;
  if (set.has(getUtcDayKey(today))) cursor = today;
  else if (set.has(getUtcDayKey(yesterday))) cursor = yesterday;
  else return 0;

  let streak = 0;
  const day = new Date(cursor);
  // Hard cap (~10y) so a malformed set can never spin forever.
  for (let i = 0; i < 3660; i += 1) {
    if (!set.has(getUtcDayKey(day))) break;
    streak += 1;
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return streak;
}
