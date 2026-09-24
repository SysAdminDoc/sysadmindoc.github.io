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
// sent because the policy asks for 'report-sample'. The site's own inline code
// is public, but an extension's can open with a per-user id or key, so anything
// shaped like one goes before the sample is stored, along with control and
// direction characters that could disguise what a log line says. In order: an
// email address, even one the 40-character cut left without its domain, or
// with its @ written %40; an extension's URL, which names the extension even
// when cut short; any run of 24 or more letters, digits, _ or - (a Chrome
// extension ID is 32 letters a to p) unless it's words joined by hyphens, like
// a long custom property, and a shorter one of 12 or more that mixes letters
// and digits; at the 40-character cut, 6 or more letters a to p opening a
// string or argument, which is what's left of an ID cut short; digits split by
// spaces, dashes, dots, slashes, underscores or brackets that come to 7 or more
// in groups of 2 or more after the first (card and phone numbers, but not an
// ISO date or a path's single-digit coordinates); and any 6 digits in a row.
// The eleventh drain review found the %40, _ and / numbers and the cut ID
// leaking, and custom properties, dates and path data mangled.
export function scrubSample(value) {
  if (typeof value !== 'string') return null;
  const whole = value
    .slice(0, 256)
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const cut = whole.length >= 40;
  let text = whole
    .slice(0, 40)
    .replace(/[^\s@"'`<>(){};,]+?(?:@|%40)[^\s@"'`<>(){};,]*/gi, '[email]')
    .replace(/\b([a-z]+(?:-[a-z]+)*-extension|webkit-masked-url):\/\/[^\s"'`<>()]*/gi, '$1://[extension]')
    .replace(/[A-Za-z0-9_-]{12,}/g, (run) => {
      if (/^-{0,2}[A-Za-z]+(?:-[A-Za-z]+)+$/.test(run) || /^\d{4}-\d{2}-\d{2}(?:T\d{2})?$/.test(run)) return run;
      return run.length >= 24 || (/\d/.test(run) && /[A-Za-z]/.test(run)) ? '[id]' : run;
    });
  if (cut) text = text.replace(/(["'`(=,:\s])[a-p]{6,}$/, '$1[id]');
  text = text
    .replace(/\+?\d[\d ()./_-]{4,}\d/g, (run) => {
      if (/^\d{4}([-/.])\d{2}\1\d{2}$/.test(run)) return run;
      const groups = run.split(/\D+/).filter(Boolean);
      return groups.join('').length >= 7 && groups.slice(1).every((group) => group.length >= 2) ? '[number]' : run;
    })
    .replace(/\d{6,}/g, '[number]');
  return text || null;
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

export function normalizeReport(report, receivedAt = new Date(), siteOrigin = DEFAULT_CONFIG.siteOrigin) {
  const body = reportBody(report);
  const normalized = {
    receivedAt: receivedAt.toISOString(),
    type: reportType(report),
    document: redactUrl(body.documentURL ?? body['document-uri'] ?? report?.url),
    blocked: redactUrl(body.blockedURL ?? body['blocked-uri'], { allowBareToken: true }),
    source: redactUrl(body.sourceFile ?? body['source-file'], { allowBareToken: true }),
    directive: directive(body.effectiveDirective ?? body['effective-directive'] ?? body.violatedDirective ?? body['violated-directive']),
    sample: scrubSample(body.sample ?? body['script-sample']),
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
) {
  if (payload === null || typeof payload !== 'object') {
    throw new HttpError(400, 'Report body must be a JSON object or array.');
  }
  const reports = Array.isArray(payload) ? payload : [payload];
  if (reports.length < 1 || reports.length > maxReports) {
    throw new HttpError(413, `Report batch must contain 1-${maxReports} reports.`);
  }
  return reports.map((report) => normalizeReport(report, receivedAt, siteOrigin));
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
      const reports = normalizeReports(payload, now(), config.maxReportsPerRequest, config.siteOrigin ?? DEFAULT_CONFIG.siteOrigin);
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

  return { handleRequest };
}

export function startServer(config = loadConfig()) {
  const reporter = createReporter(config);
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
if (isMain) startServer();
