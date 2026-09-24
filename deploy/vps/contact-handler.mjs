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
//   CONTACT_MIN_TIME      optional  minimum seconds between fetching a form token and submitting (default 3,
//                                   at most 60, the longest the page script and the smoke wait)
//   CONTACT_RETENTION_DAYS optional days a lead is kept, then deleted at start and daily (default 365;
//                                   /privacy/ states the same number, src/data/retention.ts)
//
// Form tokens: the page script fetches GET /api/contact/token, a server
// timestamp and nonce signed with HMAC, and sends it back with the form. A
// token must be at least CONTACT_MIN_TIME seconds old, at most four hours old,
// and unused, so the timing check runs on this server's clock rather than the
// visitor's. The key is made fresh at every start, because the list of used
// tokens lives in memory. Every visitor post has to come from a page on this
// site, token or not. One with no token is accepted only as a no-JavaScript
// browser navigation, under a stricter per-client limit.
// Every client also has a per-ten-minutes and a daily limit, and stored leads
// have a global hourly cap. A form that fails a field check hears only "Please
// check the form and try again", and a filled honeypot is answered like a sent
// message; the reason goes to the log.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {object} ContactConfig
 * @property {string} host
 * @property {number} port
 * @property {string} ntfyUrl
 * @property {string} ntfyToken
 * @property {string} smokeSecret
 * @property {string} tokenSecret
 * @property {string} storePath
 * @property {number} leadRetentionDays
 * @property {number} minTimeSeconds
 * @property {number} tokenMaxAgeMs
 * @property {number} clientWindowMs
 * @property {number} clientMax
 * @property {number} clientDailyMax
 * @property {number} noTokenClientMax
 * @property {number} globalHourlyCap
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
  // Empty in a deployment, so each start makes its own key. Tests set it to mint
  // tokens.
  tokenSecret: '',
  storePath: '/var/lib/contact/leads.ndjson',
  // The privacy page promises this; src/data/retention.ts holds the number and
  // a test keeps the two equal.
  leadRetentionDays: 365,
  minTimeSeconds: 3,
  // Long enough to write a careful message, short enough that a harvested
  // token is soon useless.
  tokenMaxAgeMs: 4 * 60 * 60_000,
  // Submission attempts per client per window: a person resending once or
  // twice fits easily, a script does not.
  clientWindowMs: 10 * 60_000,
  clientMax: 5,
  // Attempts per client per day. The ten-minute limit alone let one address,
  // pacing itself, fill the global hourly cap by itself and turn every other
  // visitor away. A third of the cap leaves room for everyone else.
  clientDailyMax: 10,
  // A browser without JavaScript sends no token, so it gets fewer attempts.
  noTokenClientMax: 2,
  // Stored leads per rolling hour from everyone together, smoke leads aside.
  globalHourlyCap: 30,
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
// The same for every field check a form fails, so a refusal doesn't say which
// one. The token is checked before the fields and a filled honeypot gets the
// success reply, so neither can be told apart that way either.
export const CHECK_FORM_MESSAGE = 'Please check the form and try again.';
const BUSY_MESSAGE = 'Too many messages from here just now. Please try again later, or email directly.';

function positiveInteger(value, fallback, label) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

// The page script and the live smoke wait at most a minute for a token to
// age (public/scripts/contact-form.js, scripts/lib/lead-delivery-check.mjs), so
// a longer minimum would refuse every scripted send and its retry.
export const MAX_MIN_TIME_SECONDS = 60;

function atMost(value, max, label) {
  if (value > max) throw new Error(`${label} must be at most ${max}.`);
  return value;
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
    minTimeSeconds: atMost(positiveInteger(env.CONTACT_MIN_TIME, DEFAULT_CONFIG.minTimeSeconds, 'CONTACT_MIN_TIME'), MAX_MIN_TIME_SECONDS, 'CONTACT_MIN_TIME'),
    leadRetentionDays: positiveInteger(env.CONTACT_RETENTION_DAYS, DEFAULT_CONFIG.leadRetentionDays, 'CONTACT_RETENTION_DAYS'),
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
    token: field('token', 120),
  };
}

