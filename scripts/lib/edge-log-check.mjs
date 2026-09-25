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
  // certmagic's "served key authentication" entries name their peer here,
  // normally the CA's validator (fourteenth drain review).
  'remote',
  'resp_headers',
]);

// Error text as reverse_proxy and the TLS stack write it, with a visitor's
// address in each form: IPv4, IPv6 and IPv4-mapped. The `error` filter must
// leave no address in any.
const ERROR_SAMPLES = Object.freeze([
  'write tcp 172.18.255.254:443->203.0.113.9:51234: broken pipe',
  'write tcp [2001:db8::1]:443->[2001:db8:0:1::5]:51234: broken pipe',
  'read tcp [::ffff:203.0.113.9]:443: connection reset by peer',
]);
const leavesAddress = (text) => /\d+\.\d+\.\d+\.\d+/.test(text) || /[0-9a-f]{1,4}:[0-9a-f]{0,4}:/i.test(text) || /::[0-9a-f]/i.test(text);

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
 * Why a logger's level would log whole requests, worded for `subject`, or null.
 * @param {any} logger
 * @param {string} subject
 * @returns {string | null}
 */
function levelProblem(logger, subject) {
  const level = String(logger.level ?? '');
  if (level.toLowerCase() === 'debug') {
    return `${subject} runs at DEBUG, which logs every proxied request in full`;
  }
  // Caddy fills placeholders in the level first, so `{env.LVL}` can come out
  // as debug (seventeenth drain review).
  if (level.includes('{')) {
    return `${subject} takes its level from a placeholder (${level}), which could come out as DEBUG`;
  }
  // Caddy tees every entry to a logger's core beside its writer and encoder
  // (logging.go), so a core this check can't read could send the whole
  // request anywhere. Stock Caddy ships only `mock`, which drops it
  // (twenty-second drain review).
  if (logger.core !== undefined && logger.core !== null && logger.core?.module !== 'mock') {
    return `${subject} tees its entries to a core (${String(logger.core?.module ?? 'no module named')}) this check can't read`;
  }
  return null;
}

/**
 * What a logger's filter lets through, worded for `subject`, or null.
 * @param {any} logger
 * @param {{ mustExclude?: readonly string[], subject: string, possessive: string }} options
 * @returns {string | null}
 */
function filterProblem(logger, { mustExclude = [], subject, possessive }) {
  const level = levelProblem(logger, subject);
  if (level) return level;
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
  if (ERROR_SAMPLES.some((sample) => {
    const masked = applies(fields.error, sample);
    return masked === null || leavesAddress(masked);
  })) missing.push('addresses in error text (error)');
  if (missing.length > 0) return `${possessive} filter keeps ${missing.join(', ')}`;
  const kept = mustExclude.filter((name) => loggerAllowed(logger, name));
  if (kept.length > 0) return `${subject} doesn't exclude ${kept.join(' or ')}`;
  return null;
}

/**
 * Whether a logger with these include and exclude lists writes an entry
 * logged under `name`, as Caddy 2.11's CustomLog.loggerAllowed decides it
 * (logging.go): the longest matching include has to beat the longest matching
 * exclusion, `*` excludes every module's entries and `.` Caddy core's. The
 * fifteenth drain review: an include of `http` and `http.log.error.portfolio`
 * beside an exclusion of `http.log.error` still logs portfolio errors, and
 * `exclude ["*"]` keeps them all out.
 * @param {any} logger
 * @param {string} name
 */
export function loggerAllowed(logger, name) {
  const include = Array.isArray(logger?.include) ? logger.include.map(String) : [];
  const exclude = Array.isArray(logger?.exclude) ? logger.exclude.map(String) : [];
  if (include.length === 0 && exclude.length === 0) return true;
  // The dot keeps `foo.b` from matching `foo.bar`.
  const key = name !== '' && name !== '*' && name !== '.' ? `${name}.` : name;
  let longestAccept = 0;
  let longestReject = 0;
  if (include.length > 0) {
    for (const namespace of include) {
      if (key.startsWith(`${namespace}.`)) longestAccept = Math.max(longestAccept, namespace.length);
    }
    if (longestAccept === 0) return false;
  }
  if (exclude.length > 0) {
    for (const namespace of exclude) {
      if ((namespace === '*' && key !== '.') || (namespace === '.' && key === '.')) return false;
      if (key.startsWith(`${namespace}.`)) longestReject = Math.max(longestReject, namespace.length);
    }
    if (longestReject > longestAccept) return false;
  }
  return longestAccept > longestReject || (include.length === 0 && longestReject === 0);
}

