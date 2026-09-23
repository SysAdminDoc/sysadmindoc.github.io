#!/usr/bin/env node
// First-party contact form handler for the portfolio.
//
// Every accepted submission is written in full to an fsync'd NDJSON store
// before the visitor gets an answer, and only then handed to the local ntfy
// instance. A failed notification leaves the lead pending for retry; it never
// costs the visitor's message. Visitor text travels only in the JSON body sent
// to ntfy, never in an HTTP header: Node's fetch rejects header values above
// U+00FF, which includes the apostrophe an iPhone types in "O’Brien".
//
// Environment:
//   NTFY_URL              required  topic URL, e.g. http://ntfy:80/portfolio-leads
//   NTFY_TOKEN            optional  write-only ntfy access token (tk_...), sent as a Bearer header
//   CONTACT_SMOKE_SECRET  optional  shared secret the live smoke sends in X-Contact-Smoke; such
//                                   leads are stored as synthetic and published to <topic>-smoke,
//                                   which the owner's phone does not subscribe to. A request that
//                                   sends the header with any other value is refused with 403.
//   CONTACT_STORE         optional  absolute path of the lead store (default /var/lib/contact/leads.ndjson)
//   CONTACT_MIN_TIME      optional  minimum seconds between page load and submit (default 3)
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {object} ContactConfig
 * @property {string} host
 * @property {number} port
 * @property {string} ntfyUrl
 * @property {string} ntfyToken
 * @property {string} smokeSecret
 * @property {string} storePath
 * @property {number} minTimeSeconds
 * @property {number} maxBodyBytes
 * @property {number} maxMessageChars
 * @property {number} retryIntervalMs
 * @property {number} maxNotifyAttempts
 * @property {number} notifyTimeoutMs
 */

/** @type {ContactConfig} */
export const DEFAULT_CONFIG = Object.freeze({
  host: '0.0.0.0',
  port: 8090,
  ntfyUrl: '',
  ntfyToken: '',
  smokeSecret: '',
  storePath: '/var/lib/contact/leads.ndjson',
  minTimeSeconds: 3,
  // A 5,000-character message of CJK text is about 45 KB once URL-encoded.
  maxBodyBytes: 64 * 1024,
  maxMessageChars: 5000,
  retryIntervalMs: 60_000,
  maxNotifyAttempts: 20,
  notifyTimeoutMs: 10_000,
});

// ntfy's default message-size-limit is 4096 bytes, and a larger body becomes an
// attachment that an instance without an attachment cache rejects. Stay well
// under it and point at the stored lead for the rest.
export const NOTIFY_MESSAGE_MAX_BYTES = 3000;
// ntfy 2.28 rejects titles over 1 KB.
export const NOTIFY_TITLE_MAX_BYTES = 250;

const SUCCESS_MESSAGE = 'Message received. I will get back to you.';

function positiveInteger(value, fallback, label) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

