import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { EDGE_EXCLUDES, REQUIRED_DELETIONS, defaultLogProblem, loggingProblem } from '../scripts/lib/edge-log-check.mjs';

const root = process.cwd();

// The edge's default logger as its admin API returned it on 2026-09-23, after
// the seventh drain review (field order as Caddy writes it). The eleventh
// review showed it still let top-level addresses and pages through.
const fields0923 = {
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
};
// And with the top-level fields dropped too, as both Caddyfiles now have it.
const filtered = {
  writer: { output: 'stderr' },
  encoder: {
    format: 'filter',
    wrap: { format: 'json' },
    fields: {
      ...fields0923,
      client_ip: { filter: 'delete' },
      remote_addr: { filter: 'delete' },
      remote_ip: { filter: 'delete' },
      remote_port: { filter: 'delete' },
      uri: { filter: 'regexp', regexp: '\\?.*$' },
    },
  },
  exclude: ['http.log.access.portfolio', 'http.log.error.portfolio'],
};
const edgeOptions = { mustExclude: EDGE_EXCLUDES };
const withFields = (change) => JSON.stringify({ ...filtered, encoder: { ...filtered.encoder, fields: change({ ...filtered.encoder.fields }) } });

test('a default logger that drops what identifies a visitor passes, on the edge and inside portfolio-app', () => {
  assert.equal(defaultLogProblem(JSON.stringify(filtered), edgeOptions), null);
  assert.equal(defaultLogProblem(JSON.stringify({ ...filtered, exclude: undefined })), null, 'the inner Caddy needs no exclusion');
  // An exclusion covers its children, so a broader one is a correct setup.
  assert.equal(defaultLogProblem(JSON.stringify({ ...filtered, exclude: ['http.log.error'] }), edgeOptions), null);
});

// With a mixed-case Host the portfolio's access entry lands in the edge's
// default logger, and the fields its log_append adds come along (2026-09-23,
// live: the user agent reached the container log). The inner Caddy appends
// nothing, but it logs the ACME challenge warning with a top-level user_agent
// too, so the old "the inner Caddy appends nothing, so it needs neither" was
// wrong (thirteenth drain review): both servers drop both.
test('both servers drop the user agent and referrer', () => {
  for (const name of ['user_agent', 'referer']) {
    for (const options of [edgeOptions, {}]) {
      const problem = defaultLogProblem(withFields((fields) => ({ ...fields, [name]: undefined })), options);
      assert.match(problem ?? '', new RegExp(`keeps ${name}\\b`), name);
    }
  }
});

// On 2026-09-24 the edge's log held 13 warnings like this one, from a request
// to /.well-known/acme-challenge/ (eleventh drain review; address and path
// made up here). Nothing under `request` holds the visitor's details.
test('the address and page some entries carry at the top level are dropped too', () => {
  const problem = defaultLogProblem(JSON.stringify({ ...filtered, encoder: { ...filtered.encoder, fields: fields0923 } }), edgeOptions) ?? '';
  for (const name of ['remote_addr', 'remote_ip', 'remote_port', 'client_ip']) assert.match(problem, new RegExp(`keeps [^.]*\\b(?<!>)${name}\\b`), name);
  assert.match(problem, /the query string \(uri\)/);
  assert.doesNotMatch(problem, /request>uri/, 'the nested one was already cut');
  assert.match(defaultLogProblem(withFields((fields) => ({ ...fields, uri: { filter: 'regexp', regexp: '#.*$' } }))) ?? '', /keeps the query string \(uri\)/);
});

// The edge's loggers as its admin API listed them on 2026-09-24: the filtered
// default on stderr, nine other sites' access logs and the portfolio's, all
// to files.
const fileLogger = (name) => ({ encoder: { format: 'json' }, include: [`http.log.access.${name}`], writer: { output: 'file', filename: `/var/log/caddy/${name}.log` } });
const edgeLogs = () => ({
  default: filtered,
  ...Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`log${index}`, fileLogger(`log${index}`)])),
  portfolio: fileLogger('portfolio'),
});

