import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  classifyReport,
  createReporter,
  DEFAULT_CONFIG,
  loadConfig,
  normalizeReport,
  normalizeReports,
  decodeOwnSamples,
  storedSample,
} from '../deploy/vps/csp-report-server.mjs';
import { SMOKE_REPORT_SAMPLE, smokeReportProblem } from '../scripts/lib/csp-report-summary.mjs';
import { encodeOwnSamples } from '../scripts/lib/csp-own-samples.mjs';

async function withTempReporter(options = {}, callback) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-csp-report-'));
  const logPath = path.join(dir, 'reports.ndjson');
  const reporter = createReporter({ ...DEFAULT_CONFIG, logPath, ...options });
  try {
    return await callback({ reporter, logPath, dir });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function requestMock({ method = 'POST', url = '/csp-report', body = '', headers = {} } = {}) {
  const listeners = new Map();
  return {
    method,
    url,
    headers: { 'content-length': String(Buffer.byteLength(body)), 'content-type': 'application/reports+json', ...headers },
    resume() {},
    on(event, handler) {
      listeners.set(event, handler);
      return this;
    },
    async *[Symbol.asyncIterator]() {
      if (body) yield Buffer.from(body);
    },
  };
}

function responseMock() {
  return {
    status: null,
    headers: null,
    body: '',
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body = '') {
      this.body = body;
    },
  };
}

test('normalizeReport keeps diagnostic paths but drops query strings and user data', () => {
  const report = normalizeReport({
    type: 'csp-violation',
    url: 'https://portfolio.getparkerai.com/status/?email=private',
    user_agent: 'secret browser fingerprint',
    body: {
      documentURL: 'https://portfolio.getparkerai.com/status/?email=private',
      blockedURL: 'https://cdn.example.test/script.js?token=private',
      sourceFile: 'https://portfolio.getparkerai.com/app.js?secret=private',
      effectiveDirective: 'script-src',
      // An extension's inline script can open with a per-user id.
      sample: 'window.__cfg={user:"u-9f8e7d6c5b4a3210",n:1};',
      statusCode: 200,
    },
  }, new Date('2026-08-20T12:00:00.000Z'));

  assert.deepEqual(report, {
    receivedAt: '2026-08-20T12:00:00.000Z',
    type: 'csp-violation',
    document: 'https://portfolio.getparkerai.com/status/',
    blocked: 'https://cdn.example.test/script.js',
    source: 'https://portfolio.getparkerai.com/app.js',
    directive: 'script-src',
    // Not the site's own code, and no key given, so nothing of it is kept.
    sample: '[other]',
    statusCode: 200,
    category: 'first-party',
  });
  assert.doesNotMatch(JSON.stringify(report), /private|user_agent|9f8e7d6c/);
});