/** The reason a form is refused, for the log only; visitors see CHECK_FORM_MESSAGE. */
export function validateSubmission(form, config = DEFAULT_CONFIG) {
  if (form.honeypot) return 'honeypot filled';
  if (!form.name) return 'name is required';
  if (!form.email || !form.email.includes('@')) return 'a valid email is required';
  if (!form.message || form.message.length < 10) return 'message must be at least 10 characters';
  if (form.message.length > config.maxMessageChars) {
    return `message must be ${config.maxMessageChars} characters or fewer`;
  }
  return null;
}

/** A form token: `v1.<issued ms>.<16 hex nonce>.<HMAC-SHA256, base64url>`. */
export function signToken(key, issuedAtMs, nonce) {
  const payload = `v1.${issuedAtMs}.${nonce}`;
  return `${payload}.${createHmac('sha256', key).update(payload).digest('base64url')}`;
}

/** The token's issue time and nonce if its signature holds, otherwise null. */
export function readToken(key, token) {
  const match = /^v1\.(\d{13})\.([0-9a-f]{16})\.[A-Za-z0-9_-]{43}$/.exec(String(token ?? ''));
  if (!match) return null;
  const expected = Buffer.from(signToken(key, Number(match[1]), match[2]));
  const provided = Buffer.from(String(token));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  return { issuedAt: Number(match[1]), nonce: match[2] };
}

// The inner Caddy trusts the edge and appends its address, so the visitor is
// the right-most address that isn't on a private network.
const PRIVATE_ADDRESS = /^(?:::ffff:)?(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)|^::1$|^f[cd][0-9a-f]{2}:/i;

export function clientAddress(headers, fallback = 'unknown') {
  const chain = String(headers['x-forwarded-for'] ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    if (!PRIVATE_ADDRESS.test(chain[index])) return chain[index];
  }
  return chain[0] ?? fallback;
}

/** Hits per key inside a sliding window, with the number of keys bounded. */
function createWindowCounter(windowMs, maxKeys = 10_000) {
  const hits = new Map();
  function recent(key, current) {
    const list = (hits.get(key) ?? []).filter((at) => current - at < windowMs);
    if (list.length) hits.set(key, list);
    else hits.delete(key);
    return list;
  }
  return {
    count: (key, current) => recent(key, current).length,
    add(key, current) {
      const list = recent(key, current);
      list.push(current);
      hits.set(key, list);
      if (hits.size > maxKeys) hits.delete(hits.keys().next().value);
    },
    /** Gives back one hit recorded at `at`. */
    remove(key, at) {
      const list = hits.get(key);
      const index = list ? list.lastIndexOf(at) : -1;
      if (index >= 0) list.splice(index, 1);
    },
  };
}

function refererPath(value) {
  if (typeof value !== 'string' || !value) return '';
  try {
    return new URL(value).pathname.slice(0, 200);
  } catch {
    return '';
  }
}

/**
 * A browser posting the form itself, with no JavaScript, is navigating and
 * needs a page back rather than JSON. The page script asks for JSON.
 */
export function isNavigation(headers) {
  if (headers['sec-fetch-mode'] === 'navigate') return true;
  return /\btext\/html\b/i.test(String(headers.accept ?? ''));
}

/**
 * Whether a post came from a page on this site. Browsers mark a form post with
 * Sec-Fetch-Site, and older ones still send Origin. Without this, a page on any
 * other site could post here through its visitors' browsers, each with its own
 * address to spend, and a token doesn't help: any site can fetch one.
 */
export function isSameSitePost(headers) {
  const site = headers['sec-fetch-site'];
  if (site) return site === 'same-origin';
  const host = String(headers.host ?? '');
  const sameHost = (value) => {
    try {
      return Boolean(host) && new URL(value).host === host;
    } catch {
      return false;
    }
  };
  const origin = headers.origin;
  if (origin) return origin !== 'null' && sameHost(origin);
  // A text browser sends neither header, but it does send the page it posted
  // from. Every graphical browser sends Origin on a POST, so a page on another
  // site can't get here by leaving both out.
  return typeof headers.referer === 'string' && sameHost(headers.referer);
}

/** The form's own page, as a path on this site; never another origin. */
export function returnPath(referer) {
  const pathname = refererPath(referer);
  return /^\/(?![/\\])/.test(pathname) ? pathname : '/';
}

