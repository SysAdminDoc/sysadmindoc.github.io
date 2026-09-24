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
  scrubSample,
} from '../deploy/vps/csp-report-server.mjs';
import { SMOKE_REPORT_SAMPLE, smokeReportProblem } from '../scripts/lib/csp-report-summary.mjs';

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
    sample: 'window.__cfg={user:"[id]",',
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

test('scrubSample drops ids, long numbers, email addresses and control characters, and stays short', () => {
  assert.equal(scrubSample('.dark-reader{color:#fff}'), '.dark-reader{color:#fff}');
  assert.equal(scrubSample('var k="AKIA1234567890ABCDEF";'), 'var k="[id]";');
  assert.equal(scrubSample('uid=4815162342;'), 'uid=[number];');
  assert.equal(scrubSample('mail("someone@example.com")'), 'mail("[email]")');
  assert.equal(scrubSample('a\u202Eb\nc\u0007d\u2066e\u2028f\uFEFFg'), 'a b c d e f g');
  // Stays short. (Spaced, since a 40-character run is now an opaque token.)
  assert.equal(scrubSample('x '.repeat(100)), 'x '.repeat(20));
  // The tenth drain review's samples: a Chrome extension ID is letters only,
  // an extension URL cut mid-ID still names it, card and phone numbers come in
  // groups, and the 40-character cut can leave an email without its domain.
  assert.equal(scrubSample('id="cjpalhdlnbpafiamejdnhcphjbkeiagm";'), 'id="[id]";');
  assert.equal(scrubSample('url(chrome-extension://nngceckbapebfimnl'), 'url(chrome-extension://[extension]');
  assert.equal(scrubSample('card 4111 1111 1111 1111;'), 'card [number];');
  assert.equal(scrubSample('card 4111-1111-1111-1111;'), 'card [number];');
  assert.equal(scrubSample('tel:+1-555-867-5309'), 'tel:[number]');
  assert.equal(scrubSample('mailto:john.doe@'), '[email]');
  // Short numbers and ordinary CSS stay as they are.
  assert.equal(scrubSample('box-shadow:0 0 1px 2px rgba(0,0,0,.5)'), 'box-shadow:0 0 1px 2px rgba(0,0,0,.5)');
  // Plain words and short numbers are code, not identifiers.
  assert.equal(scrubSample('document.addEventListener("load",f,!0)'), 'document.addEventListener("load",f,!0)');
  for (const value of [undefined, null, 42, '', '   ']) assert.equal(scrubSample(value), null);
});

// The eleventh drain review's samples, each of which leaked or was mangled.
test('scrubSample catches what it missed and leaves code it mangled alone', () => {
  // A 32-letter extension ID cut to 12 by the 40-character sample.
  assert.equal(scrubSample('chrome.runtime.sendMessage("abcdefghijklmnopabcdefghijklmnop",x)'), 'chrome.runtime.sendMessage("[id]');
  assert.equal(scrubSample('john.smith%40example.com'), '[email]');
  assert.equal(scrubSample('pan=4111_1111_1111_1111;'), 'pan=[number];');
  assert.equal(scrubSample('tel 555/123/4567'), 'tel [number]');

  assert.equal(scrubSample('--portfolio-accent-highlight-strong:red'), '--portfolio-accent-highlight-strong:red', 'a long custom property');
  assert.equal(scrubSample('<path d="M12 2C6.48 2 2 6.48 2 12s4.48"'), '<path d="M12 2C6.48 2 2 6.48 2 12s4.48"', 'path data');
  assert.equal(scrubSample('var built="2026-09-24T12:00:00Z";'), 'var built="2026-09-24T12:00:00Z";', 'an ISO date');
  // A short sample isn't cut, so a trailing word stays.
  assert.equal(scrubSample('f("headline")'), 'f("headline")');
});

// The fifteenth drain review's samples: four leaks and two regressions.
test('scrubSample finds a cut in a sample with line breaks, a cut ID after any mark, and an at sign however it is written', () => {
  // Cut at 40 by the browser, 28 once its whitespace collapses.
  const indented = `if(a){\n${' '.repeat(12)}send("abcdefghijklmnopabcdefghijklmnop`.slice(0, 40);
  assert.equal(indented.length, 40);
  assert.equal(scrubSample(indented), 'if(a){ send("[id]');
  assert.equal(scrubSample(`x = headline${' '.repeat(28)}`), 'x = headline', 'a sample that ends in whitespace ended on a whole word');
  for (const mark of ['{', '[', '/', ';']) {
    assert.equal(scrubSample(`${'x=1;'.repeat(8)}${mark}abcdefghijklmnop`), `${'x=1;'.repeat(8)}${mark}[id]`, mark);
  }

  const backslash = '\\';
  const ats = ['%2540', '%252540', `${backslash}x40`, `${backslash}u0040`, `${backslash}u{40}`, '&#64;', '&#x40;', `${backslash}40 `, String.fromCharCode(0xff20), String.fromCharCode(0xfe6b)];
  for (const at of ats) assert.equal(scrubSample(`mail("jane${at}example.com")`), 'mail("[email]")', JSON.stringify(at));
});

test('scrubSample scrubs an ID joined to a word and a number dialled abroad again', () => {
  assert.equal(scrubSample('--abcdefghijklmnopabcdefghijklmnop-root:1'), '[id]:');
  assert.equal(scrubSample('x:var(--Abcdefghijklmnopqrstu-bg)'), 'x:var([id])', 'a 21-letter word is no word');
  assert.equal(scrubSample('--portfolio-accent-highlight-strong:red'), '--portfolio-accent-highlight-strong:red', 'a long custom property still stays');
  assert.equal(scrubSample('tel:+33 6 12 34 56 78'), 'tel:[number]');
  assert.equal(scrubSample('tel:0033 6 12 34 56 78'), 'tel:[number]');
  assert.equal(scrubSample('<path d="M12 2C6.48 2 2 6.48 2 12s4.48"'), '<path d="M12 2C6.48 2 2 6.48 2 12s4.48"', 'path data still stays');
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
    assert.equal(stored.sample, 'body{--visitor:[number];color:red}');
    assert.doesNotMatch(lines[0], /48151623/);
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
