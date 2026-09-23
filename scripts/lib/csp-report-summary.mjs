// Reads the CSP report store that deploy/vps/csp-report-server.mjs writes and
// says what visitors' browsers refused. Anyone can post a report, so nothing
// here trusts a value: a line that doesn't parse is counted and skipped, and
// every string that reaches a log goes through printable() first.
import { REPORT_CATEGORIES } from '../../deploy/vps/csp-report-server.mjs';

// A first-party violation the nightly hasn't reported before fails the run
// once it has come in at least this often, in at least this many separate
// clock hours. A burst of forged reports lands in one hour; a real fault keeps
// arriving as people visit.
export const ALERT_MIN_REPORTS = 3;
export const ALERT_MIN_HOURS = 2;

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

// A violation is the directive plus what it blocked: a host for a URL, and the
// keyword ("inline", "eval") otherwise.
export function violationKey(report) {
  const directive =
    typeof report?.directive === 'string' && /^[a-z][a-z0-9-]{0,63}$/i.test(report.directive) ? report.directive.toLowerCase() : '(none)';
  let blocked = '(none)';
  if (typeof report?.blocked === 'string' && report.blocked) {
    try {
      const url = new URL(report.blocked);
      blocked = url.origin === 'null' ? url.protocol : url.host;
    } catch {
      blocked = /^[a-z][a-z0-9+.-]{0,31}$/i.test(report.blocked) ? report.blocked.toLowerCase() : '(unreadable)';
    }
  }
  return `${directive} ${blocked}`;
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
export function summarizeReports(reports, { known = [], minReports = ALERT_MIN_REPORTS, minHours = ALERT_MIN_HOURS } = {}) {
  const counts = Object.fromEntries(SUMMARY_CATEGORIES.map((name) => [name, 0]));
  const groups = new Map();
  for (const report of reports) {
    const category = REPORT_CATEGORIES.includes(report?.category) ? report.category : 'legacy';
    counts[category] += 1;
    if (category !== 'first-party') continue;
    const key = violationKey(report);
    const group = groups.get(key) ?? { key, count: 0, hours: new Set(), lastAt: null, sample: null };
    group.count += 1;
    const at = receivedAtOf(report);
    if (at) {
      group.hours.add(at.slice(0, 13));
      if (!group.lastAt || at >= group.lastAt) {
        group.lastAt = at;
        if (typeof report.sample === 'string' && report.sample) group.sample = printable(report.sample, 40);
      }
    }
    groups.set(key, group);
  }

  const knownKeys = new Set(known);
  const firstParty = [...groups.values()]
    .map((group) => ({ key: printable(group.key, 120), count: group.count, hours: group.hours.size, lastAt: group.lastAt, sample: group.sample }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const unreported = firstParty.filter((group) => !knownKeys.has(group.key));
  const meetsBar = (group) => group.count >= minReports && group.hours >= minHours;
  return {
    total: reports.length,
    counts,
    firstParty,
    newViolations: unreported.filter(meetsBar),
    watching: unreported.filter((group) => !meetsBar(group)),
  };
}

// The live smoke posts one synthetic report per deploy with this sample
// (scripts/smoke-live-site.mjs), and deploy-vps reads it back from the store.
// Only the sink in this repo stores it as synthetic, with the number scrubbed
// and the query strings cut, so a stale container can't pass for it.
export const SMOKE_REPORT_SAMPLE = 'live-smoke uid=4815162342';
export const SMOKE_REPORT_SCRUBBED = 'live-smoke uid=[number]';

/**
 * @param {string} text  the newest lines of the store
 * @param {{ since: number }} options  epoch seconds before the smoke started
 * @returns {string | null}  what's wrong, or null
 */
export function smokeReportProblem(text, { since }) {
  const fresh = parseStore(text).reports.filter((report) => {
    if (typeof report.document !== 'string' || !report.document.includes('/__live-smoke-')) return false;
    const time = Date.parse(report.receivedAt);
    return !Number.isNaN(time) && time / 1000 >= since;
  });
  if (fresh.length === 0) return 'the CSP report store holds no smoke report from this deploy';
  const newest = fresh[fresh.length - 1];
  if (newest.category !== 'synthetic') {
    return `the smoke's CSP report was stored as ${JSON.stringify(newest.category ?? '(no category)')}, not "synthetic"`;
  }
  if (newest.sample !== SMOKE_REPORT_SCRUBBED) {
    return `the smoke's CSP report sample was stored as ${JSON.stringify(printable(newest.sample ?? '(none)', 60))}, not ${JSON.stringify(SMOKE_REPORT_SCRUBBED)}`;
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
    .map((group) => `${group.key} (${group.count} report(s) over ${group.hours} hour(s))`)
    .join(', ');
  const more = summary.newViolations.length > 5 ? `, and ${summary.newViolations.length - 5} more` : '';
  return `${head}; NEW first-party: ${named}${more}`;
}
