import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test, { mock } from 'node:test';
import { DEFAULT_CONFIG as CONTACT_DEFAULTS, createContactHandler, startServer } from '../deploy/vps/contact-handler.mjs';
import { DEFAULT_CONFIG as CSP_REPORT_DEFAULTS, createReporter } from '../deploy/vps/csp-report-server.mjs';
import { ACCESS_LOG_FIELDS } from '../scripts/lib/access-log-shape.mjs';
import {
  ACCESS_LOG_RETENTION_DAYS,
  CSP_REPORT_STORE_MB,
  LEAD_RETENTION_DAYS,
  NOTIFICATION_CACHE_HOURS,
  PRIVACY_EFFECTIVE_DATE,
  SERVER_LOG_MB,
} from '../src/data/retention.ts';

const root = process.cwd();
const read = (...parts) => fs.readFile(path.join(root, ...parts), 'utf8');

// /privacy/ is a promise. Each period it states has to be the one something
// actually enforces, or the page is wrong the day either side changes.
test('every retention period /privacy/ states is the one its purge enforces', async () => {
  const compose = await read('deploy', 'vps', 'docker-compose.yml');

  // Leads: the contact handler deletes them at start and daily. Nothing in
  // compose may override the default the page is built from.
  assert.equal(CONTACT_DEFAULTS.leadRetentionDays, LEAD_RETENTION_DAYS);
  assert.doesNotMatch(compose, /CONTACT_RETENTION_DAYS/);

  // Lead notifications: ntfy expires its own cache.
  assert.equal(compose.match(/NTFY_CACHE_DURATION: (\S+)/)?.[1], `${NOTIFICATION_CACHE_HOURS}h`);

  // Access log: the edge rolls it at midnight and deletes rolled files by age
  // and by count, both set to the stated number of days.
  const edge = await read('deploy', 'vps', 'caddy-block.txt');
  const roll = edge.match(/output file \/var\/log\/caddy\/portfolio\.log \{([^}]*)\}/)?.[1] ?? '';
  assert.match(roll, /roll_at 00:00/);
  assert.equal(roll.match(/roll_keep (\d+)/)?.[1], String(ACCESS_LOG_RETENTION_DAYS));
  assert.equal(roll.match(/roll_keep_for (\d+)h/)?.[1], String(ACCESS_LOG_RETENTION_DAYS * 24));

  // CSP reports: the live file plus one rotated copy.
  assert.equal(CSP_REPORT_DEFAULTS.maxLogBytes * 2, CSP_REPORT_STORE_MB * 1024 * 1024);
  assert.doesNotMatch(compose, /CSP_REPORT_MAX_LOG_BYTES/);

  // The inner Caddy's own log: Docker keeps max-file files of max-size. The
  // edge takes the host default, which the deploy reads back from the server.
  const portfolioApp = compose.match(/\n {2}portfolio-app:\n([\s\S]*?)(?=\n {2}[a-z][\w-]*:\n)/)?.[1] ?? '';
  const logging = portfolioApp.match(/logging:\s*\n\s+driver: json-file\s*\n\s+options:\s*\n\s+max-size: "(\d+)m"\s*\n\s+max-file: "(\d+)"/);
  assert.ok(logging, 'portfolio-app sets its own json-file limits');
  assert.equal(Number(logging[1]) * Number(logging[2]), SERVER_LOG_MB);
});

test('the page renders those numbers from src/data/retention.ts rather than typing its own', async () => {
  const page = await read('src', 'pages', 'privacy.astro');
  for (const name of ['LEAD_RETENTION_DAYS', 'NOTIFICATION_CACHE_HOURS', 'ACCESS_LOG_RETENTION_DAYS', 'CSP_REPORT_STORE_MB', 'SERVER_LOG_MB']) {
    assert.match(page, new RegExp(`\\{${name}\\}`), `${name} is rendered from the shared constant`);
  }
  assert.match(page, /datetime=\{PRIVACY_EFFECTIVE_DATE\}/);
  assert.match(PRIVACY_EFFECTIVE_DATE, /^\d{4}-\d{2}-\d{2}$/);
  assert.doesNotMatch(page, /\b\d+ (?:days|hours|MB)\b/, 'no period is typed into the page');
});

