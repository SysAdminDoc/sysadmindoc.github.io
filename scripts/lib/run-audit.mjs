// Runs one audit for the gate self-test (scripts/audit-gate-selftest.mjs).
// Every audit there takes seconds, so one still running after the limit is
// hung: on 2026-09-24 og-cards:audit sat in sharp for 13 minutes with 0.25 s
// of CPU, and build:ci waited with it. A run that times out reports so, and
// the self-test counts it as a failure either way, since a hang neither passes
// the clean build nor rejects a plant.
import { execFileSync } from 'node:child_process';
import process from 'node:process';

export const AUDIT_TIMEOUT_MS = 180_000;

/**
 * `status` is the audit's exit code, or null when it gave none: it timed out
 * or something killed it, which is no verdict on the build.
 * @param {string[]} args node's arguments: the audit script and its flags
 * @param {{ cwd?: string, timeoutMs?: number }} [options]
 * @returns {{ status: number | null, stderr: string, timedOut: boolean }}
 */
export function runAudit(args, { cwd = process.cwd(), timeoutMs = AUDIT_TIMEOUT_MS } = {}) {
  try {
    execFileSync(process.execPath, args, { cwd, stdio: 'pipe', windowsHide: true, timeout: timeoutMs });
    return { status: 0, stderr: '', timedOut: false };
  } catch (error) {
    return {
      status: typeof error?.status === 'number' ? error.status : null,
      stderr: String(error?.stderr ?? ''),
      timedOut: error?.code === 'ETIMEDOUT',
    };
  }
}

/** Why a run gave no verdict, or null when it exited on its own. */
export function noVerdict(run, timeoutMs = AUDIT_TIMEOUT_MS) {
  if (run.status !== null) return null;
  return run.timedOut ? `was still running after ${timeoutMs / 1000}s` : 'was killed before it exited';
}