export function loadConfig(env = process.env) {
  const ntfyUrl = String(env.NTFY_URL ?? '').trim();
  let topicUrl;
  try {
    topicUrl = new URL(ntfyUrl);
  } catch {
    throw new Error('NTFY_URL must be an absolute topic URL, e.g. http://ntfy:80/portfolio-leads.');
  }
  if (topicUrl.protocol !== 'http:' && topicUrl.protocol !== 'https:') {
    throw new Error('NTFY_URL must be an http or https URL.');
  }
  // fetch() quotes a URL with credentials in its error, which would put them in
  // the container log on every failed publish.
  if (topicUrl.username || topicUrl.password) {
    throw new Error('NTFY_URL must not carry credentials; put the access token in NTFY_TOKEN.');
  }
  const segments = topicUrl.pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error('NTFY_URL must name a topic, e.g. http://ntfy:80/portfolio-leads.');
  }
  // Publishing goes to the server root, so a path prefix would be dropped, and
  // the smoke topic appends "-smoke" within ntfy's 64-character topic limit.
  if (segments.length !== 1 || !/^[-_A-Za-z0-9]{1,58}$/.test(segments[0]) || topicUrl.search || topicUrl.hash) {
    throw new Error(
      'NTFY_URL must be the ntfy server URL plus one topic of at most 58 letters, digits, - or _, e.g. http://ntfy:80/portfolio-leads.',
    );
  }
  const storePath = String(env.CONTACT_STORE ?? DEFAULT_CONFIG.storePath).trim();
  if (!storePath || !path.isAbsolute(storePath)) {
    throw new Error('CONTACT_STORE must be an absolute path.');
  }
  const ntfyToken = String(env.NTFY_TOKEN ?? '').trim();
  if (ntfyToken && !/^tk_[a-z0-9]{29}$/.test(ntfyToken)) {
    throw new Error('NTFY_TOKEN must be an ntfy access token (tk_ followed by 29 lowercase letters or digits).');
  }
  const smokeSecret = String(env.CONTACT_SMOKE_SECRET ?? '').trim();
  if (smokeSecret && smokeSecret.length < 24) {
    throw new Error('CONTACT_SMOKE_SECRET must be at least 24 characters.');
  }

  return {
    ...DEFAULT_CONFIG,
    host: String(env.CONTACT_HOST ?? DEFAULT_CONFIG.host),
    port: positiveInteger(env.CONTACT_PORT, DEFAULT_CONFIG.port, 'CONTACT_PORT'),
    ntfyUrl,
    ntfyToken,
    smokeSecret,
    storePath,
    minTimeSeconds: positiveInteger(env.CONTACT_MIN_TIME, DEFAULT_CONFIG.minTimeSeconds, 'CONTACT_MIN_TIME'),
  };
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readBody(request, maxBytes) {
  const contentLength = Number(request.headers['content-length']);
  if (Number.isSafeInteger(contentLength) && contentLength > maxBytes) {
    request.resume();
    throw new HttpError(413, 'That message is too long to send here. Please email it directly.');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      request.resume();
      throw new HttpError(413, 'That message is too long to send here. Please email it directly.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function parseSubmission(body) {
  const params = new URLSearchParams(body);
  // Cut by code point, not UTF-16 unit, so an emoji at the limit is kept or
  // dropped whole instead of leaving half a surrogate pair in the store.
  const field = (key, max) => Array.from((params.get(key) || '').trim()).slice(0, max).join('');
  return {
    name: field('name', 200),
    email: field('email', 200),
    message: (params.get('message') || '').trim(),
    subject: field('subject', 100),
    honeypot: (params.get('website') || '').trim(),
    loadedAt: Number(params.get('_t')) || 0,
  };
}

export function validateSubmission(form, now, config = DEFAULT_CONFIG) {
  if (form.honeypot) return 'honeypot filled';
  if (!form.name) return 'name is required';
  if (!form.email || !form.email.includes('@')) return 'a valid email is required';
  if (!form.message || form.message.length < 10) return 'message must be at least 10 characters';
  if (form.message.length > config.maxMessageChars) {
    return `message must be ${config.maxMessageChars} characters or fewer`;
  }
  if (form.loadedAt > 0) {
    const elapsed = now.getTime() / 1000 - form.loadedAt;
    // _t comes from the visitor's clock. On a device running fast the elapsed
    // time comes out negative, which says nothing about how long they spent on
    // the page, so only a real short stay is refused.
    if (elapsed >= 0 && elapsed < config.minTimeSeconds) return 'submitted too quickly';
  }
  return null;
}

function refererPath(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    return new URL(value).pathname.slice(0, 200);
  } catch {
    return '';
  }
}

export function newLeadId(now = new Date()) {
  return `${now.toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex')}`;
}

/** Cut text to at most maxBytes of UTF-8 without splitting a character. */
export function truncateBytes(text, maxBytes) {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
  let out = '';
  let size = 0;
  for (const char of text) {
    const bytes = Buffer.byteLength(char, 'utf8');
    if (size + bytes > maxBytes) break;
    out += char;
    size += bytes;
  }
  return out;
}

export function notificationFor(lead) {
  const lines = [`From: ${lead.name} <${lead.email}>`, `Page: ${lead.page || 'unknown'}`];
  if (lead.subject) lines.push(`Subject: ${lead.subject}`);
  const header = `${lines.join('\n')}\n\n`;
  const footer = `…\n\n(Full text stored as lead ${lead.id}.)`;
  const budget = NOTIFY_MESSAGE_MAX_BYTES - Buffer.byteLength(header, 'utf8');
  const message = Buffer.byteLength(lead.message, 'utf8') <= budget
    ? `${header}${lead.message}`
    : `${header}${truncateBytes(lead.message, budget - Buffer.byteLength(footer, 'utf8'))}${footer}`;
  return {
    title: truncateBytes(`Portfolio lead ${lead.id}: ${lead.name}`, NOTIFY_TITLE_MAX_BYTES),
    message,
  };
}

// Every record is serialized with "type" as its first key, and a quote inside a
// JSON string is always escaped, so this text only ever occurs where a record
// begins. That lets a whole record be recovered from a line it shares with a
// torn fragment.
const RECORD_START = '{"type":"';

function parseRecords(line) {
  try {
    return [JSON.parse(line)];
  } catch {
    return line
      .split(RECORD_START)
      .slice(1)
      .flatMap((piece) => {
        try {
          return [JSON.parse(RECORD_START + piece)];
        } catch {
          return [];
        }
      });
  }
}

/** Append-only lead store: one `lead` entry per submission, then `status` entries. */
export function createLeadStore(storePath, fileSystem = fs) {
  let queue = Promise.resolve();
  // Set when the file may end partway through a line: an append failed after
  // some of its bytes reached the disk, or the host died mid-write and the
  // store was found that way at startup. The next record then starts on a line
  // of its own instead of being glued onto the fragment.
  let startOnFreshLine = false;

  function append(entry) {
    const task = queue.catch(() => undefined).then(async () => {
      const line = `${startOnFreshLine ? '\n' : ''}${JSON.stringify(entry)}\n`;
      await fileSystem.mkdir(path.dirname(storePath), { recursive: true });
      try {
        await fileSystem.appendFile(storePath, line, { encoding: 'utf8', mode: 0o600, flush: true });
      } catch (error) {
        startOnFreshLine = true;
        throw error;
      }
      startOnFreshLine = false;
    });
    queue = task;
    return task;
  }

  /**
   * The leads not yet delivered. The store is read a line at a time and a lead
   * is dropped as soon as its `sent` status turns up, so memory follows the
   * undelivered backlog rather than the size of the file.
   */
  async function loadUndelivered() {
    let handle;
    try {
      handle = await fileSystem.open(storePath, 'r');
    } catch (error) {
      if (error.code === 'ENOENT') return new Map();
      throw error;
    }
    const leads = new Map();
    try {
      const { size } = await handle.stat();
      if (size > 0) {
        const last = Buffer.alloc(1);
        await handle.read(last, 0, 1, size - 1);
        if (last[0] !== 0x0a) startOnFreshLine = true;
      }
      for await (const line of handle.readLines({ encoding: 'utf8', autoClose: false, start: 0 })) {
        if (!line.trim()) continue;
        for (const entry of parseRecords(line)) {
          if (entry?.type === 'lead' && typeof entry.id === 'string') {
            leads.set(entry.id, { ...entry, attempts: 0 });
          } else if (entry?.type === 'status' && leads.has(entry.id)) {
            if (entry.status === 'sent') {
              leads.delete(entry.id);
              continue;
            }
            const lead = leads.get(entry.id);
            lead.status = entry.status;
            lead.attempts = Number(entry.attempts) || lead.attempts;
            lead.lastAttemptAt = entry.at;
          }
        }
      }
    } finally {
      await handle.close();
    }
    return leads;
  }

  return { append, loadUndelivered };
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function secretMatches(provided, expected) {
  if (!expected || typeof provided !== 'string' || !provided) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function retryDelayMs(attempts) {
  return Math.min(60 * 60_000, 60_000 * 2 ** Math.max(0, attempts - 1));
}

export function createContactHandler(config = DEFAULT_CONFIG, dependencies = {}) {
  const fetchImpl = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now ?? (() => new Date());
  const logger = dependencies.logger ?? console;
  const store = createLeadStore(config.storePath, dependencies.fileSystem ?? fs);
  /** @type {Map<string, any>} */
  const pending = new Map();
  const inFlight = new Set();

  async function publish(lead) {
    const topicUrl = new URL(config.ntfyUrl);
    const baseTopic = topicUrl.pathname.replace(/^\/+|\/+$/g, '');
    const topic = lead.synthetic ? `${baseTopic}-smoke` : baseTopic;
    const { title, message } = notificationFor(lead);
    /** @type {Record<string, string>} */
    const headers = { 'Content-Type': 'application/json' };
    if (config.ntfyToken) headers.Authorization = `Bearer ${config.ntfyToken}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.notifyTimeoutMs);
    try {
      const response = await fetchImpl(new URL('/', topicUrl).toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic, title, message, tags: ['incoming_envelope'], priority: lead.synthetic ? 1 : 4 }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`ntfy answered ${response.status}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async function deliver(lead) {
    const attempts = (lead.attempts ?? 0) + 1;
    lead.attempts = attempts;
    lead.runAttempts = (lead.runAttempts ?? 0) + 1;
    lead.lastAttemptAt = now().toISOString();
    let delivered = false;
    try {
      await publish(lead);
      delivered = true;
    } catch (error) {
      logger.error(`contact: lead ${lead.id} notification failed (attempt ${attempts}): ${error.message}`);
    }
    if (delivered) {
      lead.status = 'sent';
      pending.delete(lead.id);
      logger.log(`contact: lead ${lead.id} delivered to ntfy`);
    }
    try {
      await store.append({ type: 'status', id: lead.id, status: delivered ? 'sent' : 'pending', at: lead.lastAttemptAt, attempts });
    } catch (error) {
      logger.error(`contact: could not record the attempt for lead ${lead.id}: ${error.message}`);
    }
  }

  // Deliveries run after the visitor has their answer, so nothing here may
  // reject: an unhandled rejection would take the whole handler down.
  function track(promise) {
    const settled = promise
      .catch((error) => logger.error(`contact: delivery error: ${error.message}`))
      .finally(() => inFlight.delete(settled));
    inFlight.add(settled);
    return settled;
  }

  // A lead accepted while the store is being read could be restored as pending
  // after it had already been delivered, and then sent twice. New leads wait
  // for the read to finish.
  let restoring = Promise.resolve();

  /** Queues every undelivered lead in the store. Run it before accepting requests. */
  function restorePending() {
    const run = (async () => {
      const leads = await store.loadUndelivered();
      for (const lead of leads.values()) {
        if (pending.has(lead.id)) continue;
        // Each start gets a fresh round of attempts, retried at once, so a lead
        // that used up its attempts during a long ntfy outage isn't silenced for
        // good. The nightly deploy recreates this container.
        pending.set(lead.id, { ...lead, runAttempts: 0, lastAttemptAt: undefined });
      }
      return pending.size;
    })();
    restoring = run.catch(() => undefined);
    return run;
  }

  async function retryPending() {
    const current = now().getTime();
    const due = [...pending.values()].filter((lead) => {
      if ((lead.runAttempts ?? 0) >= config.maxNotifyAttempts) {
        if (!lead.parked) {
          lead.parked = true;
          logger.error(
            `contact: lead ${lead.id} is still undelivered after ${lead.attempts} attempts; it stays in the store and gets another round when the handler restarts`,
          );
        }
        return false;
      }
      if (!lead.lastAttemptAt) return true;
      return current - Date.parse(lead.lastAttemptAt) >= retryDelayMs(lead.runAttempts ?? 0);
    });
    await Promise.all(due.map((lead) => track(deliver(lead))));
    return due.length;
  }

  async function handleRequest(request, response) {
    const pathname = new URL(request.url ?? '/', 'http://contact').pathname;
    if (request.method === 'GET' && pathname === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('ok');
      return;
    }
    if (request.method !== 'POST' || (pathname !== '/contact' && pathname !== '/api/contact')) {
      sendJson(response, 404, { error: 'not found' });
      return;
    }

    let body;
    try {
      body = await readBody(request, config.maxBodyBytes);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 400;
      sendJson(response, status, { error: error.message });
      return;
    }

    // The live smoke proves the whole path on every deploy, and its leads are
    // kept apart so they never reach the owner's phone. Visitors never send this
    // header, so a wrong secret (say, after a rotation the deploy machine missed)
    // is refused outright rather than filed and announced as a real inquiry.
    const smokeHeader = request.headers['x-contact-smoke'];
    const synthetic = smokeHeader !== undefined;
    if (synthetic && !secretMatches(smokeHeader, config.smokeSecret)) {
      logger.log('contact: refused a smoke submission with the wrong secret');
      sendJson(response, 403, { error: 'forbidden' });
      return;
    }

    const received = now();
    const form = parseSubmission(body);
    const problem = validateSubmission(form, received, config);
    if (problem) {
      logger.log(`contact: rejected a submission (${problem})`);
      sendJson(response, 422, { error: problem });
      return;
    }

    const lead = {
      type: 'lead',
      id: newLeadId(received),
      receivedAt: received.toISOString(),
      name: form.name,
      email: form.email,
      message: form.message,
      subject: form.subject,
      page: refererPath(request.headers.referer),
      status: 'pending',
    };
    if (synthetic) lead.synthetic = true;
    await restoring;
    try {
      await store.append(lead);
    } catch (error) {
      logger.error(`contact: could not store a submission: ${error.message}`);
      sendJson(response, 503, { error: 'Could not save your message. Please email it directly.' });
      return;
    }

    logger.log(`contact: stored lead ${lead.id}`);
    sendJson(response, 200, { ok: true, message: SUCCESS_MESSAGE });
    const tracked = { ...lead, attempts: 0 };
    pending.set(lead.id, tracked);
    track(deliver(tracked));
  }

  /** Resolves once every notification started so far has finished. */
  async function idle() {
    while (inFlight.size) await Promise.all([...inFlight]);
  }

  return { handleRequest, retryPending, restorePending, idle, store };
}

export async function startServer(config = loadConfig()) {
  const handler = createContactHandler(config);
  // The store is read before the port opens, so no request can race it.
  try {
    const count = await handler.restorePending();
    if (count) console.log(`contact: ${count} undelivered lead(s) queued for notification`);
  } catch (error) {
    console.error(`contact: could not read the lead store: ${error.message}`);
  }
  const server = http.createServer((request, response) => {
    handler.handleRequest(request, response).catch((error) => {
      console.error(`contact: unhandled request error: ${error.message}`);
      if (!response.headersSent) sendJson(response, 500, { error: 'Something went wrong. Please try emailing directly.' });
      else response.destroy();
    });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 17_000;
  const retryTimer = setInterval(() => {
    handler.retryPending().catch((error) => console.error(`contact: retry pass failed: ${error.message}`));
  }, config.retryIntervalMs);
  retryTimer.unref();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => resolve(undefined));
  });
  console.log(`contact: listening on ${config.host}:${config.port}`);
  return server;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  startServer().catch((error) => {
    console.error(`contact: could not start: ${error.message}`);
    process.exit(1);
  });
}
