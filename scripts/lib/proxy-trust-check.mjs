// The inner Caddy, ntfy and the contact handler take a visitor's address from
// X-Forwarded-For, and trust only the edge to hand one on. The header-contract
// test reads the Caddyfile and compose file before they ship; this reads what
// the running containers use, which no way of writing those files can hide: the
// inner Caddy's config as its admin API returns it after adapting the Caddyfile
// (environment placeholders, snippets and imports all resolved), and ntfy's
// command line, proxy environment and config file (eleventh drain review).

import { CLIENT_ADDRESS_HEADERS } from './caddyfile.mjs';

// Caddy expands placeholders in a header's name too, so `header_up
// {vars.fwd} ...` with fwd set to X-Forwarded-For forges it; a name holding
// one counts (fourteenth drain review). So does a wildcard: `replace` with
// `*` rewrites every field, and a delete of `X-Forwarded-*` takes the
// address with it (fifteenth).
const isClientAddressHeader = (name) => CLIENT_ADDRESS_HEADERS.includes(String(name).toLowerCase()) || /[{*]/.test(String(name));

/** Every request-header change in a Caddy JSON config that names a client-address header. */
function requestHeaderChanges(config) {
  const found = [];
  const walk = (node, where) => {
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, `${where}[${index}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    // A reverse_proxy with trust of its own takes an address from whoever is
    // in those ranges, whatever the server trusts (fifteenth drain review).
    if (node.handler === 'reverse_proxy' && node.trusted_proxies !== undefined) found.push(`${where}.trusted_proxies ${JSON.stringify(node.trusted_proxies)}`);
    const request = node.request;
    if (request && typeof request === 'object' && !Array.isArray(request)) {
      for (const operation of ['set', 'add', 'replace']) {
        for (const name of Object.keys(request[operation] ?? {})) {
          if (isClientAddressHeader(name)) found.push(`${where}.request.${operation} ${name}`);
        }
      }
      for (const name of Array.isArray(request.delete) ? request.delete : []) {
        if (isClientAddressHeader(name)) found.push(`${where}.request.delete ${name}`);
      }
    }
    for (const [key, child] of Object.entries(node)) walk(child, where ? `${where}.${key}` : key);
  };
  walk(config, '');
  return found;
}

/**
 * What in the inner Caddy's running config lets anyone but the edge choose a
 * visitor's address.
 * @param {string} text the admin API's /config/
 * @param {string} edge the edge's address as a CIDR, e.g. 172.18.255.254/32
 * @returns {string[]}
 */
export function caddyTrustProblems(text, edge) {
  let config;
  try {
    config = JSON.parse(String(text));
  } catch {
    return [`could not read the inner Caddy's config (got "${String(text).slice(0, 80)}")`];
  }
  const problems = [];
  const servers = Object.entries(config?.apps?.http?.servers ?? {});
  if (servers.length === 0) problems.push('the inner Caddy has no HTTP server');
  for (const [name, server] of servers) {
    const trusted = server?.trusted_proxies;
    if (trusted?.source !== 'static' || JSON.stringify(trusted?.ranges) !== JSON.stringify([edge])) {
      problems.push(`the inner Caddy's ${name} trusts ${JSON.stringify(trusted ?? null)}, not the edge alone`);
    }
    const headers = server?.client_ip_headers;
    if (headers !== undefined && !(Array.isArray(headers) && headers.length === 1 && /^x-forwarded-for$/i.test(headers[0]))) {
      problems.push(`the inner Caddy's ${name} reads the address from ${JSON.stringify(headers)}`);
    }
    const wrappers = (server?.listener_wrappers ?? []).map((wrapper) => wrapper?.wrapper).filter((wrapper) => wrapper !== 'tls');
    if (wrappers.length > 0) problems.push(`the inner Caddy's ${name} wraps its listener in ${wrappers.join(', ')}`);
  }
  problems.push(...requestHeaderChanges(config).map((change) => `the inner Caddy's config changes ${change}`));
  return problems;
}

/**
 * What in ntfy's running settings lets anyone but the edge choose a visitor's
 * address. A command-line flag beats the environment, which beats the config
 * file, so ntfy has to run as plain `ntfy serve`, with its proxy settings in
 * the environment and no config file at all: a grep for setting names missed
 * one a YAML escape spelled differently (fourteenth drain review).
 * @param {{ args: string, env: string, configLines: string }} probe
 *   args: `docker inspect --format '{{json .Config.Entrypoint}} {{json .Config.Cmd}}'`;
 *   env: the container's NTFY_BEHIND_PROXY, NTFY_PROXY_* and NTFY_CONFIG_FILE lines;
 *   configLines: the config files it would read that exist, one a line
 * @param {string} edge
 * @returns {string[]}
 */
export function ntfyTrustProblems({ args, env, configLines }, edge) {
  const problems = [];
  let command = null;
  try {
    const [entrypoint, cmd] = String(args).trim().split(/\s+(?=[[n])/).map((part) => JSON.parse(part));
    command = [...(entrypoint ?? []), ...(cmd ?? [])];
  } catch {
    problems.push(`could not read ntfy's command line (got "${String(args).slice(0, 80)}")`);
  }
  if (command && JSON.stringify(command) !== JSON.stringify(['ntfy', 'serve'])) {
    problems.push(`ntfy runs \`${command.join(' ')}\`, not \`ntfy serve\`, and a flag there beats its environment`);
  }
  const values = Object.fromEntries(
    String(env)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
  );
  if (values.NTFY_BEHIND_PROXY !== 'true') problems.push('ntfy is not told it sits behind a proxy');
  if (values.NTFY_PROXY_TRUSTED_HOSTS !== edge) problems.push(`ntfy trusts ${values.NTFY_PROXY_TRUSTED_HOSTS ?? 'no proxy'}, not the edge alone`);
  const header = values.NTFY_PROXY_FORWARDED_HEADER;
  if (header !== undefined && !/^x-forwarded-for$/i.test(header)) problems.push(`ntfy reads the address from ${header}`);
  if (values.NTFY_CONFIG_FILE !== undefined) problems.push(`ntfy reads a config file named by NTFY_CONFIG_FILE (${values.NTFY_CONFIG_FILE})`);
  const configured = String(configLines).split('\n').map((line) => line.trim()).filter(Boolean);
  if (configured.length > 0) problems.push(`ntfy has a config file (${configured.join(', ')}), whose settings apply wherever its environment is silent`);
  return problems;
}

/**
 * Each portfolio container's networks, from `docker inspect` lines of
 * "<container> <network> <network> ...", against the sets the compose file
 * gives them. The report sink parses reports from anyone, so it must not reach
 * the private network, and only portfolio-app may sit on the shared `web`.
 * @param {string} text
 * @param {Record<string, string[]>} expected
 */
export function networkProblems(text, expected) {
  const problems = [];
  const actual = Object.fromEntries(
    String(text)
      .split('\n')
      .map((line) => line.trim().split(/\s+/).filter(Boolean))
      .filter((parts) => parts.length > 0)
      .map(([name, ...networks]) => [name, networks.sort()]),
  );
  for (const [name, networks] of Object.entries(expected)) {
    const found = actual[name];
    if (!found) problems.push(`${name} isn't running`);
    else if (found.join(' ') !== [...networks].sort().join(' ')) problems.push(`${name} is on ${found.join(', ') || 'no network'}, not ${[...networks].sort().join(', ')}`);
  }
  return problems;
}
