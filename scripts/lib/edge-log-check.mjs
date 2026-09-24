// /privacy/ says a portfolio request reaches only the portfolio access log. Two
// Caddy servers could also copy one into a container log that Docker keeps by
// size rather than age: the shared edge (Contabo-VPS-Ops owns its Caddyfile)
// and the portfolio's inner Caddy. A handler warning (a download the visitor
// cut short), an error (an upstream that went away) and the access entry for a
// Host that differs in case from the site address all go to the server's
// default logger with the whole request. So each default logger drops the
// visitor's address, port and headers, cuts the query string, and masks IPv4
// addresses in error text, and deploy-vps reads both running configs back
// through their admin APIs on every deploy.

/**
 * Filters every default logger needs, as Caddy's JSON config spells them. Some
 * entries carry the visitor's details at the top level rather than under
 * `request`: the "looking up info for HTTP challenge" warning, which both
 * servers log for any request to /.well-known/acme-challenge/, has
 * `remote_addr` (address and port), `uri` and `user_agent` (eleventh and
 * thirteenth drain reviews). `user_agent` and `referer` are also the fields
 * the portfolio block's log_append adds on the edge.
 */
export const REQUIRED_DELETIONS = Object.freeze([
  'request>remote_ip',
  'request>client_ip',
  'request>remote_port',
  'request>headers',
  'request>tls',
  'remote_addr',
  'remote_ip',
  'remote_port',
  'client_ip',
  'user_agent',
  'referer',
  'resp_headers',
]);

/** Fields holding the page a visitor asked for, whose query string is cut. */
export const QUERY_FIELDS = Object.freeze(['request>uri', 'uri']);

/** The edge also keeps the portfolio's error entries out of its log entirely. */
export const EDGE_EXCLUDES = Object.freeze(['http.log.error.portfolio']);

function applies(field, input) {
  if (field?.filter !== 'regexp' || typeof field.regexp !== 'string') return null;
  try {
    return input.replace(new RegExp(field.regexp, 'g'), field.value ?? '');
  } catch {
    return null;
  }
}

/**
 * Why a Caddy default logger would keep something that identifies a visitor,
 * or null.
 * @param {string} text the admin API's /config/logging/logs/default
 * @param {{ mustExclude?: readonly string[] }} [options]
 * @returns {string | null}
 */
export function defaultLogProblem(text, { mustExclude = [] } = {}) {
  let logger;
  try {
    logger = JSON.parse(String(text));
  } catch {
    return `could not read the default logger (got "${String(text).slice(0, 80)}")`;
  }
  if (!logger || typeof logger !== 'object') {
    return 'no default logger is configured, so Caddy writes whole requests to stderr';
  }
  if (String(logger.level ?? '').toLowerCase() === 'debug') {
    return 'the default logger runs at DEBUG, which logs every proxied request in full';
  }
  const encoder = logger.encoder ?? {};
  if (encoder.format !== 'filter') {
    return `the default logger's format is ${encoder.format ?? 'the plain default'}, not a filter that drops the request details`;
  }
  const fields = encoder.fields ?? {};
  const missing = REQUIRED_DELETIONS.filter((name) => fields[name]?.filter !== 'delete');
  for (const name of QUERY_FIELDS) {
    if (applies(fields[name], '/page?q=secret') !== '/page') missing.push(`the query string (${name})`);
  }
  // The `error` field, where reverse_proxy puts a failed write to the visitor.
  // A handler error's own text is the entry's message, which a filter encoder
  // can't touch, so there's nothing to check for it here.
  const masked = applies(fields.error, 'write tcp 172.18.255.254:443->203.0.113.9:51234: broken pipe');
  if (masked === null || /\d+\.\d+\.\d+\.\d+/.test(masked)) missing.push('addresses in error text (error)');
  if (missing.length > 0) return `the default logger's filter keeps ${missing.join(', ')}`;
  // An exclusion covers a logger and everything under it, so http.log.error
  // also keeps http.log.error.portfolio out.
  const excludes = Array.isArray(logger.exclude) ? logger.exclude.map(String) : [];
  const kept = mustExclude.filter((name) => !excludes.some((entry) => name === entry || name.startsWith(`${entry}.`)));
  if (kept.length > 0) return `the default logger doesn't exclude ${kept.join(' or ')}`;
  return null;
}
