import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

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