// The eighth drain review: the deploy read only `default`, so a second logger
// on the container's output would have passed while it wrote addresses.
test('every logger that writes to the container output is held to the default one\'s filter', () => {
  const check = (logs) => loggingProblem(JSON.stringify(logs), edgeOptions);
  assert.equal(check(edgeLogs()), null, 'the edge as it runs');
  assert.equal(loggingProblem(JSON.stringify({ default: { ...filtered, exclude: undefined } })), null, 'and the inner Caddy');

  const plain = { encoder: { format: 'json' }, writer: { output: 'stderr' } };
  assert.match(check({ ...edgeLogs(), extra: plain }) ?? '', /the extra logger's format is json, not a filter .*, and it writes to the container's stderr/);
  assert.match(check({ ...edgeLogs(), extra: { ...plain, writer: { output: 'stdout' } } }) ?? '', /extra logger.*stdout/);
  assert.match(check({ ...edgeLogs(), extra: { encoder: { format: 'json' } } }) ?? '', /extra logger/, 'no writer means stderr');
  assert.match(check({ ...edgeLogs(), extra: { ...plain, include: ['http.log.access.portfolio'] } }) ?? '', /extra logger/, 'the portfolio access log on stderr');
  assert.match(check({ ...edgeLogs(), extra: { ...plain, include: ['http.handlers.reverse_proxy'] } }) ?? '', /extra logger/, 'handler warnings carry portfolio requests too');
  assert.equal(check({ ...edgeLogs(), extra: { ...plain, include: ['http.log.access.log3', 'http.log.error.log3'] } }), null, 'another site\'s own logs never see a portfolio request');
  assert.equal(check({ ...edgeLogs(), extra: { ...filtered } }), null, 'a second logger filtered like default passes');
  assert.match(check({ ...edgeLogs(), extra: { ...filtered, exclude: [] } }) ?? '', /extra logger, which writes to the container's stderr, doesn't exclude http\.log\.error\.portfolio/);
  assert.equal(check({ ...edgeLogs(), extra: { ...filtered, exclude: [], include: ['http.log.access.log4'] } }), null, 'an exclusion it can never need');
  assert.match(check({ ...edgeLogs(), default: undefined }) ?? '', /no default logger/);
  assert.match(loggingProblem('null') ?? '', /no loggers are configured/);
  assert.match(loggingProblem("wget: can't connect to remote host") ?? '', /could not read the logging config/);
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
  assert.match(global, /\n\s*uri regexp \\\?\.\*\$ ""\n/, 'and the top-level uri');
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
  // Every logger now, not just default (eighth drain review), so the whole
  // logs object is read rather than /logs/default.
  assert.match(deploy, /docker exec caddy wget -qO- http:\/\/127\.0\.0\.1:2019\/config\/logging\/logs /);
  assert.match(deploy, /docker exec portfolio-app wget -qO- http:\/\/127\.0\.0\.1:2019\/config\/logging\/logs /);
  assert.match(deploy, /loggingProblem\(output, \{ mustExclude: EDGE_EXCLUDES \}\)/, 'the edge is held to its exclusion');
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
  for (const name of ['verifyEdgeLogging', 'verifyInnerLogging', 'verifyEdgeAddress', 'verifyAccessLogShape', 'verifyCspReportShape', 'verifyServerLogRetention', 'verifyProxyTrust']) {
    const body = deploy.match(new RegExp(`function ${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
    assert.ok(body, `${name} exists`);
    assert.match(body, /if \(problem\) \{?\s*throw new Error\(/, `${name} throws on a problem`);
    assert.doesNotMatch(body, /process\.env|console\.warn/, `${name} is not switched off or softened`);
    assert.equal(deploy.split(`\n${name}(`).length - 1 + deploy.split(`\n  ${name}(`).length - 1, 1, `${name} is called once`);
  }
});
