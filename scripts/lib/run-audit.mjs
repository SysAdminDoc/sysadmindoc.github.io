// Runs one audit for the gate self-test (scripts/audit-gate-selftest.mjs).
// Every audit there takes seconds, so one still running after the limit is
// hung: on 2026-09-24 og-cards:audit sat in sharp for 13 minutes with 0.25 s
// of CPU, and build:ci waited with it. A run that times out reports so, and
// the self-test counts it as a failure either way, since a hang neither passes
// the clean build nor rejects a plant.
//
// An exit code alone doesn't prove a rejection either: on Windows a process
// killed from outside exits 1 (taskkill, process.kill) or 4294967295
// (Stop-Process), not with a signal (nineteenth drain review). So a planted
// run counts as rejected only when its output names the reason (`plantVerdict`).
import { execFileSync } from 'node:child_process';
import process from 'node:process';

export const AUDIT_TIMEOUT_MS = 180_000;

/**
 * `status` is the audit's exit code, or null when it gave none: it timed out
 * or something killed it with a signal, which is no verdict on the build.
 * `output` is everything it printed, stdout and stderr.
 * @param {string[]} args node's arguments: the audit script and its flags
 * @param {{ cwd?: string, timeoutMs?: number }} [options]
 * @returns {{ status: number | null, output: string, timedOut: boolean }}
 */
export function runAudit(args, { cwd = process.cwd(), timeoutMs = AUDIT_TIMEOUT_MS } = {}) {
  try {
    const stdout = execFileSync(process.execPath, args, { cwd, stdio: 'pipe', windowsHide: true, timeout: timeoutMs, encoding: 'utf8' });
    return { status: 0, output: String(stdout ?? ''), timedOut: false };
  } catch (error) {
    return {
      status: typeof error?.status === 'number' ? error.status : null,
      output: `${String(error?.stdout ?? '')}${String(error?.stderr ?? '')}`,
      timedOut: error?.code === 'ETIMEDOUT',
    };
  }
}

// Stop-Process and TerminateProcess(-1) leave -1 as the exit code, which
// reads back unsigned. No audit exits with it on its own, so a run that
// printed its reason and then hung until something ended it this way isn't a
// rejection (twenty-first drain review). A kill that leaves exit code 1
// (taskkill) still can't be told apart; the self-test's timeout covers a hang.
const KILLED_STATUS = 4294967295;

/** Why a run gave no verdict, or null when it exited on its own. */
export function noVerdict(run, timeoutMs = AUDIT_TIMEOUT_MS) {
  if (run.status === KILLED_STATUS) return 'was killed before it exited';
  if (run.status !== null) return null;
  return run.timedOut ? `was still running after ${timeoutMs / 1000}s` : 'was killed before it exited';
}

/**
 * Whether a planted run rejected the plant for the reason the case names:
 * it exited non-zero on its own and said so. Null when it did; otherwise why
 * not, for the self-test's failure list.
 * @param {{ status: number | null, output: string, timedOut: boolean }} run
 * @param {RegExp} expect
 * @param {number} [timeoutMs]
 */
export function plantVerdict(run, expect, timeoutMs = AUDIT_TIMEOUT_MS) {
  const hung = noVerdict(run, timeoutMs);
  if (hung) return `${hung}, which is no rejection`;
  if (run.status === 0) return 'passed, so the gate does not check what it claims';
  if (!expect.test(run.output)) return `failed, but not for that reason: ${run.output.trim().slice(-300)}`;
  return null;
}
