// RFC 9116 makes Expires mandatory, and the endpoint audit fails the build once
// it has passed. Left alone, that stops the nightly on a date nobody chose, the
// same timer failure the stale override pins caused in September. So the audit
// and the nightly both warn this many days ahead.
export const SECURITY_TXT_WARN_DAYS = 60;

const DAY_MS = 86_400_000;

/**
 * The Expires value of a security.txt body, or null when it has none.
 * @param {string} text
 * @returns {string | null}
 */
export function securityTxtExpiresValue(text) {
  const match = String(text).match(/^Expires:[ \t]*(\S[^\r\n]*?)[ \t]*\r?$/m);
  return match ? match[1] : null;
}

/**
 * Judge a security.txt Expires value against `now`.
 * @param {string} value
 * @param {Date} [now]
 * @returns {{ level: 'ok' | 'warn' | 'fail', message: string | null, daysLeft: number | null }}
 */
export function securityTxtExpiry(value, now = new Date()) {
  const expires = new Date(value);
  if (Number.isNaN(expires.getTime())) {
    return { level: 'fail', message: `security.txt Expires "${value}" is not a date.`, daysLeft: null };
  }
  const msLeft = expires.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / DAY_MS);
  if (msLeft <= 0) {
    return { level: 'fail', message: `security.txt Expires date "${value}" is in the past.`, daysLeft };
  }
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (expires > oneYearFromNow) {
    return {
      level: 'fail',
      message: `security.txt Expires date "${value}" is more than 1 year from now (RFC 9116 guidance).`,
      daysLeft,
    };
  }
  if (msLeft <= SECURITY_TXT_WARN_DAYS * DAY_MS) {
    return {
      level: 'warn',
      message: `security.txt expires ${value}, ${daysLeft} day(s) from now. Move Expires in public/.well-known/security.txt forward (at most a year out) before then, or the endpoint audit fails the build.`,
      daysLeft,
    };
  }
  return { level: 'ok', message: null, daysLeft };
}