/**
 * The file writers' filenames that could be a real file, for the deploy to
 * check inside the container: absolute, and with no placeholder, which Caddy
 * fills in only when it opens the file (filewriter.go).
 * @param {string} text the admin API's /config/logging/logs
 * @returns {string[]}
 */
export function fileWriterPaths(text) {
  let logs;
  try {
    logs = JSON.parse(String(text));
  } catch {
    return [];
  }
  if (!logs || typeof logs !== 'object') return [];
  return [
    ...new Set(
      Object.values(logs)
        .filter((logger) => logger?.writer?.output === 'file' && typeof logger.writer.filename === 'string')
        .map((logger) => logger.writer.filename)
        .filter((filename) => filename.startsWith('/') && !/[{\n\r\0]/.test(filename)),
    ),
  ];
}

/**
 * Prints each argument that resolves to a regular file outside /proc, /dev
 * and /sys, run with sh inside the container. `/dev/stderr`, `/proc/self/fd/1`
 * and a link to either resolve to a pipe, which isn't one.
 */
export const REAL_FILE_PROBE = 'for f; do r=$(readlink -f "$f") || continue; [ -f "$r" ] || continue; case "$r" in /proc/*|/dev/*|/sys/*) continue;; esac; printf "%s\\n" "$f"; done';

/** Where a logger's entries end up, in words, or null for a proven regular file. */
function destination(logger, realFiles) {
  const writer = logger.writer ?? {};
  const output = String(writer.output ?? 'stderr');
  if (output === 'file') {
    return realFiles.includes(writer.filename) ? null : `${writer.filename}, which isn't shown to be a regular file in the container`;
  }
  if (output === 'net') return `${writer.address} and, whenever that can't be reached, the container's stderr`;
  if (output === 'stderr' || output === 'stdout') return `the container's ${output}`;
  return `the ${output} writer`;
}

/**
 * Why any logger whose entries can reach the container's output, or leave
 * the server, would keep what identifies a visitor, or null. Only a logger
 * writing to a file proven a regular file in the container (`realFiles`), or
 * discarding everything, is exempt. The eighth drain review: the deploy read
 * only `default`, so a second logger on stderr passed while it wrote
 * addresses. The fifteenth: a `net` writer falls back to stderr, a file writer
 * can name `/dev/stderr`, and a logger that includes only another site's log
 * still gets portfolio requests through a catch-all site, a mixed-case Host or
 * `log_name`, so what a logger includes no longer exempts it. The twentieth:
 * a file logger at DEBUG keeps every proxied request's headers in that file,
 * so the level is checked on every logger that isn't discarding.
 * @param {string} text the admin API's /config/logging/logs
 * @param {{ mustExclude?: readonly string[], realFiles?: readonly string[] }} [options]
 * @returns {string | null}
 */
export function loggingProblem(text, { mustExclude = [], realFiles = [] } = {}) {
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
    // Caddy deletes a logger with the discard writer outright (logging.go).
    if (String(logger.writer?.output ?? 'stderr') === 'discard') continue;
    const where = destination(logger, realFiles);
    if (where === null) {
      const level = levelProblem(logger, `the ${name} logger, which writes to ${logger.writer.filename},`);
      if (level) return level;
      continue;
    }
    const found = filterProblem(logger, { mustExclude, subject: `the ${name} logger, which writes to ${where},`, possessive: `the ${name} logger's` });
    if (found) return found.startsWith(`the ${name} logger's`) ? `${found}, and it writes to ${where}` : found;
  }
  return null;
}