test('every page links to /privacy/, and the form says how long a message is kept', async () => {
  const footer = await read('src', 'components', 'Footer.astro');
  assert.match(footer, /href: '\/privacy\/', label: 'Privacy'/);
  const form = await read('src', 'components', 'ContactForm.astro');
  assert.match(form, /kept for \{LEAD_RETENTION_DAYS\} days, then deleted/);
  assert.match(form, /href="\/privacy\/"/);
});

test('the traffic report the cron runs is the repo copy, and it reads the rolled logs too', async () => {
  const deploy = await read('scripts', 'deploy-vps.mjs');
  assert.ok(
    deploy.includes("path.join(root, 'deploy', 'vps', 'analytics-report.sh'), `${ssh}:${remoteDir}/bin/analytics-report.sh`"),
    'deploy-vps ships the script to the path the cron runs',
  );
  const script = await read('deploy', 'vps', 'analytics-report.sh');
  assert.ok(script.includes('"${0%.log}"-*.log.gz'), 'rolled, gzipped logs are read as well as the live one');
  // Comments don't count, whole-line or trailing: both still matched older checks.
  const code = script.split('\n').map((line) => line.replace(/(^|\s)#.*$/, '$1')).join('\n');
  assert.match(code, /--anonymize-ip/);
  // It reads every visitor address in the raw log, so the image is pinned and
  // gets no network and no writable root.
  assert.match(script, /GOACCESS_IMAGE:-allinurl\/goaccess@sha256:[0-9a-f]{64}\}/);
  assert.match(script, /docker run --rm -i --network none --read-only --tmpfs \/work -w \/work "\$GOACCESS_IMAGE"/);
});

// The edge keeps only what the traffic report reads, and /privacy/ lists that
// and nothing else. The filter, the fields log_append adds, the report's
// GoAccess format and the page all have to agree.
// Every field Caddy 2.11.3 writes to an access entry: zap's own four,
// LoggableHTTPRequest.MarshalLogObject (modules/caddyhttp/marshalers.go) under
// `request`, and Server.logRequest (modules/caddyhttp/server.go) at the top
// level. write_error comes from Caddy's main branch, ahead of an upgrade.
const CADDY_ACCESS_FIELDS = [
  'level', 'ts', 'logger', 'msg',
  'request>remote_ip', 'request>remote_port', 'request>client_ip', 'request>proto', 'request>method', 'request>host',
  'request>uri', 'request>headers', 'request>transfer_encoding', 'request>tls',
  'bytes_read', 'user_id', 'duration', 'size', 'status', 'resp_headers', 'write_error',
];

test('the access log keeps only what the report reads, and the page lists exactly that', async () => {
  const edge = await read('deploy', 'vps', 'caddy-block.txt');
  const block = edge.match(/portfolio\.getparkerai\.com \{[\s\S]*?\n\}/)?.[0] ?? '';
  const appended = [...block.matchAll(/log_append (\w+) \{http\.request\.header\.([\w-]+)\}/g)].map((match) => `${match[1]}=${match[2]}`).sort();
  assert.deepEqual(appended, ['referer=Referer', 'user_agent=User-Agent']);
  // Each field Caddy writes is either dropped by the filter or on the list the
  // deploy checks the live entries against, and never both.
  const kept = ACCESS_LOG_FIELDS.map((field) => field.replace('.', '>'));
  for (const field of [...CADDY_ACCESS_FIELDS, 'user_agent', 'referer']) {
    const deleted = new RegExp(`^\\s*${field} delete\\s*$`, 'm').test(block);
    assert.ok(deleted !== kept.includes(field), `${field} is ${deleted ? 'both dropped and listed as kept' : 'neither dropped nor listed as kept'}`);
  }
  for (const field of kept) assert.ok([...CADDY_ACCESS_FIELDS, 'user_agent', 'referer'].includes(field), `${field} is a field Caddy writes`);
  assert.ok(block.includes('request>uri regexp \\?.*$ ""'), 'the query string is dropped from the page');
  assert.ok(block.includes('referer regexp \\?.*$ ""'), 'and from the referrer, where a search on this site put it');

  const script = await read('deploy', 'vps', 'analytics-report.sh');
  const format = JSON.parse(script.match(/LOG_FORMAT='([^']+)'/)?.[1] ?? '{}');
  assert.equal(format.user_agent, '%u');
  assert.equal(format.referer, '%R');
  assert.equal(format.request?.headers, undefined, 'the report reads nothing the log no longer keeps');
  assert.match(script, /--log-format="\$LOG_FORMAT"/);

  const page = await read('src', 'pages', 'privacy.astro');
  // What the page calls each kept field (zap's level, logger name and message
  // carry nothing about the visitor).
  const named = {
    'request.remote_ip': 'your IP address',
    'request.client_ip': 'your IP address',
    'request.host': "this site's name",
    'request.uri': 'the page, without anything after a question mark',
    ts: 'the time',
    'request.method': 'the request method and protocol',
    'request.proto': 'the request method and protocol',
    status: 'the status, the size and the time it took',
    size: 'the status, the size and the time it took',
    duration: 'the status, the size and the time it took',
    user_agent: 'user agent',
    referer: 'the page you came from, also cut off at the question mark',
  };
  for (const field of ACCESS_LOG_FIELDS) {
    if (['level', 'logger', 'msg'].includes(field)) continue;
    assert.ok(named[field], `${field} has a name on the page`);
    assert.ok(page.includes(named[field]), `the page names ${field} as "${named[field]}"`);
  }
  assert.doesNotMatch(page, /headers your browser sent|IP address and port|how your browser connected/, 'the page claims nothing the log dropped');
});

// The checks below answer the third drain review, which found eight settings
// this file claimed to hold that could be broken without a test failing.

test('the access log roll block states each setting once and never turns rolling off', async () => {
  const edge = await read('deploy', 'vps', 'caddy-block.txt');
  const roll = edge.match(/output file \/var\/log\/caddy\/portfolio\.log \{([^}]*)\}/)?.[1] ?? '';
  const settings = roll
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[0])
    .sort();
  // A second roll_keep_for would win (Caddy keeps the last), and roll_disabled
  // would stop deletion altogether.
  assert.deepEqual(settings, ['roll_at', 'roll_keep', 'roll_keep_for']);
});

