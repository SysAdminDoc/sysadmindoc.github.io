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

function pendingLeadLine(id, name) {
  return JSON.stringify({
    type: 'lead', id, receivedAt: NOW.toISOString(), name, email: 'pat@example.test',
    message: 'Is this still available?', subject: '', page: '/ai/', status: 'pending',
  });
}

function restartedHandler(storePath, ntfy, extra = {}) {
  return createContactHandler(
    { ...DEFAULT_CONFIG, ntfyUrl: 'http://ntfy:80/portfolio-leads', storePath, ...(extra.config ?? {}) },
    { fetch: ntfy.fetch, now: () => new Date(NOW.getTime() + 120_000), logger: extra.logger ?? captureLogger(), ...(extra.dependencies ?? {}) },
  );
}

test('a write that fails partway does not cost the next accepted lead', async () => {
  let firstWrite = true;
  const tearingFileSystem = {
    ...fs,
    appendFile: async (file, data, options) => {
      if (firstWrite) {
        firstWrite = false;
        await fs.appendFile(file, String(data).slice(0, 40), options);
        throw Object.assign(new Error('no space left on device'), { code: 'ENOSPC' });
      }
      return fs.appendFile(file, data, options);
    },
  };
  await withHandler({ ntfyState: { fail: true }, dependencies: { fileSystem: tearingFileSystem } }, async ({ handler, storePath }) => {
    const refused = responseMock();
    await handler.handleRequest(requestMock({ body: formBody({ name: 'First Visitor', email: 'a@example.test', message: 'first message, disk hiccup' }) }), refused);
    const accepted = responseMock();
    await handler.handleRequest(requestMock({ body: formBody({ name: 'Second Visitor', email: 'b@example.test', message: 'second message, accepted' }) }), accepted);
    await handler.idle();
    assert.equal(refused.status, 503);
    assert.equal(accepted.status, 200);

    const lines = (await fs.readFile(storePath, 'utf8')).split('\n').filter(Boolean);
    assert.throws(() => JSON.parse(lines[0]), SyntaxError, 'the torn fragment stays on a line of its own');
    assert.equal(JSON.parse(lines[1]).name, 'Second Visitor', 'the next record starts on a fresh line');
    for (const line of lines.slice(1)) JSON.parse(line);

    const ntfy = fakeNtfy();
    const restarted = restartedHandler(storePath, ntfy);
    assert.equal(await restarted.restorePending(), 1, 'the accepted lead is restored');
    await restarted.retryPending();
    await restarted.idle();
    assert.equal(ntfy.calls.length, 1);
    assert.match(ntfy.calls[0].body.title, /Second Visitor/);
  });
});

test('a store left torn by a crash still restores the leads written after it', async () => {
  await withHandler({ ntfyState: { fail: true } }, async ({ storePath }) => {
    // Written by a version that could glue a record onto a torn fragment.
    await fs.writeFile(
      storePath,
      `${pendingLeadLine('20260921-aaaaaa', 'Before')}\n{"type":"lead","id":"20260921-bbbbbb","receivedAt":"2026-09-${pendingLeadLine('20260921-cccccc', 'Glued')}\n{"type":"status","id":"20260921-aaaaaa","status":"sent"`,
    );
    const ntfy = fakeNtfy();
    const restarted = restartedHandler(storePath, ntfy);
    assert.equal(await restarted.restorePending(), 2, 'the glued lead is recovered and the torn one is skipped');

    // The store ended mid-line, so the next record starts on a fresh one.
    await restarted.handleRequest(requestMock({ body: formBody({ name: 'After Crash', email: 'c@example.test', message: 'lead accepted after a torn write' }) }), responseMock());
    await restarted.idle();
    const lines = (await fs.readFile(storePath, 'utf8')).split('\n');
    assert.match(lines.at(-2), /"status":"sent"/, 'the new lead is announced and marked sent on lines of their own');
    assert.equal(JSON.parse(lines.find((line) => line.includes('After Crash'))).name, 'After Crash');
  });
});

test('restoring reads the store as a stream and keeps only undelivered leads', async () => {
  await withHandler({}, async ({ storePath }) => {
    const sent = (id) => JSON.stringify({ type: 'status', id, status: 'sent', at: NOW.toISOString(), attempts: 1 });
    await fs.writeFile(
      storePath,
      [pendingLeadLine('20260922-000001', 'One'), sent('20260922-000001'), pendingLeadLine('20260922-000002', 'Two'),
        pendingLeadLine('20260922-000003', 'Three'), sent('20260922-000003'), ''].join('\n'),
    );
    const noWholeFileReads = {
      ...fs,
      readFile: async () => {
        throw new Error('the store must not be read whole');
      },
    };
    const ntfy = fakeNtfy();
    const restarted = restartedHandler(storePath, ntfy, { dependencies: { fileSystem: noWholeFileReads } });
    assert.equal(await restarted.restorePending(), 1);
    await restarted.retryPending();
    await restarted.idle();
    assert.deepEqual(ntfy.calls.map((call) => call.body.title), ['Portfolio lead 20260922-000002: Two']);
  });
});

