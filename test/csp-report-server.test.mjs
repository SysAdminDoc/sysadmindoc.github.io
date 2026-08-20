import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createReporter, DEFAULT_CONFIG, normalizeReport, normalizeReports } from '../deploy/vps/csp-report-server.mjs';

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
      sample: 'private inline content',
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
    statusCode: 200,
  });
  assert.doesNotMatch(JSON.stringify(report), /private|user_agent|sample/);
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
      body: JSON.stringify([{ type: 'csp-violation', body: { documentURL: 'https://portfolio.getparkerai.com/', effectiveDirective: 'style-src', sample: 'do not store' } }]),
      headers: { 'content-type': 'application/reports+json' },
    });
    const response = responseMock();

    await reporter.handleRequest(request, response);

    assert.equal(response.status, 204);
    assert.equal(response.headers['X-CSP-Report-Stored'], 'yes');
    const lines = (await fs.readFile(logPath, 'utf8')).trim().split('\n');
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).directive, 'style-src');
    assert.doesNotMatch(lines[0], /do not store/);
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
