// How old a live-app screenshot capture may get. The live-app audit fails past
// CAPTURE_STALE_DAYS. Past CAPTURE_WARN_DAYS it only warns, and the nightly
// carries the warning, so the recapture happens before the deploy stops: on
// 2026-10-02 all 22 captures crossed 90 days together with no notice, and the
// nightly aborted for a week.
export const CAPTURE_STALE_DAYS = 90;
export const CAPTURE_WARN_DAYS = 75;

/**
 * @param {number | null} ageDays  whole days since the capture
 * @returns {'ok' | 'due' | 'stale' | null}  null when the age is unknown
 */
export function captureAgeLevel(ageDays) {
  if (typeof ageDays !== 'number' || !Number.isFinite(ageDays)) return null;
  if (ageDays > CAPTURE_STALE_DAYS) return 'stale';
  if (ageDays > CAPTURE_WARN_DAYS) return 'due';
  return 'ok';
}

/**
 * The nightly's warning for captures past the warning line, read from the
 * audit's .tmp/live-app-audit.json, or null when none is due or the file
 * can't be read.
 * @param {string} auditJson
 */
export function captureDueWarning(auditJson) {
  let results;
  try {
    results = JSON.parse(auditJson)?.results;
  } catch {
    return null;
  }
  if (!Array.isArray(results)) return null;
  const due = results.filter((result) => captureAgeLevel(result?.masterAgeDays) === 'due');
  if (due.length === 0) return null;
  const oldest = Math.max(...due.map((result) => result.masterAgeDays));
  const names = due.map((result) => result.slug).join(', ');
  return `${due.length} live-app screenshot capture(s) are past ${CAPTURE_WARN_DAYS} days (oldest ${oldest}d), and the deploy stops at ${CAPTURE_STALE_DAYS}: ${names}. Recapture with npm run queued -- capture-screenshots after hours.`;
}
