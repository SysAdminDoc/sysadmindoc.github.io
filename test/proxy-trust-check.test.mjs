import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { EDGE_PROXY_ADDRESS } from '../scripts/lib/edge-address.mjs';
import { caddyTrustProblems, networkProblems, ntfyTrustProblems } from '../scripts/lib/proxy-trust-check.mjs';

const root = process.cwd();
const edge = `${EDGE_PROXY_ADDRESS}/32`;

// The shape of the inner Caddy's /config/ on 2026-09-24, cut down: one server
// that trusts the edge, a reverse proxy to ntfy, and a response header block.
const liveConfig = () => ({
  apps: {
    http: {
      servers: {
        srv0: {
          listen: [':80'],
          trusted_proxies: { source: 'static', ranges: [edge] },
          routes: [
            { handle: [{ handler: 'subroute', routes: [{ handle: [{ handler: 'reverse_proxy', upstreams: [{ dial: 'ntfy:80' }] }] }] }] },
            { handle: [{ handler: 'headers', response: { set: { 'X-Frame-Options': ['DENY'] }, delete: ['Forwarded'] } }] },
          ],
        },
      },
    },
  },
});
const proxy = (config) => config.apps.http.servers.srv0.routes[0].handle[0].routes[0].handle[0];

test("the inner Caddy's running config passes when only the edge can hand on an address", () => {
  assert.deepEqual(caddyTrustProblems(JSON.stringify(liveConfig()), edge), []);
});

