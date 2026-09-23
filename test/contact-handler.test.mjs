import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  DEFAULT_CONFIG,
  NOTIFY_MESSAGE_MAX_BYTES,
  NOTIFY_TITLE_MAX_BYTES,
  createContactHandler,
  loadConfig,
  notificationFor,
  truncateBytes,
} from '../deploy/vps/contact-handler.mjs';

const NOW = new Date('2026-09-22T12:00:00.000Z');
const LOADED_AT = String(Math.floor(NOW.getTime() / 1000) - 30);

/**
 * A fetch stand-in that validates headers the way Node's undici fetch does, so
 * visitor text that leaks into a header fails here exactly as it does live.
 * @param {{ fail?: boolean }} state
 */
function fakeNtfy(state = {}) {
  /** @type {{ url: string, headers: Headers, body: any }[]} */
  const calls = [];
  /**
   * @param {string} url
   * @param {{ headers?: Record<string, string>, body?: string }} [init]
   */
  async function fetchStub(url, init = {}) {
    const headers = new Headers(init.headers);
    calls.push({ url, headers, body: JSON.parse(String(init.body)) });
    if (state.fail) return new Response('{"error":"down"}', { status: 503 });
    return new Response('{}', { status: 200 });
  }
  return { fetch: fetchStub, calls };
}

function captureLogger() {
  /** @type {string[]} */
  const lines = [];
  return {
    lines,
    log: (/** @type {string} */ line) => lines.push(line),
    error: (/** @type {string} */ line) => lines.push(line),
  };
}

