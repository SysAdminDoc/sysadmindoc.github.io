// /privacy/ says how long a contact message is kept (LEAD_RETENTION_DAYS in
// src/data/retention.ts), and test/privacy-retention.test.mjs keeps the
// handler's default equal to it. But CONTACT_RETENTION_DAYS in the server-side
// contact-secrets.env overrides that default, and no test can see that file,
// so the deploy reads the running handler's own environment (third drain
// review).

/**
 * Why the running contact handler keeps leads for a time /privacy/ doesn't
 * state, or null.
 * @param {string} output `container=<name>` and any `CONTACT_RETENTION_DAYS=`
 *   line, filtered on the server from `docker inspect`
 * @param {number} days what /privacy/ states
 * @returns {string | null}
 */
export function leadRetentionProblem(output, days) {
  const lines = String(output).split(/\r?\n/);
  if (!lines.some((line) => /^container=\/?portfolio-contact-handler$/.test(line.trim()))) {
    return `could not read the contact handler's environment (got "${String(output).trim().slice(0, 80)}")`;
  }
  const setting = lines.find((line) => line.startsWith('CONTACT_RETENTION_DAYS='));
  // Unset, the handler keeps its default, which a test holds to the page.
  if (setting === undefined) return null;
  const value = setting.slice('CONTACT_RETENTION_DAYS='.length);
  // The handler reads it as Number() of the string, and an empty one as unset.
  if (value === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return `the contact handler's CONTACT_RETENTION_DAYS is "${value.slice(0, 20)}", which it refuses to start with`;
  }
  if (parsed !== days) {
    return `the contact handler keeps leads ${parsed} days (CONTACT_RETENTION_DAYS in contact-secrets.env), but /privacy/ says ${days}`;
  }
  return null;
}
