#!/usr/bin/env node
// Small first-party Reporting API sink for the portfolio's CSP policy.
//
// Reports are attacker-controlled input. Keep this service private behind the
// portfolio Caddy route, accept only bounded JSON, redact URLs before storage,
// and rotate the append-only log so a report flood cannot fill the VPS disk.
// Each stored report carries a category (synthetic, extension, first-party or
// other) worked out from its redacted fields; scripts/csp-report-summary.mjs
// reads them back for the nightly.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {object} ReporterConfig
 * @property {string} host
 * @property {number} port
 * @property {string} logPath
 * @property {number} maxBodyBytes
 * @property {number} maxLineBytes
 * @property {number} maxLogBytes
 * @property {number} maxReportsPerRequest
 * @property {number} maxRequestsPerMinute
 * @property {string} siteOrigin
 * @property {readonly string[]} [ownSamples] the start of each of the site's own inline blocks
 */

/** @type {ReporterConfig} */
export const DEFAULT_CONFIG = Object.freeze({
  host: '0.0.0.0',
  port: 8080,
  logPath: '/var/lib/csp-reports/reports.ndjson',
  maxBodyBytes: 64 * 1024,
  maxLineBytes: 8 * 1024,
  maxLogBytes: 5 * 1024 * 1024,
  maxReportsPerRequest: 20,
  maxRequestsPerMinute: 120,
  siteOrigin: 'https://portfolio.getparkerai.com',
  ownSamples: Object.freeze([]),
});

export const REPORT_CATEGORIES = Object.freeze(['synthetic', 'extension', 'first-party', 'other']);

// Schemes a browser gives an extension's own files. Safari hides the URL of
// extension content behind webkit-masked-url.
const EXTENSION_SCHEMES = new Set([
  'chrome-extension',
  'moz-extension',
  'safari-extension',
  'safari-web-extension',
  'ms-browser-extension',
  'webkit-masked-url',
]);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function positiveInteger(value, fallback, label) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

export function loadConfig(env = process.env) {
  const logPath = String(env.CSP_REPORT_LOG ?? DEFAULT_CONFIG.logPath).trim();
  if (!logPath || !path.isAbsolute(logPath)) {
    throw new Error('CSP_REPORT_LOG must be an absolute path.');
  }
  const siteOrigin = String(env.CSP_REPORT_SITE_ORIGIN ?? DEFAULT_CONFIG.siteOrigin).trim();
  let parsedOrigin = null;
  try {
    parsedOrigin = new URL(siteOrigin).origin;
  } catch {
    parsedOrigin = null;
  }
  if (parsedOrigin !== siteOrigin || !siteOrigin.startsWith('https://')) {
    throw new Error('CSP_REPORT_SITE_ORIGIN must be an https origin, such as https://portfolio.getparkerai.com.');
  }

  return {
    siteOrigin,
    ownSamples: decodeOwnSamples(env.CSP_OWN_SAMPLES),
    host: String(env.CSP_REPORT_HOST ?? DEFAULT_CONFIG.host),
    port: positiveInteger(env.CSP_REPORT_PORT, DEFAULT_CONFIG.port, 'CSP_REPORT_PORT'),
    logPath,
    maxBodyBytes: positiveInteger(env.CSP_REPORT_MAX_BODY_BYTES, DEFAULT_CONFIG.maxBodyBytes, 'CSP_REPORT_MAX_BODY_BYTES'),
    maxLineBytes: positiveInteger(env.CSP_REPORT_MAX_LINE_BYTES, DEFAULT_CONFIG.maxLineBytes, 'CSP_REPORT_MAX_LINE_BYTES'),
    maxLogBytes: positiveInteger(env.CSP_REPORT_MAX_LOG_BYTES, DEFAULT_CONFIG.maxLogBytes, 'CSP_REPORT_MAX_LOG_BYTES'),
    maxReportsPerRequest: positiveInteger(
      env.CSP_REPORT_MAX_REPORTS_PER_REQUEST,
      DEFAULT_CONFIG.maxReportsPerRequest,
      'CSP_REPORT_MAX_REPORTS_PER_REQUEST',
    ),
    maxRequestsPerMinute: positiveInteger(
      env.CSP_REPORT_MAX_REQUESTS_PER_MINUTE,
      DEFAULT_CONFIG.maxRequestsPerMinute,
      'CSP_REPORT_MAX_REQUESTS_PER_MINUTE',
    ),
  };
}