async function withHandler(options, callback) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-contact-'));
  const storePath = path.join(dir, 'leads.ndjson');
  const ntfy = fakeNtfy(options.ntfyState ?? {});
  const logger = captureLogger();
  let clock = NOW;
  const handler = createContactHandler(
    { ...DEFAULT_CONFIG, ntfyUrl: 'http://ntfy:80/portfolio-leads', storePath, ...(options.config ?? {}) },
    { fetch: ntfy.fetch, now: () => clock, logger, ...(options.dependencies ?? {}) },
  );
  try {
    return await callback({
      handler,
      storePath,
      ntfy,
      logger,
      setClock: (/** @type {Date} */ value) => { clock = value; },
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function formBody(fields) {
  return new URLSearchParams({ _t: LOADED_AT, website: '', ...fields }).toString();
}

function requestMock({ method = 'POST', url = '/api/contact', body = '', headers = {} } = {}) {
  return {
    method,
    url,
    headers: {
      'content-length': String(Buffer.byteLength(body)),
      'content-type': 'application/x-www-form-urlencoded',
      referer: 'https://portfolio.getparkerai.com/ai/',
      ...headers,
    },
    resume() {},
    async *[Symbol.asyncIterator]() {
      if (body) yield Buffer.from(body);
    },
  };
}

function responseMock() {
  return {
    status: 0,
    headers: {},
    body: '',
    headersSent: false,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
      this.headersSent = true;
    },
    end(body = '') {
      this.body = body;
    },
  };
}

async function readEntries(storePath) {
  const text = await fs.readFile(storePath, 'utf8').catch(() => '');
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

const cjkMessage = '你好，我们需要一个新的影像归档迁移方案。'.repeat(100).slice(0, 2000);

test('every accepted submission is stored in full before the reply, whatever script the name uses', async () => {
  const submissions = [
    { name: 'Siobhan O’Brien', message: 'We need help moving our PACS to a hosted service.' },
    { name: '李雷', message: 'Please call me about a DICOM routing problem.' },
    { name: 'Anna 😀 Smith', message: 'Our imaging workstation keeps dropping studies.' },
    { name: 'Wei Zhang', message: cjkMessage },
  ];

  await withHandler({}, async ({ handler, storePath, ntfy }) => {
    for (const submission of submissions) {
      const response = responseMock();
      await handler.handleRequest(
        requestMock({ body: formBody({ ...submission, email: 'client@example.test' }) }),
        response,
      );
      assert.equal(response.status, 200, `${submission.name} should get a 2xx`);
      assert.equal(JSON.parse(response.body).ok, true);
    }
    await handler.idle();

    const entries = await readEntries(storePath);
    const leads = entries.filter((entry) => entry.type === 'lead');
    assert.equal(leads.length, submissions.length);
    for (const [index, submission] of submissions.entries()) {
      assert.equal(leads[index].name, submission.name);
      assert.equal(leads[index].message, submission.message, 'the message is stored in full, not truncated');
      assert.equal(leads[index].email, 'client@example.test');
      assert.equal(leads[index].page, '/ai/');
      assert.match(leads[index].id, /^20260922-[0-9a-f]{6}$/);
    }
    const sent = entries.filter((entry) => entry.type === 'status' && entry.status === 'sent');
    assert.equal(sent.length, submissions.length, 'each lead is marked sent after ntfy accepts it');

    assert.equal(ntfy.calls.length, submissions.length);
    for (const call of ntfy.calls) {
      assert.equal(call.url, 'http://ntfy/', 'publishes JSON to the ntfy root URL, not the topic URL');
      assert.deepEqual([...call.headers.keys()], ['content-type']);
      assert.equal(call.body.topic, 'portfolio-leads');
      assert.ok(Buffer.byteLength(call.body.message, 'utf8') <= NOTIFY_MESSAGE_MAX_BYTES);
      assert.ok(Buffer.byteLength(call.body.title, 'utf8') <= NOTIFY_TITLE_MAX_BYTES);
    }
    assert.match(ntfy.calls[0].body.title, /O’Brien/);
    assert.match(ntfy.calls[3].body.message, /Full text stored as lead 20260922-/);
  });
});

test('a failed notification keeps the lead pending and a later retry delivers it', async () => {
  const ntfyState = { fail: true };
  await withHandler({ ntfyState }, async ({ handler, storePath, ntfy, setClock }) => {
    const response = responseMock();
    await handler.handleRequest(
      requestMock({ body: formBody({ name: 'Pat Lee', email: 'pat@example.test', message: 'Is this still available?' }) }),
      response,
    );
    await handler.idle();
    assert.equal(response.status, 200, 'the visitor is not told something failed when the lead is safely stored');

    let entries = await readEntries(storePath);
    assert.equal(entries.filter((entry) => entry.type === 'lead').length, 1);
    assert.deepEqual(
      entries.filter((entry) => entry.type === 'status').map((entry) => entry.status),
      ['pending'],
    );

    assert.equal(await handler.retryPending(), 0, 'no retry before the backoff has passed');
    ntfyState.fail = false;
    setClock(new Date(NOW.getTime() + 61_000));
    assert.equal(await handler.retryPending(), 1);
    entries = await readEntries(storePath);
    assert.equal(entries.at(-1).status, 'sent');
    assert.equal(entries.at(-1).attempts, 2);
    assert.equal(ntfy.calls.length, 2);
    assert.equal(await handler.retryPending(), 0, 'a delivered lead is not sent again');
  });
});

test('pending leads survive a restart and are retried from the store', async () => {
  await withHandler({ ntfyState: { fail: true } }, async ({ handler, storePath }) => {
    await handler.handleRequest(
      requestMock({ body: formBody({ name: 'Pat Lee', email: 'pat@example.test', message: 'Is this still available?' }) }),
      responseMock(),
    );
    await handler.idle();

    const ntfy = fakeNtfy();
    const restarted = createContactHandler(
      { ...DEFAULT_CONFIG, ntfyUrl: 'http://ntfy:80/portfolio-leads', storePath },
      { fetch: ntfy.fetch, now: () => new Date(NOW.getTime() + 120_000), logger: captureLogger() },
    );
    assert.equal(await restarted.restorePending(), 1);
    assert.equal(await restarted.retryPending(), 1);
    assert.equal(ntfy.calls.length, 1);
    assert.equal((await readEntries(storePath)).at(-1).status, 'sent');
  });
});

test('a store that cannot write answers 503 instead of claiming receipt', async () => {
  const brokenFileSystem = {
    ...fs,
    appendFile: async () => {
      throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
    },
  };
  await withHandler({ dependencies: { fileSystem: brokenFileSystem } }, async ({ handler, ntfy }) => {
    const response = responseMock();
    await handler.handleRequest(
      requestMock({ body: formBody({ name: 'Pat Lee', email: 'pat@example.test', message: 'Is this still available?' }) }),
      response,
    );
    assert.equal(response.status, 503);
    assert.doesNotMatch(response.body, /received/i);
    assert.equal(ntfy.calls.length, 0, 'nothing is announced that was not stored');
  });
});

test('visitor text never reaches the container log', async () => {
  await withHandler({ ntfyState: { fail: true } }, async ({ handler, logger }) => {
    await handler.handleRequest(
      requestMock({ body: formBody({ name: 'Secret Name', email: 'secret@example.test', message: 'secret message body here' }) }),
      responseMock(),
    );
    await handler.handleRequest(
      requestMock({ body: formBody({ name: 'Bot', email: 'bot@example.test', message: 'buy now please', website: 'spam' }) }),
      responseMock(),
    );
    await handler.idle();
    const output = logger.lines.join('\n');
    assert.ok(logger.lines.length >= 3);
    assert.doesNotMatch(output, /Secret Name|secret@example\.test|secret message body|bot@example\.test|buy now/);
  });
});

test('rejected and oversized submissions store nothing', async () => {
  await withHandler({}, async ({ handler, storePath }) => {
    const honeypot = responseMock();
    await handler.handleRequest(
      requestMock({ body: formBody({ name: 'Bot', email: 'bot@example.test', message: 'buy now please', website: 'x' }) }),
      honeypot,
    );
    assert.equal(honeypot.status, 422);

    const missing = responseMock();
    await handler.handleRequest(requestMock({ body: formBody({ name: '', email: 'a@example.test', message: 'long enough text' }) }), missing);
    assert.equal(missing.status, 422);

    const tooLong = responseMock();
    await handler.handleRequest(
      requestMock({ body: formBody({ name: 'Pat', email: 'pat@example.test', message: 'x'.repeat(DEFAULT_CONFIG.maxMessageChars + 1) }) }),
      tooLong,
    );
    assert.equal(tooLong.status, 422);

    const oversized = responseMock();
    await handler.handleRequest(
      requestMock({ body: 'x'.repeat(DEFAULT_CONFIG.maxBodyBytes + 1) }),
      oversized,
    );
    assert.equal(oversized.status, 413);

    assert.deepEqual(await readEntries(storePath), []);
  });
});

test('notification text is cut on a character boundary and stays under the ntfy limits', () => {
  const lead = {
    id: '20260922-abcdef',
    name: '名'.repeat(200),
    email: 'client@example.test',
    message: '😀'.repeat(5000),
    subject: 'AI workflow',
    page: '/ai/',
  };
  const { title, message } = notificationFor(lead);
  assert.ok(Buffer.byteLength(title, 'utf8') <= NOTIFY_TITLE_MAX_BYTES);
  assert.ok(Buffer.byteLength(message, 'utf8') <= NOTIFY_MESSAGE_MAX_BYTES);
  assert.doesNotMatch(message, /�/);
  assert.match(message, /Subject: AI workflow/);
  assert.equal(truncateBytes('ab😀', 3), 'ab', 'a four-byte character is never split');
});

test('the write token is sent as a bearer header and smoke leads go to their own topic', async () => {
  const smokeSecret = 's'.repeat(32);
  const ntfyToken = `tk_${'a1'.repeat(14)}b`;
  await withHandler({ config: { ntfyToken, smokeSecret } }, async ({ handler, storePath, ntfy }) => {
    const body = formBody({ name: 'Live Smoke', email: 'smoke@example.invalid', message: 'synthetic lead for the deploy smoke' });
    await handler.handleRequest(requestMock({ body, headers: { 'x-contact-smoke': smokeSecret } }), responseMock());
    await handler.handleRequest(requestMock({ body, headers: { 'x-contact-smoke': 'wrong'.repeat(8) } }), responseMock());
    await handler.handleRequest(requestMock({ body }), responseMock());
    await handler.idle();

    assert.deepEqual(ntfy.calls.map((call) => call.body.topic), ['portfolio-leads-smoke', 'portfolio-leads', 'portfolio-leads']);
    assert.equal(ntfy.calls[0].body.priority, 1, 'smoke leads never buzz a phone');
    for (const call of ntfy.calls) assert.equal(call.headers.get('authorization'), `Bearer ${ntfyToken}`);

    const leads = (await readEntries(storePath)).filter((entry) => entry.type === 'lead');
    assert.deepEqual(leads.map((lead) => lead.synthetic === true), [true, false, false]);
  });
});

test('loadConfig rejects a malformed token or a short smoke secret', () => {
  const base = { NTFY_URL: 'http://ntfy:80/portfolio-leads' };
  assert.throws(() => loadConfig({ ...base, NTFY_TOKEN: 'not-a-token' }), /NTFY_TOKEN/);
  assert.throws(() => loadConfig({ ...base, CONTACT_SMOKE_SECRET: 'short' }), /CONTACT_SMOKE_SECRET/);
  const config = loadConfig({ ...base, NTFY_TOKEN: `tk_${'0'.repeat(29)}`, CONTACT_SMOKE_SECRET: 'x'.repeat(24) });
  assert.equal(config.ntfyToken, `tk_${'0'.repeat(29)}`);
});

test('loadConfig requires a topic URL and an absolute store path', () => {
  assert.throws(() => loadConfig({}), /NTFY_URL/);
  assert.throws(() => loadConfig({ NTFY_URL: 'http://ntfy:80/' }), /name a topic/);
  assert.throws(() => loadConfig({ NTFY_URL: 'http://ntfy:80/portfolio-leads', CONTACT_STORE: 'leads.ndjson' }), /absolute/);
  const config = loadConfig({ NTFY_URL: 'http://ntfy:80/portfolio-leads' });
  assert.equal(config.storePath, '/var/lib/contact/leads.ndjson');
  assert.equal(config.port, 8090);
});
