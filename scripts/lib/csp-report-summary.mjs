// Reads the CSP report store that deploy/vps/csp-report-server.mjs writes and
// says what visitors' browsers refused. Anyone can post a report, so nothing
// here trusts a value: a line that doesn't parse is counted and skipped, and
// every string that reaches a log goes through printable() first.
import { REPORT_CATEGORIES } from '../../deploy/vps/csp-report-server.mjs';

// A first-party violation the nightly hasn't reported before fails the run
// once it has come in at least this often, with its first and last report at
// least this far apart. A burst of forged reports arrives within seconds,
// however it straddles the hour; a real fault keeps arriving as people visit.
export const ALERT_MIN_REPORTS = 3;
export const ALERT_MIN_SPAN_MS = 60 * 60_000;
// At most this many new violations are named, and so remembered, per run. The
// rest wait for the next run rather than being remembered unseen.
export const NEW_VIOLATIONS_LIMIT = 20;

export const SUMMARY_CATEGORIES = Object.freeze([...REPORT_CATEGORIES, 'legacy']);

/** @param {unknown} value */
export function printable(value, max = 80) {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

/** @param {string} text */
export function parseStore(text) {
  const reports = [];
  let unreadable = 0;
  for (const line of String(text).split('\n')) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line);
      if (value && typeof value === 'object' && !Array.isArray(value)) reports.push(value);
      else unreadable += 1;
    } catch {
      unreadable += 1;
    }
  }
  return { reports, unreadable };
}

// Far past anything a sink stores: the current one keeps 40 characters of the
// site's own code or [other], and older rows up to 40 characters of
// which every two could become a seven-character mark.
const KEY_SAMPLE_MAX = 512;
const KEY_MAX = 2048;

// A violation is the directive plus what it blocked: a host for a URL, and the
// keyword ("inline", "eval") otherwise. A keyword violation also carries the
// start of its sample, so that a forged burst for `style-src-elem inline` burns
// only the block it named, and a real unhashed block later still alerts.
export function violationKey(report) {
  const directive =
    typeof report?.directive === 'string' && /^[a-z][a-z0-9-]{0,63}$/i.test(report.directive) ? report.directive.toLowerCase() : '(none)';
  let blocked = '(none)';
  let keyword = false;
  if (typeof report?.blocked === 'string' && report.blocked) {
    try {
      const url = new URL(report.blocked);
      blocked = url.origin === 'null' ? url.protocol : url.host;
    } catch {
      keyword = /^[a-z][a-z0-9+.-]{0,31}$/i.test(report.blocked);
      blocked = keyword ? report.blocked.toLowerCase() : '(unreadable)';
    }
  }
  // The whole stored sample (the site's own code, or [other] for anything
  // else), quoted JSON-style. Cut to 21, reports spread
  // over an hour could alert once and then silence every real block that began
  // the same way (eleventh drain review); cut to 64, or with " turned into ',
  // two samples still shared a key (fifteenth).
  const sample = keyword ? printable(report?.sample, KEY_SAMPLE_MAX) : '';
  return sample ? `${directive} ${blocked} ${JSON.stringify(sample)}` : `${directive} ${blocked}`;
}

/** "45 min" under two hours, "3.2 h" above. */
function spanText(ms) {
  return ms < 2 * 60 * 60_000 ? `${Math.round(ms / 60_000)} min` : `${(ms / (60 * 60_000)).toFixed(1)} h`;
}