test('the CSP report store holds the live file and one rotated copy, never more', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-csp-retention-'));
  try {
    const logPath = path.join(dir, 'reports.ndjson');
    const maxLogBytes = 300;
    const reporter = createReporter({ ...CSP_REPORT_DEFAULTS, logPath, maxLogBytes, maxRequestsPerMinute: 1000 });
    const body = JSON.stringify({ type: 'csp-violation', body: { documentURL: 'https://portfolio.getparkerai.com/', effectiveDirective: 'script-src' } });
    for (let index = 0; index < 12; index += 1) {
      const response = { status: 0, writeHead(status) { this.status = status; }, end() {} };
      await reporter.handleRequest(
        {
          method: 'POST',
          url: '/csp-report',
          headers: { 'content-length': String(Buffer.byteLength(body)), 'content-type': 'application/reports+json' },
          resume() {},
          on() { return this; },
          async *[Symbol.asyncIterator]() { yield Buffer.from(body); },
        },
        response,
      );
      assert.equal(response.status, 204);
    }
    const files = (await fs.readdir(dir)).sort();
    assert.deepEqual(files, ['reports.ndjson', 'reports.ndjson.1']);
    let total = 0;
    for (const file of files) total += (await fs.stat(path.join(dir, file))).size;
    assert.ok(total <= maxLogBytes * 2, `${total} bytes kept`);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('every built page with a footer links to /privacy/', async (t) => {
  const dist = path.join(root, 'dist');
  if (!(await fs.access(path.join(dist, 'index.html')).then(() => true, () => false))) {
    t.skip('dist/ not built; run npm run build');
    return;
  }
  /** @param {string} dir @returns {Promise<string[]>} */
  const walk = async (dir) => {
    /** @type {string[]} */
    const found = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'pagefind') found.push(...(await walk(full)));
      } else if (entry.name.endsWith('.html')) found.push(full);
    }
    return found;
  };
  const missing = [];
  let checked = 0;
  for (const file of await walk(dist)) {
    const relative = path.relative(dist, file).replace(/\\/g, '/');
    const footer = (await fs.readFile(file, 'utf8')).match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
    if (!footer || relative === 'privacy/index.html') continue;
    checked += 1;
    if (!/href="\/privacy\/"/.test(footer)) missing.push(relative);
  }
  assert.ok(checked >= 20, `only ${checked} pages had a footer`);
  assert.deepEqual(missing, []);
});