test('a request that arrives while the store is being read waits for the read', async () => {
  let openGate;
  const gate = new Promise((resolve) => { openGate = resolve; });
  const gatedFileSystem = {
    ...fs,
    open: async (/** @type {string} */ file, /** @type {string} */ flags) => {
      await gate;
      return fs.open(file, flags);
    },
  };
  await withHandler({ dependencies: { fileSystem: gatedFileSystem } }, async ({ handler, storePath, ntfy }) => {
    await fs.writeFile(storePath, `${pendingLeadLine('20260921-aaaaaa', 'Earlier')}\n`);
    const restoring = handler.restorePending();
    const response = responseMock();
    const request = handler.handleRequest(requestMock({ body: formBody({ name: 'During Restore', email: 'd@example.test', message: 'sent while the store is read' }) }), response);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.doesNotMatch(await fs.readFile(storePath, 'utf8'), /During Restore/, 'nothing is appended mid-read');
    assert.equal(ntfy.calls.length, 0);

    openGate();
    assert.equal(await restoring, 1);
    await request;
    await handler.idle();
    await handler.retryPending();
    await handler.idle();
    assert.equal(response.status, 200);
    assert.deepEqual(ntfy.calls.map((call) => call.body.title.split(': ').at(-1)).sort(), ['During Restore', 'Earlier'], 'each lead is sent once');
  });
});

test('a lead that runs out of attempts says so once and gets a fresh round after a restart', async () => {
  await withHandler({ ntfyState: { fail: true }, config: { maxNotifyAttempts: 2 } }, async ({ handler, storePath, logger, setClock }) => {
    await handler.handleRequest(requestMock({ body: formBody({ name: 'Pat Lee', email: 'pat@example.test', message: 'Is this still available?' }) }), responseMock());
    await handler.idle();
    setClock(new Date(NOW.getTime() + 61_000));
    assert.equal(await handler.retryPending(), 1);
    setClock(new Date(NOW.getTime() + 10 * 60_000));
    assert.equal(await handler.retryPending(), 0, 'the round is used up');
    assert.equal(await handler.retryPending(), 0);
    const parked = logger.lines.filter((line) => /lead \S+ is still undelivered after 2 attempts; it stays in the store/.test(line));
    assert.equal(parked.length, 1, 'said once, not on every pass');

    // The attempt count persisted in the store must not silence it after a restart.
    const ntfy = fakeNtfy();
    const restarted = restartedHandler(storePath, ntfy, { config: { maxNotifyAttempts: 2 } });
    assert.equal(await restarted.restorePending(), 1);
    assert.equal(await restarted.retryPending(), 1, 'a restart starts a fresh round at once');
    await restarted.idle();
    assert.equal(ntfy.calls.length, 1);
    assert.equal((await readEntries(storePath)).at(-1).attempts, 3, 'the stored count keeps the full history');
  });
});

test('names are cut by character and a fast device clock does not block a real visitor', async () => {
  await withHandler({}, async ({ handler, storePath }) => {
    const emojiName = `A${'😀'.repeat(150)}`;
    const longName = '😀'.repeat(250);
    for (const name of [emojiName, longName]) {
      const response = responseMock();
      await handler.handleRequest(requestMock({ body: formBody({ name, email: 'e@example.test', message: 'a message long enough' }) }), response);
      assert.equal(response.status, 200);
    }
    // A device running two minutes fast, with a minute spent on the page.
    const fastClock = responseMock();
    const loadedAt = String(Math.floor(NOW.getTime() / 1000) + 120 - 60);
    await handler.handleRequest(
      requestMock({ body: new URLSearchParams({ _t: loadedAt, website: '', name: 'Real Person', email: 'p@example.test', message: 'Please call me about our PACS.' }).toString() }),
      fastClock,
    );
    assert.equal(fastClock.status, 200);
    // A genuine one-second stay is still refused.
    const tooQuick = responseMock();
    await handler.handleRequest(
      requestMock({ body: new URLSearchParams({ _t: String(Math.floor(NOW.getTime() / 1000) - 1), website: '', name: 'Bot', email: 'b@example.test', message: 'buy now please now' }).toString() }),
      tooQuick,
    );
    assert.equal(tooQuick.status, 422);
    await handler.idle();

    const names = (await readEntries(storePath)).filter((entry) => entry.type === 'lead').map((lead) => lead.name);
    assert.equal(names[0], emojiName, 'a name within 200 characters is kept whole');
    assert.equal(names[1], '😀'.repeat(200));
    for (const name of names) assert.doesNotMatch(name, /[\ud800-\udbff](?![\udc00-\udfff])/, 'no half emoji');
    assert.equal(names[2], 'Real Person');
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
    await handler.handleRequest(requestMock({ body }), responseMock());
    await handler.idle();

    assert.deepEqual(ntfy.calls.map((call) => call.body.topic), ['portfolio-leads-smoke', 'portfolio-leads']);
    assert.equal(ntfy.calls[0].body.priority, 1, 'smoke leads never buzz a phone');
    for (const call of ntfy.calls) assert.equal(call.headers.get('authorization'), `Bearer ${ntfyToken}`);

    const leads = (await readEntries(storePath)).filter((entry) => entry.type === 'lead');
    assert.deepEqual(leads.map((lead) => lead.synthetic === true), [true, false]);
  });
});

