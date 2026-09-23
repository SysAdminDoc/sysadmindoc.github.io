import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { EDGE_DELETIONS, EDGE_EXCLUDES, REQUIRED_DELETIONS, defaultLogProblem } from '../scripts/lib/edge-log-check.mjs';

const root = process.cwd();

// The edge's default logger as its admin API returned it on 2026-09-23, after
// the seventh drain review (field order as Caddy writes it).
const filtered = {
  writer: { output: 'stderr' },
  encoder: {
    format: 'filter',
    wrap: { format: 'json' },
    fields: {
      error: { filter: 'regexp', regexp: '[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+', value: 'x.x.x.x' },
      'request>client_ip': { filter: 'delete' },
      'request>headers': { filter: 'delete' },
      'request>remote_ip': { filter: 'delete' },
      'request>remote_port': { filter: 'delete' },
      'request>tls': { filter: 'delete' },
      'request>uri': { filter: 'regexp', regexp: '\\?.*$' },
      resp_headers: { filter: 'delete' },
      referer: { filter: 'delete' },
      user_agent: { filter: 'delete' },
    },
  },
  exclude: ['http.log.access.portfolio', 'http.log.error.portfolio'],
};
const edgeOptions = { mustExclude: EDGE_EXCLUDES, mustDelete: EDGE_DELETIONS };
const withFields = (change) => JSON.stringify({ ...filtered, encoder: { ...filtered.encoder, fields: change({ ...filtered.encoder.fields }) } });

test('a default logger that drops what identifies a visitor passes, on the edge and inside portfolio-app', () => {
  assert.equal(defaultLogProblem(JSON.stringify(filtered), edgeOptions), null);
  assert.equal(defaultLogProblem(JSON.stringify({ ...filtered, exclude: undefined })), null, 'the inner Caddy needs no exclusion');
  // An exclusion covers its children, so a broader one is a correct setup.
  assert.equal(defaultLogProblem(JSON.stringify({ ...filtered, exclude: ['http.log.error'] }), edgeOptions), null);
});

// With a mixed-case Host the portfolio's access entry lands in the edge's
// default logger, and the fields its log_append adds come along (2026-09-23,
// live: the user agent reached the container log).
test('on the edge, the fields the portfolio block appends are dropped too', () => {
  for (const name of EDGE_DELETIONS) {
    const problem = defaultLogProblem(withFields((fields) => ({ ...fields, [name]: undefined })), edgeOptions);
    assert.match(problem ?? '', new RegExp(`keeps ${name}`), name);
  }
  assert.equal(defaultLogProblem(withFields((fields) => ({ ...fields, referer: undefined, user_agent: undefined }))), null, 'the inner Caddy appends nothing');
});