const DAY_MS = 24 * 60 * 60_000;
const storedLead = (id, receivedAt) =>
  JSON.stringify({ type: 'lead', id, receivedAt: receivedAt.toISOString(), name: 'N', email: 'n@example.test', message: 'hello there you', subject: '', page: '/', status: 'pending' });
const sentStatus = (id) => JSON.stringify({ type: 'status', id, status: 'sent', at: new Date().toISOString(), attempts: 1 });
const leadIds = async (storePath) =>
  (await fs.readFile(storePath, 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line)).filter((entry) => entry.type === 'lead').map((entry) => entry.id);

test('the purge cutoff is the stated number of days, to the minute', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-lead-retention-'));
  try {
    const storePath = path.join(dir, 'leads.ndjson');
    const now = new Date('2026-09-23T12:00:00.000Z');
    // A minute either side of the period: a cutoff off by hours, not just a day, fails.
    const period = LEAD_RETENTION_DAYS * DAY_MS;
    const kept = new Date(now.getTime() - period + 60_000);
    const gone = new Date(now.getTime() - period - 60_000);
    await fs.writeFile(storePath, [storedLead('kept', kept), sentStatus('kept'), storedLead('gone', gone), sentStatus('gone'), ''].join('\n'));
    const quiet = { log() {}, error() {} };
    const handler = createContactHandler({ ...CONTACT_DEFAULTS, ntfyUrl: 'http://ntfy:80/portfolio-leads', storePath }, { now: () => now, logger: quiet });
    await handler.purgeExpired();
    assert.deepEqual(await leadIds(storePath), ['kept']);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('the contact handler purges when it starts, before its port opens, and again every day', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-lead-purge-'));
  const storePath = path.join(dir, 'leads.ndjson');
  const ago = (days) => new Date(Date.now() - days * DAY_MS);
  await fs.writeFile(storePath, [storedLead('old', ago(400)), sentStatus('old'), storedLead('recent', ago(10)), sentStatus('recent'), ''].join('\n'));
  // Only intervals are faked: the purge's own clock stays real.
  mock.timers.enable({ apis: ['setInterval'] });
  const quiet = mock.method(console, 'log', () => {});
  // What the store held at the moment the port opened, so a purge moved after
  // listen() fails even though startServer still awaits it.
  /** @type {string | null} */
  let heldAtListen = null;
  const originalListen = http.Server.prototype.listen;
  const listen = mock.method(http.Server.prototype, 'listen', function (/** @type {any[]} */ ...args) {
    heldAtListen = readFileSync(storePath, 'utf8');
    return originalListen.apply(this, args);
  });
  let server;
  try {
    server = await startServer({ ...CONTACT_DEFAULTS, ntfyUrl: 'http://127.0.0.1:9/portfolio-leads', storePath, host: '127.0.0.1', port: 0 });
    const held = /** @type {string | null} */ (heldAtListen);
    assert.ok(held !== null && !held.includes('"id":"old"'), 'the expired lead was gone before the port opened');
    assert.deepEqual(await leadIds(storePath), ['recent'], 'purged at start');

    // A lead that passes the period while the handler runs goes with the daily purge.
    await fs.appendFile(storePath, `${storedLead('aged', ago(LEAD_RETENTION_DAYS + 1))}\n${sentStatus('aged')}\n`);
    mock.timers.tick(DAY_MS);
    let ids = await leadIds(storePath);
    for (let attempt = 0; ids.includes('aged') && attempt < 50; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      ids = await leadIds(storePath);
    }
    assert.deepEqual(ids, ['recent'], 'purged again a day later');
  } finally {
    mock.timers.reset();
    listen.mock.restore();
    quiet.mock.restore();
    await new Promise((resolve) => (server ? server.close(() => resolve(undefined)) : resolve(undefined)));
    await fs.rm(dir, { recursive: true, force: true });
  }
});