// The eleventh drain review's Caddyfile variants all adapt to one of these,
// however the Caddyfile spelled them.
test('each way a running config lets someone else choose the address is named', () => {
  const variant = (change) => {
    const config = liveConfig();
    change(config);
    return caddyTrustProblems(JSON.stringify(config), edge).join('\n');
  };
  assert.match(variant((c) => { proxy(c).headers = { request: { set: { 'X-Forwarded-For': ['{http.request.header.X-Real-IP}'] } } }; }), /request\.set X-Forwarded-For/);
  assert.match(variant((c) => { proxy(c).headers = { request: { add: { 'x-real-ip': ['1'] } } }; }), /request\.add x-real-ip/);
  assert.match(variant((c) => { proxy(c).headers = { request: { delete: ['Forwarded'] } }; }), /request\.delete Forwarded/);
  // The fourteenth drain review: `vars fwd X-Forwarded-For` and `header_up
  // {vars.fwd} ...` forged the header through a real Caddy.
  assert.match(variant((c) => { proxy(c).headers = { request: { set: { '{vars.fwd}': ['{http.request.header.X-Real-IP}'] } } }; }), /request\.set \{vars\.fwd\}/);
  assert.match(variant((c) => { c.apps.http.servers.srv0.routes.push({ handle: [{ handler: 'headers', request: { replace: { 'X-Forwarded-For': [{ search: '.*', replace: '1.2.3.4' }] } } }] }); }), /request\.replace X-Forwarded-For/);
  assert.match(variant((c) => { c.apps.http.servers.srv0.trusted_proxies = { source: 'static', ranges: ['private_ranges'] }; }), /trusts .*private_ranges/);
  assert.match(variant((c) => { c.apps.http.servers.srv0.client_ip_headers = ['X-Real-IP']; }), /reads the address from \["X-Real-IP"\]/);
  assert.match(variant((c) => { c.apps.http.servers.srv0.listener_wrappers = [{ wrapper: 'proxy_protocol' }, { wrapper: 'tls' }]; }), /wraps its listener in proxy_protocol/);
  assert.match(variant((c) => { c.apps.http.servers.srv1 = { listen: [':8080'] }; }), /srv1 trusts null/, 'a second server has to trust the edge too');
  assert.match(caddyTrustProblems("wget: can't connect to remote host", edge).join(''), /could not read the inner Caddy's config/);
  assert.match(caddyTrustProblems('{}', edge).join(''), /no HTTP server/);
});

const liveNtfy = { args: '["ntfy"] ["serve"]', env: `NTFY_PROXY_TRUSTED_HOSTS=${edge}\nNTFY_BEHIND_PROXY=true`, configLines: '' };

test("ntfy's running settings pass as plain `ntfy serve` with its proxy settings in the environment", () => {
  assert.deepEqual(ntfyTrustProblems(liveNtfy, edge), []);
  assert.deepEqual(ntfyTrustProblems({ ...liveNtfy, env: `${liveNtfy.env}\nNTFY_PROXY_FORWARDED_HEADER=x-forwarded-for` }, edge), []);
});

test('each way ntfy could take the address from someone else is named', () => {
  const problems = (change) => ntfyTrustProblems({ ...liveNtfy, ...change }, edge).join('\n');
  assert.match(problems({ args: '["ntfy"] ["serve","--proxy_forwarded_header","X-Real-IP"]' }), /runs `ntfy serve --proxy_forwarded_header X-Real-IP`/);
  assert.match(problems({ args: 'null ["ntfy","serve","-c","/tmp/x.yml"]' }), /runs `ntfy serve -c/);
  assert.match(problems({ env: `NTFY_PROXY_TRUSTED_HOSTS=172.16.0.0/12\nNTFY_BEHIND_PROXY=true` }), /trusts 172\.16\.0\.0\/12/);
  assert.match(problems({ env: `NTFY_PROXY_TRUSTED_HOSTS=${edge}` }), /not told it sits behind a proxy/);
  assert.match(problems({ env: `${liveNtfy.env}\nNTFY_PROXY_FORWARDED_HEADER=X-Real-IP` }), /reads the address from X-Real-IP/);
  assert.match(problems({ env: `${liveNtfy.env}\nNTFY_CONFIG_FILE=/var/lib/ntfy/server.yml` }), /config file named by NTFY_CONFIG_FILE/);
  // Any config file counts now, whatever it says: a YAML escape spelled a key
  // past the old grep for setting names (fourteenth drain review).
  assert.match(problems({ configLines: '/etc/ntfy/server.yml' }), /has a config file \(\/etc\/ntfy\/server\.yml\)/);
  assert.match(problems({ args: 'Error: No such object' }), /could not read ntfy's command line/);
});

test('the report sink stays off the network ntfy and the handler share', () => {
  const expected = { 'portfolio-app': ['a', 'b', 'web'], 'portfolio-csp-reporter': ['b'] };
  assert.deepEqual(networkProblems('portfolio-app b a web \n\nportfolio-csp-reporter b \n', expected), []);
  assert.match(networkProblems('portfolio-app a b web\nportfolio-csp-reporter a b', expected).join(''), /portfolio-csp-reporter is on a, b, not b/);
  assert.match(networkProblems('portfolio-app a b web\nportfolio-csp-reporter', expected).join(''), /is on no network/);
  assert.match(networkProblems('portfolio-app a b web', expected).join(''), /portfolio-csp-reporter isn't running/);
});

test('the deploy reads all of it back from the containers it just recreated, and only ntfy\'s proxy settings leave the box', () => {
  const deploy = fs.readFileSync(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  const body = deploy.match(/function verifyProxyTrust\(\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(body, /docker exec portfolio-app wget -qO- http:\/\/127\.0\.0\.1:2019\/config\//);
  assert.match(body, /grep -E '\^NTFY_\(BEHIND_PROXY\|PROXY_\[A-Z_\]\+\|CONFIG_FILE\)='/, 'the environment is filtered on the server');
  assert.doesNotMatch(body, /\.Config\.Env\}\}'(?! \|)/, 'never the whole environment');
  const recreated = deploy.indexOf('up -d --force-recreate');
  const checked = deploy.indexOf('\nverifyProxyTrust();');
  assert.ok(recreated > 0 && checked > recreated, 'it checks the new containers');
});
