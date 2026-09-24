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
  return filterProblem(logger, { mustExclude, subject: 'the default logger', possessive: "the default logger's" });
}

/**
 * What a logger's filter lets through, worded for `subject`, or null.
 * @param {any} logger
 * @param {{ mustExclude?: readonly string[], subject: string, possessive: string }} options
 * @returns {string | null}
 */
function filterProblem(logger, { mustExclude = [], subject, possessive }) {
  if (String(logger.level ?? '').toLowerCase() === 'debug') {
    return `${subject} runs at DEBUG, which logs every proxied request in full`;
  }
  const encoder = logger.encoder ?? {};
  if (encoder.format !== 'filter') {
    return `${possessive} format is ${encoder.format ?? 'the plain default'}, not a filter that drops the request details`;
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
  if (missing.length > 0) return `${possessive} filter keeps ${missing.join(', ')}`;
  // An exclusion covers a logger and everything under it, so http.log.error
  // also keeps http.log.error.portfolio out. A logger that includes only
  // other loggers never sees the name at all.
  const covers = (entry, name) => name === entry || name.startsWith(`${entry}.`);
  const includes = Array.isArray(logger.include) ? logger.include.map(String) : [];
  const excludes = Array.isArray(logger.exclude) ? logger.exclude.map(String) : [];
  const kept = mustExclude.filter(
    (name) => (includes.length === 0 || includes.some((entry) => covers(entry, name))) && !excludes.some((entry) => covers(entry, name)),
  );
  if (kept.length > 0) return `${subject} doesn't exclude ${kept.join(' or ')}`;
  return null;
}

// Loggers that name one site's own access or error log, and nothing else,
// never see a portfolio request unless the site is the portfolio.
const OTHER_SITE_LOGGER = /^http\.log\.(?:access|error)\.(.+)$/;

/**
 * Why any logger that writes to the container's own output (stderr, stdout,
 * or no writer, which Caddy takes as stderr) would keep what identifies a
 * visitor, or null. The eighth drain review: the deploy read only `default`,
 * so a second logger on stderr would have passed while it wrote addresses.
 * Loggers writing to a file don't reach the container log; ones that take
 * only another site's access or error log never see a portfolio request.
 * @param {string} text the admin API's /config/logging/logs
 * @param {{ mustExclude?: readonly string[] }} [options]
 * @returns {string | null}
 */
export function loggingProblem(text, { mustExclude = [] } = {}) {
  let logs;
  try {
    logs = JSON.parse(String(text));
  } catch {
    return `could not read the logging config (got "${String(text).slice(0, 80)}")`;
  }
  if (!logs || typeof logs !== 'object' || Array.isArray(logs)) {
    return 'no loggers are configured, so Caddy writes whole requests to stderr';
  }
  const problem = defaultLogProblem(JSON.stringify(logs.default ?? null), { mustExclude });
  if (problem) return problem;
  for (const [name, logger] of Object.entries(logs)) {
    if (name === 'default' || !logger || typeof logger !== 'object') continue;
    const output = String(logger.writer?.output ?? 'stderr').toLowerCase();
    if (output !== 'stderr' && output !== 'stdout') continue;
    const includes = Array.isArray(logger.include) ? logger.include.map(String) : [];
    if (includes.length > 0 && includes.every((entry) => (OTHER_SITE_LOGGER.exec(entry)?.[1] ?? 'portfolio') !== 'portfolio')) continue;
    const found = filterProblem(logger, { mustExclude, subject: `the ${name} logger, which writes to the container's ${output},`, possessive: `the ${name} logger's` });
    if (found) return found.startsWith(`the ${name} logger's`) ? `${found}, and it writes to the container's ${output}` : found;
  }
  return null;
}
