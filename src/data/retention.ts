// What the site keeps about visitors, and for how long. /privacy/ states these
// numbers, and test/privacy-retention.test.mjs checks that every place which
// enforces one (the contact handler, the edge log roll, ntfy's cache, the CSP
// report store, the servers' own logs) is configured to exactly the same value.

/** Contact form submissions, deleted by the contact handler at start and daily. */
export const LEAD_RETENTION_DAYS = 365;

/** Lead notifications cached by the self-hosted ntfy (NTFY_CACHE_DURATION). */
export const NOTIFICATION_CACHE_HOURS = 72;

/** Edge access logs: rolled at midnight, rolled files deleted after this. */
export const ACCESS_LOG_RETENTION_DAYS = 30;

/** CSP violation reports: the store keeps this much, current file plus one rotated. */
export const CSP_REPORT_STORE_MB = 10;

/**
 * Each Caddy server's own log (its warnings and errors), which Docker keeps by
 * size: 3 files of 10 MB. portfolio-app sets that in deploy/vps/docker-compose.yml,
 * and the edge in its own compose file (Contabo-VPS-Ops). Every deploy reads
 * both containers' own settings back (scripts/lib/log-retention.mjs).
 */
export const SERVER_LOG_MB = 30;

/** When the privacy page last changed what it says. */
export const PRIVACY_EFFECTIVE_DATE = '2026-09-23';