function boundedText(value, maxLength = 256) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function boundedNumber(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

// What a browser sends as blockedURL or sourceFile when it has no URL to give:
// a keyword such as "inline", "eval" or "wasm-eval", or only the scheme of a URL
// it won't disclose, such as "chrome-extension", "data" or "blob".
const BARE_TOKEN = /^[a-z][a-z0-9+.-]{0,31}$/i;

function redactUrl(value, { allowBareToken = false } = {}) {
  const text = boundedText(value, 2048);
  if (!text) return null;
  if (allowBareToken && BARE_TOKEN.test(text)) return text.toLowerCase();

  try {
    const url = new URL(text);
    if (url.protocol === 'blob:') return 'blob';
    // Only http(s) and a few other schemes have an origin. For the rest, an
    // extension's among them, keep the scheme, which is what marks an
    // extension, and drop the id and path, which say which one it is.
    if (url.origin === 'null') return `${url.protocol}//(redacted)`;
    const pathname = url.pathname.slice(0, 512) || '/';
    return `${url.origin}${pathname}`;
  } catch {
    const scheme = text.match(/^[a-z][a-z0-9+.-]*:/i)?.[0]?.toLowerCase();
    return scheme ? `${scheme}//(redacted)` : '(invalid-url)';
  }
}

// The first 40 characters of the inline script or style a browser refused,
// sent because the policy asks for 'report-sample'. It's there to tell the
// site's own inline code from anything else, and the deploy hands the sink
// the start of each of the site's own blocks (CSP_OWN_SAMPLES), which is
// public code. A sample that is one of those, or a start of one, is stored as
// it came. Any other sample could be an extension's code or a visitor's text,
// holding an ID, a key or an address in whatever spelling, so four rounds of
// scrub rules kept missing some (tenth, eleventh, fifteenth and seventeenth
// drain reviews). It's stored as the bare marker `[other]`. A keyed hash of it
// was tried and dropped: with the key beside the store, a short secret came
// back from its hash in seconds (nineteenth drain review), and grouping other
// samples bought nothing, since the site's own blocks keep their text.
export const OWN_SAMPLE_LENGTH = 40;
export const OTHER_SAMPLE = '[other]';
const MIN_OWN_MATCH = 16;

/** The site's own sample starts, from CSP_OWN_SAMPLES (base64url JSON array). */
export function decodeOwnSamples(value) {
  if (value === undefined || value === '') return [];
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
  } catch {
    parsed = null;
  }
  if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === 'string' && entry.length > 0)) {
    throw new Error('CSP_OWN_SAMPLES must be a base64url JSON array of non-empty strings.');
  }
  return parsed.map((entry) => entry.slice(0, OWN_SAMPLE_LENGTH));
}

/**
 * What to store for a sample: the sample itself when it's the start of one of
 * the site's own blocks, otherwise `[other]`.
 * @param {unknown} value
 * @param {{ ownSamples?: readonly string[] }} [options]
 */
export function storedSample(value, { ownSamples = [] } = {}) {
  if (typeof value !== 'string' || value === '') return null;
  const text = value.slice(0, 256).replace(/\r\n?/g, '\n');
  const own = ownSamples.some((start) => start.startsWith(text) && text.length >= Math.min(MIN_OWN_MATCH, start.length));
  return own ? text : OTHER_SAMPLE;
}

function schemeOf(value) {
  if (typeof value !== 'string') return null;
  return value.match(/^([a-z][a-z0-9+.-]*)(?::|$)/i)?.[1]?.toLowerCase() ?? null;
}

// Every field used here was written by whoever sent the report, so a category
// says what the report claims, not what happened. The live smoke's reports
// (scripts/smoke-live-site.mjs) are synthetic; anything an extension's file
// caused or tripped over is an extension's; the rest splits by whether the
// document is this site.
export function classifyReport(report, siteOrigin = DEFAULT_CONFIG.siteOrigin) {
  let documentOrigin = null;
  let documentPath = '';
  try {
    const url = new URL(report?.document);
    documentOrigin = url.origin;
    documentPath = url.pathname;
  } catch {
    documentOrigin = null;
  }
  let blockedHost = null;
  try {
    blockedHost = new URL(report?.blocked).hostname;
  } catch {
    blockedHost = null;
  }
  if (documentPath.startsWith('/__live-smoke-') || blockedHost === 'live-smoke.invalid') return 'synthetic';
  if ([report?.blocked, report?.source].some((value) => EXTENSION_SCHEMES.has(schemeOf(value)))) return 'extension';
  return documentOrigin === siteOrigin ? 'first-party' : 'other';
}

