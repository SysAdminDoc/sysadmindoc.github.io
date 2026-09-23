// /privacy/ names each thing the portfolio access log keeps, and the edge's log
// filter (deploy/vps/caddy-block.txt) drops the rest. A Caddy upgrade can add a
// field the filter doesn't know about, so deploy-vps reads the newest entries
// back from the running edge and checks them against this list.
export const ACCESS_LOG_FIELDS = Object.freeze([
  // zap's own: the level follows the status, and the logger name and message
  // are the same on every line.
  'level',
  'ts',
  'logger',
  'msg',
  'request.remote_ip',
  'request.client_ip',
  'request.proto',
  'request.method',
  'request.host',
  'request.uri',
  'duration',
  'size',
  'status',
  'user_agent',
  'referer',
]);

/** Dotted paths to every leaf of a parsed entry; an array counts as a leaf. */
export function keyPaths(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return prefix ? [prefix] : [];
  const keys = Object.keys(value);
  if (keys.length === 0) return prefix ? [prefix] : [];
  return keys.flatMap((key) => keyPaths(value[key], prefix ? `${prefix}.${key}` : key));
}

/**
 * Why the newest access-log entries hold something /privacy/ doesn't name, or null.
 * @param {string} text newline-separated JSON entries, as `tail` prints them
 * @returns {string | null}
 */
export function accessLogShapeProblem(text) {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "the edge's portfolio access log had no entries to check";
  const extra = new Set();
  const withQuery = new Set();
  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      return `could not read an entry of the edge's portfolio access log (got "${line.slice(0, 80)}")`;
    }
    for (const key of keyPaths(entry)) {
      if (!ACCESS_LOG_FIELDS.includes(key)) extra.add(key);
    }
    if (String(entry?.request?.uri ?? '').includes('?')) withQuery.add('the page');
    if (String(entry?.referer ?? '').includes('?')) withQuery.add('the referrer');
  }
  if (extra.size > 0) {
    return `the edge's portfolio access log keeps ${[...extra].sort().join(', ')}, which /privacy/ doesn't name`;
  }
  if (withQuery.size > 0) {
    return `the edge's portfolio access log keeps a query string in ${[...withQuery].join(' and ')}, which /privacy/ says it drops`;
  }
  return null;
}