function receivedAtOf(report) {
  if (typeof report?.receivedAt !== 'string') return null;
  const time = Date.parse(report.receivedAt);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/**
 * Counts every report by category, groups the first-party ones by violation,
 * and splits the groups nobody has been told about into ones that meet the
 * alert bar and ones still being watched. Reports written before the store
 * carried a category count as legacy: their blocked field was flattened to
 * "(invalid-url)", so they can't say what they were.
 */
export function summarizeReports(
  reports,
  { known = [], minReports = ALERT_MIN_REPORTS, minSpanMs = ALERT_MIN_SPAN_MS, limit = NEW_VIOLATIONS_LIMIT } = {},
) {
  const counts = Object.fromEntries(SUMMARY_CATEGORIES.map((name) => [name, 0]));
  const groups = new Map();
  for (const report of reports) {
    const category = REPORT_CATEGORIES.includes(report?.category) ? report.category : 'legacy';
    counts[category] += 1;
    if (category !== 'first-party') continue;
    const key = violationKey(report);
    const group = groups.get(key) ?? { key, count: 0, firstAt: null, lastAt: null, sample: null };
    group.count += 1;
    const at = receivedAtOf(report);
    if (at) {
      if (!group.firstAt || at < group.firstAt) group.firstAt = at;
      if (!group.lastAt || at >= group.lastAt) {
        group.lastAt = at;
        if (typeof report.sample === 'string' && report.sample) group.sample = printable(report.sample, 40);
      }
    }
    groups.set(key, group);
  }

  const knownKeys = new Set(known);
  const firstParty = [...groups.values()]
    .map((group) => ({
      key: printable(group.key, KEY_MAX),
      count: group.count,
      spanMs: group.firstAt && group.lastAt ? Date.parse(group.lastAt) - Date.parse(group.firstAt) : 0,
      lastAt: group.lastAt,
      sample: group.sample,
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const unreported = firstParty.filter((group) => !knownKeys.has(group.key));
  const meetsBar = (group) => group.count >= minReports && group.spanMs >= minSpanMs;
  const due = unreported.filter(meetsBar);
  return {
    total: reports.length,
    counts,
    firstParty,
    newViolations: due.slice(0, limit),
    deferred: Math.max(0, due.length - limit),
    watching: unreported.filter((group) => !meetsBar(group)),
  };
}

// The live smoke posts one synthetic report per deploy with this sample
// (scripts/smoke-live-site.mjs), and deploy-vps reads it back from the store.
// Only the sink in this repo stores it as synthetic, with its sample replaced
// by the bare [other] marker (it's none of the site's own code) and the query
// strings cut, so a stale container can't pass for it.
export const SMOKE_REPORT_SAMPLE = 'live-smoke uid=4815162342';
export const SMOKE_REPORT_STORED = /^\[other\]$/;

/**
 * @param {string} text  the store's lines that name this run
 * @param {{ since: number, runId: string, oldest?: string }} options  epoch
 *   seconds before the smoke started, the run id the deploy gave the smoke, and
 *   the first line of the store's rotated file, if it has one. Only a store
 *   that has rotated can have lost a row: a young one whose first row came in
 *   after `since`, within the deploy's margin, is just missing the smoke's
 *   (fifteenth drain review).
 * @returns {string | null}  what's wrong, or null
 */
export function smokeReportProblem(text, { since, runId, oldest = '' }) {
  // Only this run's own row counts. Anyone can post a smoke-looking report, so
  // the newest one is not necessarily ours.
  const marker = `/__live-smoke-${runId}/`;
  const fresh = parseStore(text).reports.filter((report) => {
    if (typeof report.document !== 'string' || !report.document.includes(marker)) return false;
    const time = Date.parse(report.receivedAt);
    return !Number.isNaN(time) && time / 1000 >= since;
  });
  if (fresh.length === 0) {
    // The store keeps two files of 5 MB. If even its oldest row came in after
    // the smoke, enough reports arrived in between to rotate the smoke's row
    // out: a flood, forged or not (eleventh drain review).
    const oldestAt = Date.parse(parseStore(oldest).reports[0]?.receivedAt ?? '');
    if (!Number.isNaN(oldestAt) && oldestAt / 1000 > since) {
      return `the CSP report store rotated past this deploy's smoke report (run ${runId}): its oldest row came in at ${new Date(oldestAt).toISOString()}, after the smoke, so a flood of reports pushed it out`;
    }
    return `the CSP report store holds no smoke report from this deploy (run ${runId})`;
  }
  const newest = fresh[fresh.length - 1];
  if (newest.category !== 'synthetic') {
    return `the smoke's CSP report was stored as ${JSON.stringify(newest.category ?? '(no category)')}, not "synthetic"`;
  }
  if (typeof newest.sample !== 'string' || !SMOKE_REPORT_STORED.test(newest.sample)) {
    return `the smoke's CSP report sample was stored as ${JSON.stringify(printable(newest.sample ?? '(none)', 60))}, not as the [other] marker`;
  }
  if (`${newest.document}${newest.blocked ?? ''}`.includes('?')) return "the smoke's CSP report kept a query string";
  return null;
}

/** One line for the nightly log. */
export function summaryLine(summary, unreadable = 0) {
  const parts = SUMMARY_CATEGORIES.filter((name) => summary.counts[name] > 0).map((name) => `${summary.counts[name]} ${name}`);
  const head = `${summary.total} report(s)${parts.length > 0 ? `: ${parts.join(', ')}` : ''}${unreadable > 0 ? `; ${unreadable} unreadable line(s)` : ''}`;
  if (summary.newViolations.length === 0) return `${head}; no new first-party violation`;
  const named = summary.newViolations
    .slice(0, 5)
    .map((group) => `${group.key} (${group.count} report(s) over ${spanText(group.spanMs)})`)
    .join(', ');
  const more = summary.newViolations.length > 5 ? `, and ${summary.newViolations.length - 5} more` : '';
  const later = summary.deferred > 0 ? `; ${summary.deferred} more wait for the next run` : '';
  return `${head}; NEW first-party: ${named}${more}${later}`;
}