function directive(value) {
  const text = boundedText(value, 64);
  return text && /^[a-z][a-z0-9-]*$/i.test(text) ? text : null;
}

function reportBody(report) {
  if (!report || typeof report !== 'object') return {};
  if (report.body && typeof report.body === 'object') return report.body;
  if (report['csp-report'] && typeof report['csp-report'] === 'object') return report['csp-report'];
  return report;
}

function reportType(report) {
  const type = boundedText(report?.type, 64);
  return type && /^[a-z][a-z0-9-]*$/i.test(type) ? type : 'csp-violation';
}

/**
 * @param {{ ownSamples?: readonly string[] }} [samples] the site's own sample starts, for storedSample
 */
export function normalizeReport(report, receivedAt = new Date(), siteOrigin = DEFAULT_CONFIG.siteOrigin, samples = undefined) {
  const body = reportBody(report);
  const normalized = {
    receivedAt: receivedAt.toISOString(),
    type: reportType(report),
    document: redactUrl(body.documentURL ?? body['document-uri'] ?? report?.url),
    blocked: redactUrl(body.blockedURL ?? body['blocked-uri'], { allowBareToken: true }),
    source: redactUrl(body.sourceFile ?? body['source-file'], { allowBareToken: true }),
    directive: directive(body.effectiveDirective ?? body['effective-directive'] ?? body.violatedDirective ?? body['violated-directive']),
    sample: storedSample(body.sample ?? body['script-sample'], samples),
    disposition: boundedText(body.disposition, 32),
    statusCode: boundedNumber(body.statusCode ?? body['status-code'], 100, 599),
    age: boundedNumber(report?.age, 0, 86_400_000),
  };
  normalized.category = classifyReport(normalized, siteOrigin);

  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== null));
}

export function normalizeReports(
  payload,
  receivedAt = new Date(),
  maxReports = DEFAULT_CONFIG.maxReportsPerRequest,
  siteOrigin = DEFAULT_CONFIG.siteOrigin,
  samples = undefined,
) {
  if (payload === null || typeof payload !== 'object') {
    throw new HttpError(400, 'Report body must be a JSON object or array.');
  }
  const reports = Array.isArray(payload) ? payload : [payload];
  if (reports.length < 1 || reports.length > maxReports) {
    throw new HttpError(413, `Report batch must contain 1-${maxReports} reports.`);
  }
  return reports.map((report) => normalizeReport(report, receivedAt, siteOrigin, samples));
}

export function createRateLimiter(maxRequests, windowMs = 60_000, now = () => Date.now()) {
  let windowStart = 0;
  let requestCount = 0;

  return function allow() {
    const current = now();
    if (current - windowStart >= windowMs) {
      windowStart = current;
      requestCount = 0;
    }
    requestCount += 1;
    return requestCount <= maxRequests;
  };
}

