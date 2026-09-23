// /privacy/ says a portfolio request reaches only the portfolio access log. The
// edge Caddy's default logger (stderr, which Docker keeps by size rather than
// age) would otherwise also get each 5xx error entry, with the visitor's
// address and every request header. Keeping them out rests on the shared edge
// Caddyfile, which Contabo-VPS-Ops owns, so deploy-vps reads the running
// default logger back through the edge's admin API on every deploy.
export const REQUIRED_EDGE_EXCLUDES = Object.freeze(['http.log.access.portfolio', 'http.log.error.portfolio']);

/**
 * Why the edge's default logger would let portfolio requests through, or null.
 * @param {string} text the admin API's /config/logging/logs/default/exclude
 * @returns {string | null}
 */
export function edgeLogExclusionProblem(text) {
  let excludes;
  try {
    excludes = JSON.parse(String(text));
  } catch {
    return `could not read the edge's default logger (got "${String(text).slice(0, 80)}")`;
  }
  if (!Array.isArray(excludes)) return "the edge's default logger has no exclude list";
  const missing = REQUIRED_EDGE_EXCLUDES.filter((name) => !excludes.includes(name));
  if (missing.length === 0) return null;
  return `the edge's default logger doesn't exclude ${missing.join(' or ')}, so portfolio requests reach the container log that /privacy/ says they stay out of`;
}
