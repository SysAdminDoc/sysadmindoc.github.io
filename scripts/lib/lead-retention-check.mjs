// /privacy/ says how long a contact message is kept (LEAD_RETENTION_DAYS in
// src/data/retention.ts), and test/privacy-retention.test.mjs keeps the
// handler's default equal to it. But CONTACT_RETENTION_DAYS in the server-side
// contact-secrets.env overrides that default, and no test can see that file
// (third drain review). Reading the variable from the container's config
// wasn't enough either: NODE_OPTIONS can set it again inside the process, and
// a multi-line value can print a line that looks like it (twentieth). So the
// deploy asks the running handler, whose /healthz reports the retention its
// purge uses.

/**
 * Why the running contact handler keeps leads for a time /privacy/ doesn't
 * state, or null.
 * @param {string} output the handler's /healthz body, read inside its container
 * @param {number} days what /privacy/ states
 * @returns {string | null}
 */
export function leadRetentionProblem(output, days) {
  let health;
  try {
    health = JSON.parse(String(output));
  } catch {
    health = null;
  }
  if (!health || typeof health !== 'object' || health.ok !== true) {
    return `could not read the contact handler's health (got "${String(output).trim().slice(0, 80)}")`;
  }
  const kept = health.leadRetentionDays;
  if (!Number.isSafeInteger(kept) || kept < 1) {
    return `the contact handler doesn't say how long it keeps leads (got ${String(JSON.stringify(kept) ?? 'nothing').slice(0, 40)})`;
  }
  if (kept !== days) {
    return `the contact handler deletes leads after ${kept} days, but /privacy/ says ${days}`;
  }
  return null;
}
