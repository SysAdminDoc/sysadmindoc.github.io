// The inner Caddy and ntfy take a visitor's address from X-Forwarded-For, and
// trust exactly one hop to have appended it: the shared edge Caddy, at the
// address its compose file (Contabo-VPS-Ops) pins on the `web` network. About
// twenty other containers share that network, and trusting its whole range let
// any of them hand on a forged visitor address. The pin sits at the top of the
// range because Docker gives dynamic addresses out from the bottom, so a
// container that starts ahead of the edge after a reboot can't take it.
export const EDGE_PROXY_ADDRESS = '172.18.255.254';

/**
 * Why the edge's `web` endpoint isn't on the pinned address, or null.
 * @param {string} text `docker inspect caddy --format '{{json .NetworkSettings.Networks.web}}'`
 * @returns {string | null}
 */
export function edgeAddressProblem(text) {
  let endpoint;
  try {
    endpoint = JSON.parse(String(text));
  } catch {
    return `could not read the edge's address on the web network (got "${String(text).slice(0, 80)}")`;
  }
  if (!endpoint || typeof endpoint !== 'object') return "the edge isn't on the web network";
  const pinned = endpoint.IPAMConfig?.IPv4Address || null;
  if (pinned !== EDGE_PROXY_ADDRESS) {
    return `the edge's compose file ${pinned ? `pins ${pinned}` : 'pins no address'} on the web network, not ${EDGE_PROXY_ADDRESS}, the only address the portfolio trusts to hand on a visitor's`;
  }
  if (endpoint.IPAddress !== EDGE_PROXY_ADDRESS) {
    return `the edge is at ${endpoint.IPAddress || 'no address'} on the web network, not its pinned ${EDGE_PROXY_ADDRESS}`;
  }
  return null;
}
