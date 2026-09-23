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

/** Filters every default logger needs, as Caddy's JSON config spells them. */
export const REQUIRED_DELETIONS = Object.freeze([
  'request>remote_ip',
  'request>client_ip',
  'request>remote_port',
  'request>headers',
  'request>tls',
  'resp_headers',
]);

/** The edge also keeps the portfolio's error entries out of its log entirely. */
export const EDGE_EXCLUDES = Object.freeze(['http.log.error.portfolio']);

/**
 * The portfolio block's log_append fields ride along on every portfolio entry,
 * so they reach the edge's default logger with a mixed-case Host too.
 */
export const EDGE_DELETIONS = Object.freeze(['user_agent', 'referer']);

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
 * @param {{ mustExclude?: readonly string[], mustDelete?: readonly string[] }} [options]
 * @returns {string | null}
 */
export function defaultLogProblem(text, { mustExclude = [], mustDelete = [] } = {}) {
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
  const missing = [...REQUIRED_DELETIONS, ...mustDelete].filter((name) => fields[name]?.filter !== 'delete');
  if (applies(fields['request>uri'], '/page?q=secret') !== '/page') missing.push('the query string (request>uri)');
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