test('normalizeReport keeps the keyword or scheme a browser sends instead of a URL', () => {
  const at = new Date('2026-09-23T12:00:00.000Z');
  const report = (body) => normalizeReport({ type: 'csp-violation', body: { documentURL: 'https://portfolio.getparkerai.com/', ...body } }, at);

  // These arrived as '(invalid-url)' before, 262 of the first 327 stored.
  assert.equal(report({ blockedURL: 'inline' }).blocked, 'inline');
  assert.equal(report({ blockedURL: 'EVAL' }).blocked, 'eval');
  assert.equal(report({ blockedURL: 'wasm-eval' }).blocked, 'wasm-eval');
  assert.equal(report({ blockedURL: 'inline', sourceFile: 'chrome-extension' }).source, 'chrome-extension');
  assert.equal(report({ blockedURL: 'blob:https://portfolio.getparkerai.com/4f1c-77aa' }).blocked, 'blob');
  // An extension URL keeps its scheme and loses the id that names the extension.
  assert.equal(report({ blockedURL: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop/inject.js' }).blocked, 'chrome-extension://(redacted)');
  assert.equal(report({ sourceFile: 'moz-extension://2f1b8c9e-0d3a-4b7c-9e21-1a2b3c4d5e6f/content.js' }).source, 'moz-extension://(redacted)');
  // A document is always a page, so a bare word there is still unreadable.
  assert.equal(normalizeReport({ body: { documentURL: 'inline' } }, at).document, '(invalid-url)');
  assert.equal(report({ blockedURL: 'not a url at all' }).blocked, '(invalid-url)');
});

const MARKER = /^\[other\]$/;
// The start of the critical CSS and the no-JS reveal block, as a build has them.
const OWN = ['.rv,.card-enter{opacity:1!important;tra', ':root{--bg:#050913;--bg2:#0b1220;--bg3:#'];

test("a sample from the site's own code is kept as it came, and any other as the bare marker", () => {
  const stored = (value) => storedSample(value, { ownSamples: OWN });
  assert.equal(stored(OWN[0]), OWN[0]);
  assert.equal(stored(OWN[1].slice(0, 20)), OWN[1].slice(0, 20), 'a start of one of them is public code too');
  assert.match(stored(OWN[1].slice(0, 10)), MARKER, 'but not a scrap too short to say whose it is');
  assert.match(stored(`${OWN[0]}x`), MARKER, 'nor anything that goes past it');
  assert.equal(stored(`${OWN[0].slice(0, 20)}\r\n`), stored(`${OWN[0].slice(0, 20)}\n`), 'line endings read as one');
  // No hash: with its key beside the store, a short secret came back from it
  // in seconds (nineteenth drain review).
  assert.equal(stored('window.foo=1'), '[other]');
  assert.equal(storedSample('window.foo=1'), '[other]', 'with no list of its own, nothing is the site\'s');
  for (const value of [undefined, null, 42, '']) assert.equal(stored(value), null);
});

// Every sample a scrub rule let through in the tenth, eleventh, fifteenth and
// seventeenth drain reviews, and the ones it mangled. None is the site's own,
// so each is kept as nothing but the marker.
test('no visitor or extension text survives, whatever it holds', () => {
  const backslash = '\\';
  const samples = [
    'window.__cfg={user:"u-9f8e7d6c5b4a3210",n:1};',
    'var k="AKIA1234567890ABCDEF";',
    'mail("someone@example.com")',
    'id="cjpalhdlnbpafiamejdnhcphjbkeiagm";',
    'url(chrome-extension://nngceckbapebfimnl',
    'card 4111 1111 1111 1111;',
    'tel:+33 6 12 34 56 78',
    'john.smith%40example.com',
    'jane.doe&commat;example.com',
    `jane.doe${backslash}100example.com`,
    'jane (at) example [dot] com',
    'k="Zm9vYmFy+YmF6cXV4/cXV1eA=="',
    'addr 203.0.113.9 mac 00:1a:2b:3c:4d:5e',
    'fe80::1ff:fe23:4567:890a',
    `mail("jane${String.fromCharCode(0xff20)}example.com")`,
    '--abcdefghijklmnopabcdefghijklmnop-root:1',
  ];
  const stored = samples.map((sample) => storedSample(sample, { ownSamples: OWN }));
  for (const [index, value] of stored.entries()) assert.match(value, MARKER, samples[index]);
});

test("the site's own samples arrive base64url-encoded, and a bad value stops the sink", () => {
  assert.deepEqual(decodeOwnSamples(encodeOwnSamples(OWN)), OWN);
  assert.deepEqual(decodeOwnSamples(encodeOwnSamples(['x'.repeat(80)])), ['x'.repeat(64)], 'only a start a little past a sample is kept');
  assert.deepEqual(decodeOwnSamples(undefined), []);
  assert.throws(() => decodeOwnSamples('not-json'), /CSP_OWN_SAMPLES/);
  assert.throws(() => decodeOwnSamples(encodeOwnSamples(['ok', ''])), /CSP_OWN_SAMPLES/);
  assert.deepEqual(loadConfig({ CSP_OWN_SAMPLES: encodeOwnSamples(OWN) }).ownSamples, OWN);
  assert.deepEqual(loadConfig({}).ownSamples, []);
});

// The eleventh drain review: at 120 requests a minute of 20 reports each,
// forged rows can rotate the smoke's row out of the store's two files before
// the deploy reads it back. The read-back then has to say so.
test('a flood between the smoke and the read-back is named, not mistaken for a missing smoke', async () => {
  await withTempReporter({ maxLogBytes: 2000, maxRequestsPerMinute: 10_000 }, async ({ reporter, logPath }) => {
    const since = Math.floor(Date.now() / 1000) - 1;
    const runId = 'flood1';
    const post = async (documentURL, sample) => {
      const body = JSON.stringify({ type: 'csp-violation', url: documentURL, body: { documentURL, effectiveDirective: 'script-src', blockedURL: 'https://live-smoke.invalid/synthetic.js', sample } });
      const response = responseMock();
      await reporter.handleRequest(requestMock({ body }), response);
      assert.equal(response.status, 204);
    };
    // What the deploy reads: this run's rows from both files, and the rotated
    // file's oldest row.
    const readBack = async () => {
      const files = await Promise.all([`${logPath}.1`, logPath].map((file) => fs.readFile(file, 'utf8').catch(() => '')));
      const text = files.join('\n').split('\n').filter((line) => line.includes(`/__live-smoke-${runId}/`)).join('\n');
      const oldest = files[0].split('\n')[0] ?? '';
      return smokeReportProblem(text, { since, runId, oldest });
    };

    // A store younger than the deploy's margin, without the smoke's row: that
    // row is missing, not pushed out (fifteenth drain review).
    await post('https://portfolio.getparkerai.com/', 'first ever');
    assert.match(await readBack(), /holds no smoke report from this deploy \(run flood1\)/);

    await post(`https://portfolio.getparkerai.com/__live-smoke-${runId}/`, SMOKE_REPORT_SAMPLE);
    assert.equal(await readBack(), null, 'found with no flood');
    for (let index = 0; index < 5; index += 1) await post('https://portfolio.getparkerai.com/', `forged ${index}`);
    assert.equal(await readBack(), null, 'a few reports after it change nothing');
    for (let index = 0; index < 40; index += 1) await post('https://portfolio.getparkerai.com/', `forged ${index}`);
    assert.match(await readBack(), /rotated past this deploy's smoke report \(run flood1\): its oldest row came in at .*, after the smoke, so a flood of reports pushed it out/);
  });
});

test('classifyReport tells the smoke, extensions, this site and everything else apart', () => {
  const at = new Date('2026-09-23T12:00:00.000Z');
  // The report scripts/smoke-live-site.mjs posts on every deploy.
  const smoke = normalizeReport({
    type: 'csp-violation',
    url: 'https://portfolio.getparkerai.com/__live-smoke-abc123/?synthetic=1',
    body: {
      documentURL: 'https://portfolio.getparkerai.com/__live-smoke-abc123/?synthetic=1',
      effectiveDirective: 'script-src',
      blockedURL: 'https://live-smoke.invalid/synthetic.js?synthetic=1',
    },
  }, at);
  assert.equal(smoke.category, 'synthetic');

  const site = 'https://portfolio.getparkerai.com/';
  assert.equal(classifyReport({ document: site, blocked: 'inline', source: 'moz-extension' }), 'extension');
  assert.equal(classifyReport({ document: site, blocked: 'safari-web-extension://(redacted)' }), 'extension');
  assert.equal(classifyReport({ document: site, blocked: 'inline', source: 'webkit-masked-url://(redacted)' }), 'extension');
  assert.equal(classifyReport({ document: site, blocked: 'inline', source: site }), 'first-party');
  assert.equal(classifyReport({ document: `${site}catalog/`, blocked: 'https://avatars.githubusercontent.com/u/54586742' }), 'first-party');
  assert.equal(classifyReport({ document: 'https://copy.example.test/', blocked: 'inline' }), 'other');
  assert.equal(classifyReport({ document: '(invalid-url)', blocked: 'inline' }), 'other');
  assert.equal(classifyReport({}), 'other');
  assert.equal(classifyReport({ document: 'https://staging.example.test/' }, 'https://staging.example.test'), 'first-party');
});

test('the site origin must be a bare https origin', () => {
  assert.equal(loadConfig({}).siteOrigin, 'https://portfolio.getparkerai.com');
  assert.equal(loadConfig({ CSP_REPORT_SITE_ORIGIN: 'https://staging.example.test' }).siteOrigin, 'https://staging.example.test');
  for (const value of ['https://portfolio.getparkerai.com/', 'http://portfolio.getparkerai.com', 'portfolio.getparkerai.com', '']) {
    assert.throws(() => loadConfig({ CSP_REPORT_SITE_ORIGIN: value }), /CSP_REPORT_SITE_ORIGIN/, value);
  }
});

test('normalizeReports accepts legacy and Reporting API batches with a bounded count', () => {
  const reports = normalizeReports([
    { 'csp-report': { 'document-uri': 'https://portfolio.getparkerai.com/', 'violated-directive': 'img-src' } },
    { type: 'csp-violation', url: 'https://portfolio.getparkerai.com/' },
  ], new Date('2026-08-20T12:00:00.000Z'), 2);

  assert.equal(reports.length, 2);
  assert.equal(reports[0].directive, 'img-src');
  assert.equal(reports[1].document, 'https://portfolio.getparkerai.com/');
  assert.throws(() => normalizeReports([{}, {}, {}], new Date(), 2), /1-2 reports/);
});

test('reporter appends a redacted report and returns a stored marker', async () => {
  await withTempReporter({}, async ({ reporter, logPath }) => {
    const request = requestMock({
      body: JSON.stringify([{
        type: 'csp-violation',
        body: { documentURL: 'https://portfolio.getparkerai.com/', blockedURL: 'inline', effectiveDirective: 'style-src', sample: 'body{--visitor:48151623;color:red}' },
      }]),
      headers: { 'content-type': 'application/reports+json' },
    });
    const response = responseMock();

    await reporter.handleRequest(request, response);

    assert.equal(response.status, 204);
    assert.equal(response.headers['X-CSP-Report-Stored'], 'yes');
    const lines = (await fs.readFile(logPath, 'utf8')).trim().split('\n');
    assert.equal(lines.length, 1);
    const stored = JSON.parse(lines[0]);
    assert.equal(stored.directive, 'style-src');
    assert.equal(stored.blocked, 'inline');
    assert.equal(stored.category, 'first-party');
    assert.match(stored.sample, MARKER);
    assert.doesNotMatch(lines[0], /48151623|visitor/);
  });
});

// Rows written under the old scrub rules keep what those let through until a
// rotation drops them, so the sink rewrites them before it listens.
test('the sink stores older samples as markers at start, once, and leaves the rest of each row alone', async () => {
  await withTempReporter({ ownSamples: OWN }, async ({ logPath }) => {
    // A key a sink with the keyed-hash marker made goes too.
    await fs.writeFile(path.join(path.dirname(logPath), 'sample.key'), 'a'.repeat(44));
    const row = (sample, extra = {}) => JSON.stringify({ receivedAt: '2026-09-20T12:00:00.000Z', directive: 'script-src-elem', blocked: 'inline', category: 'first-party', ...(sample === undefined ? {} : { sample }), ...extra });
    await fs.writeFile(`${logPath}.1`, `${row('mail("[email]") k=Zm9vYmFy+YmF6', { document: 'https://portfolio.getparkerai.com/a/' })}\n`);
    await fs.writeFile(logPath, [row(OWN[0]), row('[other 0123456789ab]'), row(undefined), 'not json', row('addr 203.0.113.9'), ''].join('\n'));
    const reporter = createReporter({ ...DEFAULT_CONFIG, logPath, ownSamples: OWN });
    assert.equal(await reporter.restoreSamples(), 3);
    const rotated = JSON.parse((await fs.readFile(`${logPath}.1`, 'utf8')).trim());
    assert.match(rotated.sample, MARKER);
    assert.equal(rotated.document, 'https://portfolio.getparkerai.com/a/', 'the rest of the row stays');
    const current = (await fs.readFile(logPath, 'utf8')).split('\n');
    assert.equal(JSON.parse(current[0]).sample, OWN[0], "the site's own sample stays");
    assert.equal(JSON.parse(current[1]).sample, '[other]', 'a hashed marker loses its hash');
    assert.equal(JSON.parse(current[2]).sample, undefined);
    assert.equal(current[3], 'not json');
    assert.match(JSON.parse(current[4]).sample, MARKER);
    assert.doesNotMatch(current.join('\n') + rotated.sample, /203\.0\.113\.9|Zm9vYmFy|\[email\]/);
    assert.equal(await reporter.restoreSamples(), 0, 'a second run finds nothing to do');
    assert.deepEqual((await fs.readdir(path.dirname(logPath))).sort(), ['reports.ndjson', 'reports.ndjson.1'], 'no key and no temporary file is left');
  });
});

test("the reporter keeps the site's own sample, and makes no key", async () => {
  await withTempReporter({ ownSamples: OWN }, async ({ logPath }) => {
    const post = async (reporter, sample) => {
      const response = responseMock();
      const body = JSON.stringify({ type: 'csp-violation', body: { documentURL: 'https://portfolio.getparkerai.com/', blockedURL: 'inline', effectiveDirective: 'style-src', sample } });
      await reporter.handleRequest(requestMock({ body }), response);
      assert.equal(response.status, 204);
    };
    const first = createReporter({ ...DEFAULT_CONFIG, logPath, ownSamples: OWN });
    await post(first, OWN[1]);
    await post(first, 'extension-code(1234)');
    const samples = (await fs.readFile(logPath, 'utf8')).trim().split('\n').map((line) => JSON.parse(line).sample);
    assert.deepEqual(samples, [OWN[1], '[other]']);
    assert.deepEqual(await fs.readdir(path.dirname(logPath)), ['reports.ndjson'], 'nothing beside the store');
  });
});

test('reporter rejects oversized bodies, unsupported methods, and unknown paths', async () => {
  await withTempReporter({ maxBodyBytes: 32 }, async ({ reporter }) => {
    const tooLarge = responseMock();
    await reporter.handleRequest(requestMock({ body: JSON.stringify({ value: 'x'.repeat(100) }) }), tooLarge);
    assert.equal(tooLarge.status, 413);

    const method = responseMock();
    await reporter.handleRequest(requestMock({ method: 'GET' }), method);
    assert.equal(method.status, 405);
    assert.equal(method.headers.Allow, 'POST');

    const pathResponse = responseMock();
    await reporter.handleRequest(requestMock({ url: '/other' }), pathResponse);
    assert.equal(pathResponse.status, 404);

    const contentType = responseMock();
    await reporter.handleRequest(requestMock({ headers: { 'content-type': 'text/plain' }, body: '{}' }), contentType);
    assert.equal(contentType.status, 415);
  });
});

test('reporter rotates the log before it exceeds its bound', async () => {
  await withTempReporter({ maxLogBytes: 250 }, async ({ reporter, logPath }) => {
    const report = JSON.stringify({ type: 'csp-violation', body: { documentURL: 'https://portfolio.getparkerai.com/', effectiveDirective: 'script-src' } });
    for (let index = 0; index < 3; index += 1) {
      const response = responseMock();
      await reporter.handleRequest(requestMock({ body: report }), response);
      assert.equal(response.status, 204);
    }

    const rotated = await fs.readFile(`${logPath}.1`, 'utf8');
    const current = await fs.readFile(logPath, 'utf8');
    assert.ok(rotated.length > 0);
    assert.ok(current.length > 0);
    assert.ok(Buffer.byteLength(current) <= 250);
  });
});
