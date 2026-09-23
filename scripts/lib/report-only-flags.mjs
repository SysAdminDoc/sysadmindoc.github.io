// The unattended refresh (scripts/refresh-and-deploy.mjs) runs deploy:preflight
// with these set, so a gap only a person can close, an uncataloged repo or an
// unsigned release in another repo, is reported instead of freezing the deploy.
// Every preflight step inherits them, npm test included, so a test that starts
// one of those scripts has to choose its mode rather than take the caller's.
// The strict provenance test failed every nightly run that way.
import process from 'node:process';

export const REPORT_ONLY_FLAGS = Object.freeze(['CATALOG_AUDIT_REPORT_ONLY', 'PROVENANCE_REPORT_ONLY']);

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