function redirect(response, location) {
  response.writeHead(303, { Location: location, 'Cache-Control': 'no-store' });
  response.end();
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

/**
 * One store line. U+2028 and U+2029 are escaped too: JSON.stringify leaves
 * them raw inside strings, and anything that treats them as line breaks
 * (readline among them) would cut the record in two.
 */
function serializeRecord(entry) {
  return JSON.stringify(entry).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/**
 * The store's lines, split on \n only. readline and FileHandle.readLines also
 * break at U+2028 and U+2029, which records written before they were escaped
 * can still hold raw, so those readers would lose such a lead at restart.
 */
async function* storeLines(handle) {
  let rest = '';
  for await (const chunk of handle.createReadStream({ encoding: 'utf8', autoClose: false, start: 0 })) {
    rest += chunk;
    let index;
    while ((index = rest.indexOf('\n')) >= 0) {
      yield rest.slice(0, index);
      rest = rest.slice(index + 1);
    }
  }
  if (rest) yield rest;
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
      const line = `${startOnFreshLine ? '\n' : ''}${serializeRecord(entry)}\n`;
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
      for await (const line of storeLines(handle)) {
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

  /**
   * Rewrites the store without leads received before `cutoffMs`, and without
   * their status lines. It runs in the append queue, so no append can land
   * between the read and the rename, and it streams, so a year of leads never
   * has to fit in memory. Returns how many leads were removed.
   */
  function purgeBefore(cutoffMs) {
    const task = queue.catch(() => undefined).then(async () => {
      let source;
      try {
        source = await fileSystem.open(storePath, 'r');
      } catch (error) {
        if (error.code === 'ENOENT') return 0;
        throw error;
      }
      const tmpPath = `${storePath}.purge`;
      const kept = new Set();
      let removed = 0;
      let target;
      try {
        target = await fileSystem.open(tmpPath, 'w', 0o600);
        for await (const line of storeLines(source)) {
          if (!line.trim()) continue;
          for (const entry of parseRecords(line)) {
            let keep = false;
            if (entry?.type === 'lead' && typeof entry.id === 'string') {
              const receivedAt = Date.parse(entry.receivedAt ?? '');
              keep = !(Number.isFinite(receivedAt) && receivedAt < cutoffMs);
              if (keep) kept.add(entry.id);
              else removed += 1;
            } else if (entry?.type === 'status') {
              // A status follows its lead in the file, so its fate is known.
              keep = kept.has(entry.id);
            }
            if (keep) await target.write(`${serializeRecord(entry)}\n`);
          }
        }
        await target.sync();
      } finally {
        await target?.close();
        await source.close();
      }
      if (removed === 0) {
        await fileSystem.rm(tmpPath, { force: true });
        return 0;
      }
      await fileSystem.rename(tmpPath, storePath);
      startOnFreshLine = false;
      return removed;
    });
    queue = task.then(() => undefined);
    return task;
  }

  return { append, loadUndelivered, purgeBefore };
}

/**
 * The handler before 2026-09-22 kept only a name, email and message length per
 * submission in submissions.ndjson beside the store. The same retention applies
 * to it; it's removed once nothing in it is young enough to keep.
 */
export async function purgeLegacySubmissions(storePath, cutoffMs, fileSystem = fs) {
  const legacyPath = path.join(path.dirname(storePath), 'submissions.ndjson');
  let text;
  try {
    text = await fileSystem.readFile(legacyPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }
  const lines = text.split('\n').filter((line) => line.trim());
  const keep = lines.filter((line) => {
    try {
      const at = Date.parse(JSON.parse(line).ts ?? '');
      return !(Number.isFinite(at) && at < cutoffMs);
    } catch {
      return false;
    }
  });
  const removed = lines.length - keep.length;
  if (removed === 0) return 0;
  if (keep.length === 0) await fileSystem.rm(legacyPath, { force: true });
  else await fileSystem.writeFile(legacyPath, `${keep.join('\n')}\n`, { encoding: 'utf8', mode: 0o600, flush: true });
  return removed;
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

  // A new key every start. Used tokens are remembered in memory only, so a key
  // that outlived a restart let a token be used again after one. A visitor whose
  // token dies in a restart gets code 'token', and the page script fetches a
  // fresh one and sends again.
  const tokenKey = config.tokenSecret || randomBytes(32).toString('hex');
  /** nonce -> when its token expires, so a used token can't be sent twice */
  const usedNonces = new Map();
  const clientAttempts = createWindowCounter(config.clientWindowMs);
  const clientDailyAttempts = createWindowCounter(24 * 60 * 60_000);
  const noTokenAttempts = createWindowCounter(config.clientWindowMs);
  const storedLastHour = createWindowCounter(60 * 60_000, 1);

  function issueToken() {
    return signToken(tokenKey, now().getTime(), randomBytes(8).toString('hex'));
  }

  /** Why a token is refused (for the log), or null when it's good. Marks it used. */
  function tokenProblem(token, current) {
    const parsed = readToken(tokenKey, token);
    if (!parsed) return 'token forged or malformed';
    const age = current - parsed.issuedAt;
    if (age < config.minTimeSeconds * 1000) return 'submitted too quickly';
    if (age > config.tokenMaxAgeMs) return 'token expired';
    for (const [nonce, expires] of usedNonces) {
      if (expires < current) usedNonces.delete(nonce);
    }
    if (usedNonces.has(parsed.nonce)) return 'token replayed';
    usedNonces.set(parsed.nonce, parsed.issuedAt + config.tokenMaxAgeMs);
    return null;
  }

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
    if (request.method === 'GET' && (pathname === '/contact/token' || pathname === '/api/contact/token')) {
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      // The minimum age travels with the token, so the page script and the
      // live smoke wait as long as this server asks, up to CONTACT_MIN_TIME's cap.
      response.end(JSON.stringify({ token: issueToken(), minAgeMs: config.minTimeSeconds * 1000 }));
      return;
    }
    if (request.method !== 'POST' || (pathname !== '/contact' && pathname !== '/api/contact')) {
      sendJson(response, 404, { error: 'not found' });
      return;
    }

    // Without JavaScript the browser shows whatever comes back, so it gets a
    // 303: to the thank-you page, or back to the form, where
    // #contact-not-sent shows a readable error with no script at all.
    const navigation = isNavigation(request.headers);
    const refuse = (status, body) => {
      if (navigation) redirect(response, `${returnPath(request.headers.referer)}#contact-not-sent`);
      else sendJson(response, status, body);
    };

    // The live smoke proves the whole path on every deploy, and its leads are
    // kept apart so they never reach the owner's phone. Visitors never send this
    // header, so a wrong secret (say, after a rotation the deploy machine missed)
    // is refused outright rather than filed and announced as a real inquiry.
    const smokeHeader = request.headers['x-contact-smoke'];
    const synthetic = smokeHeader !== undefined;
    if (synthetic && !secretMatches(smokeHeader, config.smokeSecret)) {
      logger.log('contact: refused a smoke submission with the wrong secret');
      request.resume();
      refuse(403, { error: 'forbidden' });
      return;
    }

    // A post from another site's page is refused before it counts. Counted, a
    // page elsewhere could spend its visitors' attempts and lock them out of
    // the form, which is what this check exists to stop.
    if (!synthetic && !isSameSitePost(request.headers)) {
      logger.log('contact: rejected a submission (posted from another site)');
      request.resume();
      refuse(422, { error: CHECK_FORM_MESSAGE });
      return;
    }

    // Every other attempt counts against its client, valid or not, so a script
    // can't probe the checks faster than a person could type. The smoke is
    // exempt.
    const client = clientAddress(request.headers, request.socket?.remoteAddress);
    const current = now().getTime();
    if (!synthetic) {
      if (clientAttempts.count(client, current) >= config.clientMax || clientDailyAttempts.count(client, current) >= config.clientDailyMax) {
        logger.log('contact: refused a submission (per-client limit)');
        request.resume();
        refuse(429, { error: BUSY_MESSAGE });
        return;
      }
      clientAttempts.add(client, current);
      clientDailyAttempts.add(client, current);
    }

    let body;
    try {
      body = await readBody(request, config.maxBodyBytes);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 400;
      refuse(status, { error: error.message });
      return;
    }

    const received = now();
    const form = parseSubmission(body);

    // The token is checked first, so its answer doesn't depend on the other
    // fields and can't be used to find the honeypot.
    if (form.token) {
      const tokenIssue = tokenProblem(form.token, current);
      if (tokenIssue) {
        logger.log(`contact: rejected a submission (${tokenIssue})`);
        refuse(422, { error: CHECK_FORM_MESSAGE, code: 'token' });
        return;
      }
    } else if (!navigation) {
      // The page script always sends a token; a scripted POST without one is
      // not the form.
      logger.log('contact: rejected a submission (no token)');
      refuse(422, { error: CHECK_FORM_MESSAGE, code: 'token' });
      return;
    } else if (!synthetic) {
      if (noTokenAttempts.count(client, current) >= config.noTokenClientMax) {
        logger.log('contact: refused a submission (no-JavaScript limit)');
        refuse(429, { error: BUSY_MESSAGE });
        return;
      }
      noTokenAttempts.add(client, current);
    }

    // The field checks and the cap come before the honeypot, so a filled
    // honeypot gets exactly the reply the same form gets without it: 422 for a
    // bad field, 429 when the hour is full, and otherwise the reply a sent
    // message gets, with nothing stored or passed on.
    const problem = validateSubmission({ ...form, honeypot: '' }, config);
    if (problem) {
      logger.log(`contact: rejected a submission (${problem})`);
      refuse(422, { error: CHECK_FORM_MESSAGE });
      return;
    }
    if (!synthetic && storedLastHour.count('all', current) >= config.globalHourlyCap) {
      logger.error('contact: refused a submission (global hourly cap reached)');
      refuse(429, { error: BUSY_MESSAGE });
      return;
    }
    if (form.honeypot) {
      logger.log('contact: dropped a submission (honeypot filled)');
      if (navigation) redirect(response, '/contact/sent/');
      else sendJson(response, 200, { ok: true, message: SUCCESS_MESSAGE });
      return;
    }
    // The slot is taken here, before anything awaits, so simultaneous posts
    // can't all find room under the cap and overshoot it. A lead that can't be
    // stored gives its slot back.
    if (!synthetic) storedLastHour.add('all', current);

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
      if (!synthetic) storedLastHour.remove('all', current);
      logger.error(`contact: could not store a submission: ${error.message}`);
      refuse(503, { error: 'Could not save your message. Please email it directly.' });
      return;
    }

    logger.log(`contact: stored lead ${lead.id}`);
    if (navigation) redirect(response, '/contact/sent/');
    else sendJson(response, 200, { ok: true, message: SUCCESS_MESSAGE });
    const tracked = { ...lead, attempts: 0 };
    pending.set(lead.id, tracked);
    track(deliver(tracked));
  }

  /** Resolves once every notification started so far has finished. */
  async function idle() {
    while (inFlight.size) await Promise.all([...inFlight]);
  }

  /** Deletes leads, and legacy submission records, older than the retention period. */
  async function purgeExpired() {
    const cutoff = now().getTime() - config.leadRetentionDays * 24 * 60 * 60_000;
    const leads = await store.purgeBefore(cutoff);
    const legacy = await purgeLegacySubmissions(config.storePath, cutoff, dependencies.fileSystem ?? fs);
    for (const id of [...pending.keys()]) {
      const receivedAt = Date.parse(pending.get(id)?.receivedAt ?? '');
      if (Number.isFinite(receivedAt) && receivedAt < cutoff) pending.delete(id);
    }
    if (leads || legacy) {
      logger.log(`contact: deleted ${leads} lead(s) and ${legacy} legacy record(s) older than ${config.leadRetentionDays} days`);
    }
    return { leads, legacy };
  }

  return { handleRequest, retryPending, restorePending, idle, store, issueToken, purgeExpired };
}

export async function startServer(config = loadConfig()) {
  const handler = createContactHandler(config);
  // Expired leads go first, so none is restored only to be deleted, then daily.
  const purge = () =>
    handler.purgeExpired().catch((error) => console.error(`contact: could not purge expired leads: ${error.message}`));
  await purge();
  const purgeTimer = setInterval(purge, 24 * 60 * 60_000);
  purgeTimer.unref();
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
