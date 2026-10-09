// The unattended refresh (scripts/refresh-and-deploy.mjs) runs deploy:preflight
// with these set, so a gap only a person can close, an uncataloged repo or an
// unsigned release in another repo, is reported instead of freezing the deploy.
// Every preflight step inherits them, npm test included, so a test that starts
// one of those scripts has to choose its mode rather than take the caller's.
// The strict provenance test failed every nightly run that way.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const REPORT_ONLY_FLAGS = Object.freeze(['CATALOG_AUDIT_REPORT_ONLY', 'PROVENANCE_REPORT_ONLY', 'README_COUNTS_REPORT_ONLY']);

// The runner sets this beside the flags: its pid and start time, as its status
// file records them while it runs. The runner reports what the flags let
// through after it deploys; a flag set anywhere else, say left in a shell, has
// nothing to report it, so a manual deploy:preflight then deploy:vps shipped
// the drift unseen (twenty-first drain review).
export const REPORT_ONLY_OWNER = 'PORTFOLIO_NIGHTLY_RUN';

/** The owner mark for a run. */
export function runnerMark(pid, startedAt) {
  return `${pid}@${startedAt}`;
}

/**
 * `env` without any report-only flag, plus `extra`.
 * @param {Record<string, string | undefined>} [env]
 * @param {Record<string, string>} [extra]
 */
export function withoutReportOnlyFlags(env = process.env, extra = {}) {
  const copy = { ...env };
  for (const flag of REPORT_ONLY_FLAGS) delete copy[flag];
  return { ...copy, ...extra };
}

/**
 * The report-only flags `env` turns on that the runner didn't set for the run
 * going now: on when they hold 1, true or yes, as the scripts read them, and
 * the runner's when its status file says it's running under the mark `env`
 * carries.
 * @param {Record<string, string | undefined>} env
 * @param {string | null} statusText the runner's status file, or null
 * @returns {string[]}
 */
export function strayReportOnlyFlags(env, statusText) {
  const on = REPORT_ONLY_FLAGS.filter((flag) => /^(1|true|yes)$/i.test(env[flag] ?? ''));
  if (on.length === 0) return [];
  let status = null;
  try {
    status = JSON.parse(statusText ?? '');
  } catch {
    status = null;
  }
  const runner = status?.status === 'running' && env[REPORT_ONLY_OWNER] === runnerMark(status.pid, status.startedAt);
  return runner ? [] : on;
}

/**
 * What to say about stray flags in a checkout, or null. With `strict` it's the
 * reason deploy:preflight refuses to start; otherwise a warning.
 * @param {{ env?: Record<string, string | undefined>, root?: string, strict?: boolean }} [options]
 */
export function strayReportOnlyMessage({ env = process.env, root = process.cwd(), strict = false } = {}) {
  let statusText = null;
  try {
    statusText = fs.readFileSync(path.join(root, '.tmp', 'refresh-and-deploy-status.json'), 'utf8');
  } catch {
    statusText = null;
  }
  const stray = strayReportOnlyFlags(env, statusText);
  if (stray.length === 0) return null;
  const names = `${stray.join(', ')} ${stray.length === 1 ? 'is' : 'are'} set outside the nightly runner`;
  return strict
    ? `${names}, and nothing would report what ${stray.length === 1 ? 'it lets' : 'they let'} through. Unset ${stray.length === 1 ? 'it' : 'them'} before deploy:preflight; only scripts/refresh-and-deploy.mjs may set ${stray.length === 1 ? 'it' : 'them'}.`
    : `WARNING: ${names}, so the checks ${stray.length === 1 ? 'it covers' : 'they cover'} only report, and nothing reports them afterwards.`;
}