// The seventh drain review got whole portfolio requests into the edge's
// container log through reverse_proxy's warning for a cut-short download and
// through a mixed-case Host, while the old check, which read only the exclude
// list, still passed.
test('the old exclusion-only setup, and any gap in the filter, fails', () => {
  const excludeOnly = JSON.stringify({ writer: { output: 'stderr' }, encoder: { format: 'json' }, exclude: ['http.log.access.portfolio', 'http.log.error.portfolio'] });
  assert.match(defaultLogProblem(excludeOnly, edgeOptions) ?? '', /format is json, not a filter/);
  for (const name of REQUIRED_DELETIONS) {
    const problem = defaultLogProblem(withFields((fields) => ({ ...fields, [name]: undefined })));
    assert.match(problem ?? '', new RegExp(`keeps ${name}`), name);
  }
  assert.match(defaultLogProblem(withFields((fields) => ({ ...fields, 'request>uri': { filter: 'regexp', regexp: '#.*$' } }))) ?? '', /keeps the query string/);
  assert.match(defaultLogProblem(withFields((fields) => ({ ...fields, error: { filter: 'regexp', regexp: 'broken pipe', value: 'x' } }))) ?? '', /keeps addresses in error text/);
  assert.match(defaultLogProblem(withFields((fields) => ({ ...fields, error: undefined }))) ?? '', /keeps addresses in error text/);
  assert.match(defaultLogProblem(JSON.stringify({ ...filtered, level: 'DEBUG' })) ?? '', /runs at DEBUG/);
  assert.match(defaultLogProblem(JSON.stringify({ ...filtered, exclude: ['http.log.access.portfolio'] }), edgeOptions) ?? '', /doesn't exclude http\.log\.error\.portfolio/);
  assert.match(defaultLogProblem('null') ?? '', /no default logger/);
  assert.match(defaultLogProblem("wget: can't connect to remote host") ?? '', /could not read/);
});

test('both Caddyfiles carry the filter, and the deploy reads both running configs back', async () => {
  const inner = await fs.readFile(path.join(root, 'deploy', 'vps', 'Caddyfile'), 'utf8');
  const global = inner.replace(/^\s*#.*$/gm, '').trim().match(/^\{[\s\S]*?\n\}/)?.[0] ?? '';
  for (const name of REQUIRED_DELETIONS) assert.match(global, new RegExp(`\\n\\s*${name} delete\\n`), `the inner Caddy drops ${name}`);
  assert.match(global, /request>uri regexp \\\?\.\*\$ ""/);
  assert.match(global, /error regexp \[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+ x\.x\.x\.x/);

  // What /privacy/ promises about them, which the filters above make true. It
  // used to say they never hold "anything your browser sent", though they keep
  // the method, protocol, host and page (eighth drain review).
  const page = await fs.readFile(path.join(root, 'src', 'pages', 'privacy.astro'), 'utf8');
  assert.match(page, /The servers' own logs, kept for troubleshooting, note the time and what went wrong, and for a request that failed, its method, protocol, site name and page, again without anything after a question mark\. The request details in them leave out your IP address and your browser's headers, and Docker keeps only the latest \{SERVER_LOG_MB\} MB of each server's log\./);
  assert.doesNotMatch(page, /anything your browser sent/);

  const block = await fs.readFile(path.join(root, 'deploy', 'vps', 'caddy-block.txt'), 'utf8');
  assert.match(block, /\blog portfolio \{\s*\n\s*output file \/var\/log\/caddy\/portfolio\.log/, 'the exclusion names the portfolio logger');

  const deploy = await fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  assert.match(deploy, /docker exec caddy wget -qO- http:\/\/127\.0\.0\.1:2019\/config\/logging\/logs\/default /);
  assert.match(deploy, /docker exec portfolio-app wget -qO- http:\/\/127\.0\.0\.1:2019\/config\/logging\/logs\/default /);
  assert.match(deploy, /defaultLogProblem\(output, \{ mustExclude: EDGE_EXCLUDES, mustDelete: EDGE_DELETIONS \}\)/, 'the edge is held to its extra deletions');
  // The edge's check doesn't depend on the new build, so it runs before
  // anything ships; the inner one reads the container the deploy just made.
  const edgeChecked = deploy.indexOf('\nverifyEdgeLogging();');
  const shipped = deploy.indexOf("path.join(root, 'deploy', 'vps', 'docker-compose.yml')");
  const recreated = deploy.indexOf('up -d --force-recreate');
  const innerChecked = deploy.indexOf('\nverifyInnerLogging();');
  assert.ok(edgeChecked > 0 && edgeChecked < shipped, 'the edge is checked before anything ships');
  assert.ok(innerChecked > recreated, 'portfolio-app is checked once it runs the new config');
});

// A check that warns instead of stopping the deploy checks nothing: the seventh
// review turned the throw into console.warn and every test still passed.
test('every live check in the deploy stops it on a problem, unconditionally', async () => {
  const deploy = await fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  for (const name of ['verifyEdgeLogging', 'verifyInnerLogging', 'verifyEdgeAddress', 'verifyAccessLogShape', 'verifyCspReportShape', 'verifyServerLogRetention']) {
    const body = deploy.match(new RegExp(`function ${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
    assert.ok(body, `${name} exists`);
    assert.match(body, /if \(problem\) \{?\s*throw new Error\(/, `${name} throws on a problem`);
    assert.doesNotMatch(body, /process\.env|console\.warn/, `${name} is not switched off or softened`);
    assert.equal(deploy.split(`\n${name}(`).length - 1 + deploy.split(`\n  ${name}(`).length - 1, 1, `${name} is called once`);
  }
});