// This used to assert that a wrong secret is filed as a real lead. That was the
// defect: after a secret rotation the deploy machine missed, every smoke retry
// became a real inquiry and a priority-4 alert on the owner's phone.
test('a smoke submission with the wrong secret, or with none configured, is refused and stores nothing', async () => {
  const body = formBody({ name: 'Live Smoke', email: 'smoke@example.invalid', message: 'synthetic lead for the deploy smoke' });
  for (const config of [{ smokeSecret: 's'.repeat(32) }, { smokeSecret: '' }]) {
    await withHandler({ config }, async ({ handler, storePath, ntfy }) => {
      for (const provided of ['wrong'.repeat(8), '', 's'.repeat(31)]) {
        const response = responseMock();
        await handler.handleRequest(requestMock({ body, headers: { 'x-contact-smoke': provided } }), response);
        assert.equal(response.status, 403, `secret "${provided}" must be refused`);
      }
      await handler.idle();
      assert.equal(ntfy.calls.length, 0, 'nothing is announced');
      assert.deepEqual(await readEntries(storePath), [], 'nothing is filed');
    });
  }
});

test('loadConfig rejects a malformed token or a short smoke secret', () => {
  const base = { NTFY_URL: 'http://ntfy:80/portfolio-leads' };
  assert.throws(() => loadConfig({ ...base, NTFY_TOKEN: 'not-a-token' }), /NTFY_TOKEN/);
  assert.throws(() => loadConfig({ ...base, CONTACT_SMOKE_SECRET: 'short' }), /CONTACT_SMOKE_SECRET/);
  const config = loadConfig({ ...base, NTFY_TOKEN: `tk_${'0'.repeat(29)}`, CONTACT_SMOKE_SECRET: 'x'.repeat(24) });
  assert.equal(config.ntfyToken, `tk_${'0'.repeat(29)}`);
});

test('loadConfig refuses an NTFY_URL that would publish somewhere else or log credentials', () => {
  /** @type {Array<[string, RegExp]>} */
  const refused = [
    ['http://ntfy:80/a/b', /one topic/],
    ['http://ntfy:80/prefix/portfolio-leads', /one topic/],
    ['http://ntfy:80/portfolio-leads?x=1', /one topic/],
    ['http://ntfy:80/portfolio leads', /one topic/],
    [`http://ntfy:80/${'t'.repeat(59)}`, /one topic/],
    ['ftp://ntfy/portfolio-leads', /http or https/],
  ];
  for (const [url, expected] of refused) {
    assert.throws(() => loadConfig({ NTFY_URL: url }), expected, url);
  }
  assert.throws(
    () => loadConfig({ NTFY_URL: 'http://writer:hunter2@ntfy:80/portfolio-leads' }),
    (error) => error instanceof Error && /must not carry credentials/.test(error.message) && !error.message.includes('hunter2'),
  );
  assert.equal(loadConfig({ NTFY_URL: `https://ntfy.example/${'t'.repeat(58)}` }).ntfyUrl, `https://ntfy.example/${'t'.repeat(58)}`);
});

test('loadConfig requires a topic URL and an absolute store path', () => {
  assert.throws(() => loadConfig({}), /NTFY_URL/);
  assert.throws(() => loadConfig({ NTFY_URL: 'http://ntfy:80/' }), /name a topic/);
  assert.throws(() => loadConfig({ NTFY_URL: 'http://ntfy:80/portfolio-leads', CONTACT_STORE: 'leads.ndjson' }), /absolute/);
  const config = loadConfig({ NTFY_URL: 'http://ntfy:80/portfolio-leads' });
  assert.equal(config.storePath, '/var/lib/contact/leads.ndjson');
  assert.equal(config.port, 8090);
});
