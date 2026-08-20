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
  assert.match(internalCaddy, /Content-Security-Policy \{\$CSP_POLICY\}/);
  assert.match(compose, /CSP_POLICY: \$\{CSP_POLICY:\?/);
  assert.match(compose, /csp-report-server\.mjs/);
  assert.match(reporter, /maxBodyBytes: 64 \* 1024/);
  assert.match(reporter, /maxLogBytes: 5 \* 1024 \* 1024/);
  assert.match(reporter, /maxRequestsPerMinute: 120/);
  assert.match(reporter, /X-CSP-Report-Stored/);
  assert.match(smoke, /await checkCspReportEndpoint\(baseUrl, summary\)/);
  assert.match(smoke, /Reporting-Endpoints/);
  assert.match(smoke, /report-to\\s\+csp-endpoint/);
});
