import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { parse as parseYaml } from 'yaml';
import { caddyfileLines, clientAddressHeaderWrites, expandEnvDefaults, parseCaddyfile } from '../scripts/lib/caddyfile.mjs';
import { EDGE_PROXY_ADDRESS } from '../scripts/lib/edge-address.mjs';

const root = process.cwd();

test('source header intents stay separate from the deployed edge contract', async () => {
  const [audit, helpers, liveSmoke] = await Promise.all([
    fs.readFile(path.join(root, 'scripts', 'audit-public-endpoints.mjs'), 'utf8'),
    fs.readFile(path.join(root, 'src', 'data', 'endpoint-headers.ts'), 'utf8'),
    fs.readFile(path.join(root, 'scripts', 'smoke-live-site.mjs'), 'utf8'),
  ]);

  assert.match(audit, /const endpointHeaderIntents = \[/);
  assert.match(audit, /source header intents:/);
  assert.match(audit, /static build serializes endpoint bodies without their Response/);
  assert.doesNotMatch(audit, /generatedEndpointCacheControl|generatedImageCacheControl/);
  assert.doesNotMatch(audit, /\bcontentType:|\bcacheControl:/);

  // The source constants are intents only — a static build drops endpoint
  // Response headers — so the file must keep pointing at Caddy as the owner of
  // the deployed contract, and name the Caddyfile that has to stay in step.
  assert.match(helpers, /deployed contract\s+ \* lives in Caddy/);
  assert.match(helpers, /deploy\/vps\/Caddyfile/);
  assert.match(liveSmoke, /summary\.push\('live cache-control: max-age=600'\)/);

  // Cache-Control for HTML, social cards, and hashed assets was lost in the move
  // off GitHub Pages and only exists at the edge now, so the smoke must assert
  // each class rather than trusting the Caddyfile to stay correct.
  assert.match(liveSmoke, /async function checkCachePolicy\(/);
  assert.match(liveSmoke, /await checkCachePolicy\(baseUrl, summary, homepage\.body\)/);
  for (const directive of ['max-age=0', 'max-age=86400', 'max-age=31536000']) {
    assert.match(liveSmoke, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('live smoke verifies the edge security headers the VPS Caddy injects', async () => {
  const liveSmoke = await fs.readFile(path.join(root, 'scripts', 'smoke-live-site.mjs'), 'utf8');

  // The security headers are the reason the site moved off GitHub Pages, so the
  // live smoke must assert every one of them or a Caddy regression goes unnoticed.
  assert.match(liveSmoke, /const REQUIRED_SECURITY_HEADERS = \[/);
  for (const header of [
    'strict-transport-security',
    'x-content-type-options',
    'referrer-policy',
    'x-frame-options',
    'permissions-policy',
    'cross-origin-opener-policy',
  ]) {
    assert.match(liveSmoke, new RegExp(`name: '${header}'`));
  }
  // Permissions-Policy must lock down the sensitive capabilities by name.
  for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
    assert.match(liveSmoke, new RegExp(`'${feature}'`));
  }
  assert.match(liveSmoke, /await checkSecurityHeaders\(baseUrl, summary\)/);
});

test('CSP reporting stays first-party, bounded, and live-smoke gated', async () => {
  const [smoke, edgeCaddy, internalCaddy, compose, reporter] = await Promise.all([
    fs.readFile(path.join(root, 'scripts', 'smoke-live-site.mjs'), 'utf8'),
    fs.readFile(path.join(root, 'deploy', 'vps', 'caddy-block.txt'), 'utf8'),
    fs.readFile(path.join(root, 'deploy', 'vps', 'Caddyfile'), 'utf8'),
    fs.readFile(path.join(root, 'deploy', 'vps', 'docker-compose.yml'), 'utf8'),
    fs.readFile(path.join(root, 'deploy', 'vps', 'csp-report-server.mjs'), 'utf8'),
  ]);

  assert.match(edgeCaddy, /Reporting-Endpoints\s+"csp-endpoint=\\"https:\/\/portfolio\.getparkerai\.com\/csp-report\\""/);
  assert.match(internalCaddy, /reverse_proxy csp-reporter:8080/);
  assert.match(internalCaddy, /Content-Security-Policy "\{\$CSP_POLICY\}"/);
  assert.match(compose, /CSP_POLICY: \$\{CSP_POLICY:\?/);
  assert.match(compose, /csp-report-server\.mjs/);
  assert.match(compose, /test: \["CMD", "wget", "-q", "-O", "\/dev\/null", "http:\/\/127\.0\.0\.1:8080\/healthz"\]/);
  assert.match(reporter, /maxBodyBytes: 64 \* 1024/);
  assert.match(reporter, /maxLogBytes: 5 \* 1024 \* 1024/);
  assert.match(reporter, /maxRequestsPerMinute: 120/);
  assert.match(reporter, /X-CSP-Report-Stored/);
  assert.match(smoke, /await checkCspReportEndpoint\(baseUrl, summary\)/);
  assert.match(smoke, /Reporting-Endpoints/);
  assert.match(smoke, /report-to\\s\+csp-endpoint/);
});

test('deploy extracts CSP content without treating policy apostrophes as delimiters', async () => {
  const deploy = await fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  // The builder moved to a shared module so the Playwright preview can send the
  // same header; the deploy must still stamp its value.
  const builder = await fs.readFile(path.join(root, 'scripts', 'lib', 'csp-header.mjs'), 'utf8');

  assert.match(deploy, /import \{ buildCspHeaderValue \} from '\.\/lib\/csp-header\.mjs';/);
  assert.match(deploy, /const policy = buildCspHeaderValue\(distDir\);/);
  assert.ok(builder.includes('.match(/<meta\\b[^>]*>/gi)'));
  assert.ok(builder.includes(".match(/\\bcontent\\s*=\\s*([\"'])([\\s\\S]*?)\\1/i)"));
  assert.ok(builder.includes('decodeHtmlAttribute(contentMatch[2])'));
});

test('the deployed CSP header carries frame-ancestors, which a meta policy cannot', async () => {
  const deploy = await fs.readFile(path.join(root, 'scripts', 'lib', 'csp-header.mjs'), 'utf8');
  const smoke = await fs.readFile(path.join(root, 'scripts', 'smoke-live-site.mjs'), 'utf8');
  const base = await fs.readFile(path.join(root, 'src', 'layouts', 'Base.astro'), 'utf8');

  // frame-ancestors is ignored in a <meta> policy, so it belongs only on the
  // stamped response header. Putting it in the meta source would be inert and
  // would make the two policies disagree.
  assert.match(deploy, /frame-ancestors 'none'/);
  assert.match(deploy, /the meta policy already declares frame-ancestors/);
  assert.doesNotMatch(base, /frame-ancestors/);

  // Without the smoke assertion, an older csp.env on the box would silently
  // drop the directive and clickjacking defence would fall back to XFO alone.
  assert.ok(
    smoke.includes("The deployed CSP header is missing frame-ancestors 'none'"),
    'the live smoke must fail when the deployed header drops frame-ancestors',
  );
});

/** A compose service's environment as a map, from either form compose accepts. */
function serviceEnvironment(service) {
  const environment = service?.environment ?? {};
  if (Array.isArray(environment)) {
    return Object.fromEntries(
      environment.map((entry) => {
        const [name, ...value] = String(entry).split('=');
        return [name, value.length > 0 ? value.join('=') : null];
      }),
    );
  }
  return Object.fromEntries(Object.entries(environment).map(([name, value]) => [name, value === null ? null : String(value)]));
}

/**
 * A command string split the way compose splits one (go-shellwords): on
 * whitespace, with single quotes taken raw, and double quotes and a backslash
 * outside single quotes escaping what follows. Splitting on whitespace alone
 * kept the quotes in `--proxy-forwarded-header "X-Forwarded-For"` and failed a
 * harmless setting (eleventh drain review).
 */
function shellSplit(command) {
  const words = [];
  let word = null;
  let quote = null;
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (quote === "'") {
      if (char === "'") quote = null;
      else word += char;
      continue;
    }
    if (char === '\\' && index + 1 < command.length) {
      word = (word ?? '') + command[index + 1];
      index += 1;
      continue;
    }
    if (quote === '"') {
      if (char === '"') quote = null;
      else word += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      word = word ?? '';
      continue;
    }
    if (/\s/.test(char)) {
      if (word !== null) words.push(word);
      word = null;
      continue;
    }
    word = (word ?? '') + char;
  }
  if (quote) throw new Error(`an unclosed ${quote} in ${command}`);
  if (word !== null) words.push(word);
  return words;
}

/** A service's entrypoint and command as separate arguments, from either form. */
function serviceArgs(service) {
  return [service?.entrypoint, service?.command].flatMap((value) =>
    Array.isArray(value) ? value.map(String) : typeof value === 'string' ? shellSplit(value) : [],
  );
}

/**
 * Every way the inner Caddyfile and the compose file let someone other than the
 * edge choose the address ntfy and the contact handler see, as the files are
 * parsed rather than as they happen to be spelled. The seventh drain review
 * reopened the forgery with an upstream header copying X-Forwarded-For and with
 * ntfy reading X-Real-IP; the eighth got past the old patterns with quotes, a
 * request_header, a command-line flag and a listener wrapper.
 */
function trustProblems(caddyfile, compose) {
  const edge = `${EDGE_PROXY_ADDRESS}/32`;
  const problems = [];
  // Caddy puts an unset variable's default in place before it lexes, so a
  // default can be a directive or a header name (eleventh drain review).
  const nodes = parseCaddyfile(expandEnvDefaults(caddyfile));
  const [global] = nodes;
  // Without trusted_proxies the inner Caddy replaces the edge's X-Forwarded-For
  // with the edge's own address, and every visitor shares one set of ntfy and
  // handler limits. Trusting more than the edge lets any of the twenty or so
  // containers on `web` pass on a forged address, and so does a listener
  // wrapper such as proxy_protocol, which lets a client name its own address.
  if (!global || global.tokens.length > 0 || !global.children) {
    problems.push('the file does not open with the global options block');
  } else {
    const options = global.children.map((node) => node.tokens[0]).sort();
    if (options.join(',') !== 'log,servers') problems.push(`the global options are ${options.join(', ')}`);
    const servers = global.children.find((node) => node.tokens[0] === 'servers');
    if (servers && servers.tokens.length !== 1) problems.push(`the servers options apply to ${servers.tokens.slice(1).join(' ')} only`);
    const inside = (servers?.children ?? []).map((node) => node.tokens.join(' '));
    if (inside.join(';') !== `trusted_proxies static ${edge}`) problems.push(`the servers options hold ${inside.join('; ') || 'nothing'}`);
  }
  const lines = [...caddyfileLines(nodes)];
  const count = (name) => lines.filter((node) => node.tokens[0] === name).length;
  if (count('trusted_proxies') !== 1) problems.push(`trusted_proxies appears ${count('trusted_proxies')} times`);
  for (const name of ['client_ip_headers', 'listener_wrappers', 'proxy_protocol']) {
    if (count(name) > 0) problems.push(`${name} is set`);
  }
  problems.push(...clientAddressHeaderWrites(nodes).map((write) => `the Caddyfile sets ${write}`));
  // What this reader can't follow, it refuses: a snippet (its arguments fill
  // in a header name only at import), an import of anything but the generated
  // redirects (which hold redir lines alone), and a line whose directive is an
  // environment placeholder with no default, whose value is on the server.
  for (const node of lines) {
    const [first = '', ...rest] = node.tokens;
    if (/^\(.*\)$/.test(first)) problems.push(`the Caddyfile defines the snippet ${first} (line ${node.line})`);
    if (first === 'import' && rest.join(' ') !== 'project-redirects.caddy') problems.push(`the Caddyfile imports ${rest.join(' ')} (line ${node.line})`);
    if (first.includes('{$')) problems.push(`the Caddyfile has a directive named by ${first} (line ${node.line})`);
  }

  // ntfy strips the edge's address from X-Forwarded-For and takes the next one
  // as the visitor's. It reads its settings from its command line, then its
  // environment, then a config file.
  const services = parseYaml(compose)?.services ?? {};
  for (const [name, service] of Object.entries(services)) {
    // extends pulls a service's settings, networks included, from another
    // definition this reader doesn't follow.
    if (service?.extends !== undefined) problems.push(`the ${name} service extends another`);
  }
  const ntfy = services.ntfy;
  const environment = serviceEnvironment(ntfy);
  const header = environment.NTFY_PROXY_FORWARDED_HEADER;
  if (header != null && !/^x-forwarded-for$/i.test(header)) problems.push(`ntfy reads the address from ${header}`);
  if (environment.NTFY_BEHIND_PROXY !== 'true') problems.push('ntfy is not told it sits behind a proxy');
  if (environment.NTFY_PROXY_TRUSTED_HOSTS !== edge) problems.push(`ntfy trusts ${environment.NTFY_PROXY_TRUSTED_HOSTS}`);
  if (environment.NTFY_CONFIG_FILE !== undefined) problems.push(`ntfy reads the config file ${environment.NTFY_CONFIG_FILE}`);
  const args = serviceArgs(ntfy);
  args.forEach((arg, index) => {
    // ntfy takes each of these with dashes or underscores, and -P for behind-proxy.
    const flag = /^--?(proxy[-_]forwarded[-_]header|proxy[-_]trusted[-_]hosts|behind[-_]proxy|P|config|c)(?:=(.*))?$/.exec(arg);
    if (!flag) return;
    const value = flag[2] ?? args[index + 1] ?? '';
    if (/^proxy[-_]forwarded[-_]header$/.test(flag[1]) && /^x-forwarded-for$/i.test(value)) return;
    problems.push(`ntfy is started with ${arg}${flag[2] === undefined ? ` ${value}` : ''}`);
  });
  for (const volume of ntfy?.volumes ?? []) {
    const target = typeof volume === 'string' ? volume.split(':')[1] ?? '' : String(volume?.target ?? '');
    if (/^\/etc\/ntfy\b|\.ya?ml$/.test(target)) problems.push(`ntfy mounts a config file at ${target}`);
  }
  return problems;
}

test('ntfy sees each visitor\'s own address, and only the edge can hand one on', async () => {
  const [caddyfile, compose, deploy, provision] = await Promise.all([
    fs.readFile(path.join(root, 'deploy', 'vps', 'Caddyfile'), 'utf8'),
    fs.readFile(path.join(root, 'deploy', 'vps', 'docker-compose.yml'), 'utf8'),
    fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8'),
    fs.readFile(path.join(root, 'deploy', 'vps', 'provision-notify-secrets.sh'), 'utf8'),
  ]);
  assert.deepEqual(trustProblems(caddyfile, compose), []);
  // ntfy's env file is written on the server by the provision script, and it
  // could set the proxy settings too. It writes only accounts and tokens.
  const keys = [...new Set(provision.match(/\bNTFY_[A-Z_]+/g) ?? [])];
  assert.ok(keys.length > 0, 'the provision script was read');
  assert.deepEqual(keys.filter((key) => /PROXY|FORWARD|TRUSTED/.test(key)), []);

  // Both lists name the address the edge's compose file pins, so the deploy
  // stops before shipping them if the edge is anywhere else.
  const checked = deploy.indexOf('\nverifyEdgeAddress();');
  const shipped = deploy.indexOf("path.join(root, 'deploy', 'vps', 'docker-compose.yml')");
  assert.ok(checked > 0 && shipped > 0, 'both steps must exist');
  assert.ok(checked < shipped, 'the edge address is checked before the trust settings ship');
});

test('each way the reviews reopened the forgery fails the trust check', async () => {
  const [caddyfile, compose] = await Promise.all([
    fs.readFile(path.join(root, 'deploy', 'vps', 'Caddyfile'), 'utf8'),
    fs.readFile(path.join(root, 'deploy', 'vps', 'docker-compose.yml'), 'utf8'),
  ]);
  const edge = `${EDGE_PROXY_ADDRESS}/32`;
  const inCaddyfile = (find, replace) => {
    assert.ok(caddyfile.includes(find), `the Caddyfile still has ${JSON.stringify(find)}`);
    return [caddyfile.replace(find, replace), compose];
  };
  const inCompose = (find, replace) => {
    assert.ok(compose.includes(find), `the compose file still has ${JSON.stringify(find)}`);
    return [caddyfile, compose.replace(find, replace)];
  };
  const variants = {
    'a quoted header_up copying the incoming X-Forwarded-For': inCaddyfile(
      'reverse_proxy ntfy:80 {',
      'reverse_proxy ntfy:80 {\n\t\theader_up "X-Forwarded-For" "{http.request.header.X-Forwarded-For}"',
    ),
    'a request_header taking X-Real-IP': inCaddyfile('\troot * /srv', '\troot * /srv\n\trequest_header X-Forwarded-For {http.request.header.X-Real-IP}'),
    // The eleventh review's five, each of which `caddy adapt` 2.11.4 turns into
    // headers.request.set X-Forwarded-For = {http.request.header.X-Real-IP}.
    'a header name from an unset variable\'s default': inCaddyfile(
      'reverse_proxy ntfy:80 {',
      'reverse_proxy ntfy:80 {\n\t\theader_up {$NOT_SET:X-Forwarded-For} {http.request.header.X-Real-IP}',
    ),
    'a header name from a snippet argument': inCaddyfile(
      'reverse_proxy ntfy:80 {',
      'reverse_proxy ntfy:80 {\n\t\timport fwd X-Forwarded-For {http.request.header.X-Real-IP}',
    ).map((text, index) => (index === 0 ? `(fwd) {\n\theader_up {args[0]} {args[1]}\n}\n\n${text}` : text)),
    'a \\\\ before a quote, which closes it': inCaddyfile(
      'reverse_proxy ntfy:80 {',
      'reverse_proxy ntfy:80 {\n\t\theader_up X-Note "a\\\\"\n\t\theader_up X-Forwarded-For {http.request.header.X-Real-IP}\n\t\t# "',
    ),
    'a continued line': inCaddyfile('reverse_proxy ntfy:80 {', 'reverse_proxy ntfy:80 {\n\t\theader_up \\\n\t\t\tX-Forwarded-For {http.request.header.X-Real-IP}'),
    'a heredoc holding a quote': inCaddyfile(
      'reverse_proxy ntfy:80 {',
      'reverse_proxy ntfy:80 {\n\t\theader_up X-Note <<EOF\n\t\t"\n\t\tEOF\n\t\theader_up X-Forwarded-For {http.request.header.X-Real-IP}',
    ),
    'a proxy_protocol listener wrapper on one listener': inCaddyfile(
      '\tservers {',
      '\tservers :80 {\n\t\tlistener_wrappers {\n\t\t\tproxy_protocol {\n\t\t\t\tallow 0.0.0.0/0\n\t\t\t}\n\t\t}\n\t}\n\tservers {',
    ),
    'trust in every private range': inCaddyfile(`trusted_proxies static ${edge}`, 'trusted_proxies static private_ranges'),
    'the address read from another header': inCaddyfile(`trusted_proxies static ${edge}`, `trusted_proxies static ${edge}\n\t\tclient_ip_headers X-Real-IP`),
    'ntfy told to read X-Real-IP on its command line': inCompose('command: ["serve"]', 'command: ["serve", "--proxy-forwarded-header", "X-Real-IP"]'),
    'ntfy told to read X-Real-IP in its environment': inCompose('NTFY_BEHIND_PROXY: "true"', 'NTFY_BEHIND_PROXY: "true"\n      NTFY_PROXY_FORWARDED_HEADER: X-Real-IP'),
    'ntfy trusting every private range': inCompose(`NTFY_PROXY_TRUSTED_HOSTS: "${edge}"`, 'NTFY_PROXY_TRUSTED_HOSTS: "172.16.0.0/12"'),
    'ntfy reading a config file': inCompose('      - ./ntfy-data:/var/lib/ntfy', '      - ./ntfy-data:/var/lib/ntfy\n      - ./server.yml:/etc/ntfy/server.yml:ro'),
    'ntfy told to read X-Real-IP with an underscore flag': inCompose('command: ["serve"]', 'command: ["serve", "--proxy_forwarded_header", "X-Real-IP"]'),
    'ntfy told to trust everyone with an underscore flag': inCompose('command: ["serve"]', 'command: ["serve", "--proxy_trusted_hosts=0.0.0.0/0"]'),
    'ntfy pointed at a config file in its data volume': inCompose('NTFY_BEHIND_PROXY: "true"', 'NTFY_BEHIND_PROXY: "true"\n      NTFY_CONFIG_FILE: /var/lib/ntfy/server.yml'),
    'the report sink extending another definition': inCompose(
      '  csp-reporter:\n',
      '  csp-reporter:\n    extends:\n      file: ./reporter-base.yml\n      service: reporter\n',
    ),
  };
  for (const [label, [variantCaddyfile, variantCompose]] of Object.entries(variants)) {
    assert.ok(trustProblems(variantCaddyfile, variantCompose).length > 0, label);
  }
  // And two harmless settings the first version failed: `header` changes only
  // responses, and compose drops the quotes around a flag's value.
  const harmless = {
    'a header block deleting Forwarded from responses': inCaddyfile('\troot * /srv', '\troot * /srv\n\theader {\n\t\t-Forwarded\n\t}'),
    'a quoted X-Forwarded-For flag value': inCompose('command: ["serve"]', 'command: serve --proxy-forwarded-header "X-Forwarded-For"'),
  };
  for (const [label, [variantCaddyfile, variantCompose]] of Object.entries(harmless)) {
    assert.deepEqual(trustProblems(variantCaddyfile, variantCompose), [], label);
  }
  // A default takes the placeholder's place as Caddy puts it there, and a
  // placeholder without one is left for the checks above to refuse.
  assert.equal(expandEnvDefaults('header_up {$A:X-Forwarded-For} {$B} {$C:}'), 'header_up X-Forwarded-For {$B} ');
  // Compose's list form for the environment reads the same as its map form.
  assert.deepEqual(serviceEnvironment({ environment: ['NTFY_PROXY_FORWARDED_HEADER=X-Real-IP', 'A=b=c', 'EMPTY'] }), {
    NTFY_PROXY_FORWARDED_HEADER: 'X-Real-IP',
    A: 'b=c',
    EMPTY: null,
  });
  assert.deepEqual(serviceArgs({ entrypoint: 'ntfy', command: 'serve --proxy-forwarded-header=X-Real-IP' }), ['ntfy', 'serve', '--proxy-forwarded-header=X-Real-IP']);
  assert.deepEqual(serviceArgs({ command: `serve --a "b c" 'd "e"' f\\ g ""` }), ['serve', '--a', 'b c', 'd "e"', 'f g', '']);
});

/**
 * Each compose service's networks, as compose itself reads them: a list, or a
 * mapping whose values may be settings, `{}`, `~` or null. A service with none
 * joins the project's default network, which reads here as no network at all.
 */
function composeServiceNetworks(compose) {
  const services = parseYaml(compose)?.services ?? {};
  return Object.fromEntries(
    Object.entries(services).map(([name, service]) => {
      const networks = service?.networks;
      const names = Array.isArray(networks) ? networks.map(String) : networks && typeof networks === 'object' ? Object.keys(networks) : [];
      return [name, names];
    }),
  );
}

/** The top-level `networks:` mapping: each name and its settings. */
function composeTopNetworks(compose) {
  const networks = parseYaml(compose)?.networks ?? {};
  return Object.fromEntries(Object.entries(networks).map(([name, settings]) => [name, settings ?? {}]));
}

test('the compose network reader sees every way to write a network', () => {
  // The seventh drain review put a service on `web` with `- web # shared` and
  // with `- "web"`, and the eighth with `web: ~`, `web: null` and `-   web`.
  // The line-based reader missed each in turn; this one is compose's own YAML.
  const compose = (lines) => `services:\n  app:\n    image: x\n    networks:\n${lines}\n\nnetworks:\n  web:\n    external: true\n`;
  for (const lines of [
    '      - web # shared',
    '      - "web"',
    "      - 'web'",
    '      -   web',
    '      web:\n        ipv4_address: 172.18.0.9',
    '      web: {}',
    '      web: ~',
    '      web: null',
    '      web:',
  ]) {
    assert.deepEqual(composeServiceNetworks(compose(lines)), { app: ['web'] }, lines);
  }
  assert.deepEqual(composeTopNetworks(compose('      - web')), { web: { external: true } });
  assert.deepEqual(composeServiceNetworks('services:\n  app:\n    image: x\n'), { app: [] }, 'no networks means the default one');
});

test('only portfolio-app joins the shared web network, and each service sits on its own set', async () => {
  const compose = await fs.readFile(path.join(root, 'deploy', 'vps', 'docker-compose.yml'), 'utf8');

  // About twenty other containers share `web`. Any service on it can be
  // reached by every one of them without going through portfolio-app's
  // routes. The report sink parses reports from anyone on the internet, so it
  // gets a network of its own: on the private one it could reach ntfy and the
  // contact handler, which both take a visitor's address from X-Forwarded-For.
  const services = composeServiceNetworks(compose);
  const sets = Object.fromEntries(Object.keys(services).sort().map((name) => [name, [...services[name]].sort()]));
  assert.deepEqual(sets, {
    'contact-handler': ['portfolio-private'],
    'csp-reporter': ['portfolio-reports'],
    ntfy: ['portfolio-private'],
    'portfolio-app': ['portfolio-private', 'portfolio-reports', 'web'],
  });
  assert.deepEqual(composeTopNetworks(compose), {
    web: { external: true },
    'portfolio-private': { internal: true },
    'portfolio-reports': { internal: true },
  }, 'both portfolio networks have no route out, and there is no other');
  // network_mode puts a service on the host's network or another container's,
  // whatever its networks say.
  for (const [name, service] of Object.entries(parseYaml(compose).services)) {
    assert.equal(service.network_mode, undefined, `${name} sets network_mode`);
  }
});

test('a fresh server receives the secrets script before the deploy checks for its output', async () => {
  const deploy = await fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');

  // The check stops the deploy and says to run provision-notify-secrets.sh on
  // the server, so the script has to be there already on a first deploy.
  const shipped = deploy.indexOf("path.join(root, 'deploy', 'vps', 'provision-notify-secrets.sh')");
  const checked = deploy.indexOf('test -s ntfy-auth.env && test -s contact-secrets.env');
  assert.ok(shipped > 0 && checked > 0, 'both steps must exist');
  assert.ok(shipped < checked, 'the script ships before the secrets check');
  assert.equal(deploy.split('provision-notify-secrets.sh').length - 1, 2, 'shipped once, and named once in the fix message');
});

test('the Caddy image is pinned to an exact patch and the deploy verifies it', async () => {
  const compose = await fs.readFile(path.join(root, 'deploy', 'vps', 'docker-compose.yml'), 'utf8');
  const deploy = await fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');

  // A floating minor tag reports "2.11" while the box sits on whatever patch was
  // last pulled, because `up --force-recreate` reuses the local image.
  const image = compose.match(/image:\s*(caddy:[^\s]+)/)?.[1];
  assert.ok(image, 'the compose file must declare a caddy image');
  assert.match(image, /^caddy:\d+\.\d+\.\d+-alpine$/, 'the Caddy image must pin an exact patch');

  const pinned = image.match(/caddy:(\d+\.\d+\.\d+)/)[1];
  const declared = deploy.match(/PORTFOLIO_CADDY_VERSION = '([^']+)'/)?.[1];
  assert.equal(declared, pinned, 'the deploy assertion must track the compose pin');

  // Pull is separate from up: without it the recreate keeps the old image.
  assert.match(deploy, /docker compose --env-file csp\.env pull --quiet/);
  assert.match(deploy, /function verifyCaddyVersion\(\)/);
  assert.match(deploy, /is running Caddy \$\{running\} but the compose file pins/);
});