async function readBody(request, maxBytes) {
  const contentLength = Number(request.headers['content-length']);
  if (Number.isSafeInteger(contentLength) && contentLength > maxBytes) {
    request.resume();
    throw new HttpError(413, 'Report body is too large.');
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      request.resume();
      throw new HttpError(413, 'Report body is too large.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function responseHeaders() {
  return {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
}

function sendResponse(response, status, body = '', extraHeaders = {}) {
  response.writeHead(status, { ...responseHeaders(), ...extraHeaders });
  response.end(body);
}

function rotatedLogPath(logPath) {
  return `${logPath}.1`;
}

export function createReporter(config = DEFAULT_CONFIG, dependencies = {}) {
  const fileSystem = dependencies.fileSystem ?? fs;
  const now = dependencies.now ?? (() => new Date());
  const allowRequest = createRateLimiter(config.maxRequestsPerMinute, 60_000, () => now().getTime());
  let writeQueue = Promise.resolve();

  async function appendLines(lines) {
    const text = `${lines.join('\n')}\n`;
    if (Buffer.byteLength(text, 'utf8') > config.maxLineBytes * lines.length) {
      throw new HttpError(413, 'Normalized report is too large.');
    }

    const task = writeQueue.catch(() => undefined).then(async () => {
      await fileSystem.mkdir(path.dirname(config.logPath), { recursive: true });
      let currentSize = 0;
      try {
        currentSize = (await fileSystem.stat(config.logPath)).size;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }

      if (currentSize + Buffer.byteLength(text, 'utf8') > config.maxLogBytes) {
        const rotated = rotatedLogPath(config.logPath);
        try {
          await fileSystem.unlink(rotated);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
        try {
          await fileSystem.rename(config.logPath, rotated);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }

      await fileSystem.appendFile(config.logPath, text, { encoding: 'utf8', mode: 0o600 });
      try {
        await fileSystem.chmod(config.logPath, 0o600);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    });
    writeQueue = task;
    await task;
  }

  async function handleRequest(request, response) {
    const pathname = new URL(request.url ?? '/', 'http://csp-reporter').pathname;
    if (pathname === '/healthz' && request.method === 'GET') {
      sendResponse(response, 200, 'ok\n', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
    if (pathname !== '/csp-report') {
      sendResponse(response, 404, 'Not found\n', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
    if (request.method !== 'POST') {
      sendResponse(response, 405, 'Method not allowed\n', {
        Allow: 'POST',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      return;
    }
    if (!allowRequest()) {
      request.resume();
      sendResponse(response, 429, 'Too many reports\n', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
    const contentType = String(request.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase();
    if (!['application/reports+json', 'application/csp-report', 'application/json'].includes(contentType)) {
      request.resume();
      sendResponse(response, 415, 'Unsupported report content type\n', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }

    try {
      const rawBody = await readBody(request, config.maxBodyBytes);
      let payload;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        throw new HttpError(400, 'Report body must be valid JSON.');
      }
      const samples = { ownSamples: config.ownSamples ?? [] };
      const reports = normalizeReports(payload, now(), config.maxReportsPerRequest, config.siteOrigin ?? DEFAULT_CONFIG.siteOrigin, samples);
      const lines = reports.map((report) => JSON.stringify(report));
      if (lines.some((line) => Buffer.byteLength(line, 'utf8') > config.maxLineBytes)) {
        throw new HttpError(413, 'Normalized report is too large.');
      }
      await appendLines(lines);
      sendResponse(response, 204, '', { 'X-CSP-Report-Stored': 'yes' });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status >= 500) console.error(`csp-report: ${error.message}`);
      sendResponse(response, status, `${error.message}\n`, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
  }

  /**
   * Rewrite every stored sample under today's rule: rows written before the
   * sink kept only the site's own samples carry whatever the old scrub rules
   * let through. Each file is rewritten to a temporary one and renamed over,
   * and a sample that is already a marker or the site's own stays as it is,
   * so running it again changes nothing. Called before the server listens.
   * @returns {Promise<number>} how many samples became markers
   */
  async function restoreSamples() {
    const samples = { ownSamples: config.ownSamples ?? [] };
    // The key file the keyed-hash marker used, if a sink ever made one.
    await fileSystem.rm(path.join(path.dirname(config.logPath), 'sample.key'), { force: true });
    let changed = 0;
    for (const file of [config.logPath, rotatedLogPath(config.logPath)]) {
      let text;
      try {
        text = await fileSystem.readFile(file, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      let fileChanged = 0;
      const lines = text.split('\n').map((line) => {
        let row;
        try {
          row = JSON.parse(line);
        } catch {
          return line;
        }
        if (!row || typeof row !== 'object' || typeof row.sample !== 'string' || row.sample === OTHER_SAMPLE) return line;
        const stored = storedSample(row.sample, samples);
        if (stored === row.sample) return line;
        fileChanged += 1;
        return JSON.stringify({ ...row, sample: stored });
      });
      if (fileChanged === 0) continue;
      const temporary = `${file}.restore`;
      await fileSystem.writeFile(temporary, lines.join('\n'), { encoding: 'utf8', mode: 0o600 });
      await fileSystem.rename(temporary, file);
      changed += fileChanged;
    }
    return changed;
  }

  return { handleRequest, restoreSamples };
}

export async function startServer(config = loadConfig()) {
  const reporter = createReporter(config);
  // Before the first report can arrive, so nothing is appended mid-rewrite.
  const restored = await reporter.restoreSamples();
  if (restored > 0) console.log(`csp-report: stored ${restored} older sample(s) as markers`);
  const server = http.createServer((request, response) => {
    reporter.handleRequest(request, response).catch((error) => {
      console.error(`csp-report: unhandled request error: ${error.message}`);
      if (!response.headersSent) sendResponse(response, 500, 'Internal server error\n', { 'Content-Type': 'text/plain; charset=utf-8' });
      else response.destroy();
    });
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 12_000;
  server.listen(config.port, config.host, () => {
    console.log(`csp-report: listening on ${config.host}:${config.port}`);
  });
  return server;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  startServer().catch((error) => {
    console.error(`csp-report: could not start: ${error.message}`);
    process.exit(1);
  });
}
