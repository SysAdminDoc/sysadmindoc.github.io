import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import {
  CHECK_FORM_MESSAGE,
  DEFAULT_CONFIG,
  NOTIFY_MESSAGE_MAX_BYTES,
  NOTIFY_TITLE_MAX_BYTES,
  clientAddress,
  createContactHandler,
  loadConfig,
  notificationFor,
  readToken,
  signToken,
  truncateBytes,
} from '../deploy/vps/contact-handler.mjs';

const NOW = new Date('2026-09-22T12:00:00.000Z');
const TOKEN_SECRET = 'test-token-secret-'.repeat(3);
// Limits high enough that only the tests about limits ever meet them.
const TEST_CONFIG = { ntfyUrl: 'http://ntfy:80/portfolio-leads', tokenSecret: TOKEN_SECRET, clientMax: 1000, noTokenClientMax: 1000, globalHourlyCap: 1000 };

/** A valid form token issued `ageMs` before NOW, with its own nonce. */
function tokenAged(ageMs = 30_000) {
  return signToken(TOKEN_SECRET, NOW.getTime() - ageMs, randomBytes(8).toString('hex'));
}

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
    { ...DEFAULT_CONFIG, ...TEST_CONFIG, storePath, ...(options.config ?? {}) },
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

/** A form as the page script sends it: a fresh token unless the test overrides it. */
function formBody(fields) {
  return new URLSearchParams({ website: '', token: tokenAged(), ...fields }).toString();
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
      { ...DEFAULT_CONFIG, ...TEST_CONFIG, storePath },
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
    { ...DEFAULT_CONFIG, ...TEST_CONFIG, storePath, ...(extra.config ?? {}) },
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

test('a lead whose text holds U+2028 or U+2029 survives a restart', async () => {
  // FileHandle.readLines, like readline, breaks lines at both characters, and
  // JSON.stringify leaves them raw, so such a lead used to split in two and
  // vanish from the retry queue at the next restart.
  await withHandler({ ntfyState: { fail: true } }, async ({ handler, storePath }) => {
    const pasted = 'Pasted from a spec:\u2028we need PACS help\u2029soon';
    await handler.handleRequest(requestMock({ body: formBody({ name: 'Pat Lee', email: 'pat@example.test', message: pasted }) }), responseMock());
    await handler.idle();
    assert.doesNotMatch(await fs.readFile(storePath, 'utf8'), /[\u2028\u2029]/, 'the store holds them escaped');

    // A record written before the escaping, with the characters raw, loads too.
    const older = JSON.stringify({ type: 'lead', id: '20260921-a2028b', receivedAt: NOW.toISOString(), name: 'Older Record', email: 'o@example.test', message: 'raw\u2028separators\u2029inside', subject: '', page: '/', status: 'pending' });
    assert.match(older, /\u2028/);
    await fs.appendFile(storePath, `${older}\n`);

    const ntfy = fakeNtfy();
    const restarted = restartedHandler(storePath, ntfy);
    assert.equal(await restarted.restorePending(), 2);
    assert.equal(await restarted.retryPending(), 2);
    await restarted.idle();
    const sent = ntfy.calls.map((call) => call.body.message);
    assert.ok(sent.some((message) => message.endsWith(pasted)), 'the pasted text arrives whole');
    assert.ok(sent.some((message) => message.endsWith('raw\u2028separators\u2029inside')));
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
    // A device ten minutes fast: the old browser timestamp would have said the
    // form was filled in before the page loaded. The server's own token decides.
    const fastClock = responseMock();
    const deviceSeconds = String(Math.floor(NOW.getTime() / 1000) + 600);
    await handler.handleRequest(
      requestMock({ body: formBody({ _t: deviceSeconds, name: 'Real Person', email: 'p@example.test', message: 'Please call me about our PACS.' }) }),
      fastClock,
    );
    assert.equal(fastClock.status, 200);
    // A token fetched one second ago is still too quick.
    const tooQuick = responseMock();
    await handler.handleRequest(
      requestMock({ body: formBody({ token: tokenAged(1_000), name: 'Bot', email: 'b@example.test', message: 'buy now please now' }) }),
      tooQuick,
    );
    assert.equal(tooQuick.status, 422);
    assert.deepEqual(JSON.parse(tooQuick.body), { error: CHECK_FORM_MESSAGE, code: 'token' });
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
    // One form each: a token is good for a single submission.
    const fields = { name: 'Live Smoke', email: 'smoke@example.invalid', message: 'synthetic lead for the deploy smoke' };
    await handler.handleRequest(requestMock({ body: formBody(fields), headers: { 'x-contact-smoke': smokeSecret } }), responseMock());
    await handler.handleRequest(requestMock({ body: formBody(fields) }), responseMock());
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

test('a browser posting without JavaScript gets a page back, never JSON', async () => {
  await withHandler({}, async ({ handler, storePath }) => {
    const navigate = { accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'sec-fetch-mode': 'navigate', referer: 'https://portfolio.getparkerai.com/healthcare-it/' };

    const sent = responseMock();
    await handler.handleRequest(
      requestMock({ body: formBody({ name: 'Pat Lee', email: 'pat@example.test', message: 'Our PACS migration needs help.', subject: 'Healthcare IT' }), headers: navigate }),
      sent,
    );
    assert.equal(sent.status, 303);
    assert.equal(sent.headers.Location, '/contact/sent/');
    assert.equal(sent.body, '', 'no JSON body for a browser to show');

    const refused = responseMock();
    await handler.handleRequest(requestMock({ body: formBody({ name: '', email: 'pat@example.test', message: 'long enough text' }), headers: navigate }), refused);
    assert.equal(refused.status, 303);
    assert.equal(refused.headers.Location, '/healthcare-it/#contact-not-sent', 'back to the form, where the note shows');

    // Only a path on this site: a crafted referer can't turn this into an open redirect.
    for (const referer of ['https://evil.example//evil.example/x', 'https://portfolio.getparkerai.com/\\evil.example', 'not a url']) {
      const response = responseMock();
      await handler.handleRequest(requestMock({ body: formBody({ name: '', email: 'x@example.test', message: 'long enough text' }), headers: { ...navigate, referer } }), response);
      assert.equal(response.headers.Location, '/#contact-not-sent', referer);
    }
    await handler.idle();

    const leads = (await readEntries(storePath)).filter((entry) => entry.type === 'lead');
    assert.equal(leads.length, 1);
    assert.equal(leads[0].subject, 'Healthcare IT', 'the hidden subject field reaches the stored record');
    assert.equal(leads[0].page, '/healthcare-it/');
  });
});

test('the page script, which asks for JSON, still gets JSON', async () => {
  await withHandler({}, async ({ handler }) => {
    const response = responseMock();
    await handler.handleRequest(
      requestMock({ body: formBody({ name: 'Pat Lee', email: 'pat@example.test', message: 'Is this still available?' }), headers: { accept: 'application/json', 'sec-fetch-mode': 'cors' } }),
      response,
    );
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(response.body).ok, true);
    await handler.idle();
  });
});

function jsonPost(fields, headers = {}) {
  return requestMock({ body: formBody(fields), headers: { accept: 'application/json', ...headers } });
}

const lead = { name: 'Pat Lee', email: 'pat@example.test', message: 'Is this still available?' };

test('the token endpoint issues a signed server timestamp that a later submission can use once', async () => {
  await withHandler({}, async ({ handler, storePath, setClock }) => {
    const issued = responseMock();
    await handler.handleRequest(requestMock({ method: 'GET', url: '/api/contact/token' }), issued);
    assert.equal(issued.status, 200);
    assert.equal(issued.headers['Cache-Control'], 'no-store');
    const { token } = JSON.parse(issued.body);
    assert.deepEqual(readToken(TOKEN_SECRET, token)?.issuedAt, NOW.getTime());

    setClock(new Date(NOW.getTime() + 5_000));
    const first = responseMock();
    await handler.handleRequest(jsonPost({ ...lead, token }), first);
    assert.equal(first.status, 200);
    const replay = responseMock();
    await handler.handleRequest(jsonPost({ ...lead, token }), replay);
    assert.equal(replay.status, 422, 'the same token twice is a replay');
    await handler.idle();
    assert.equal((await readEntries(storePath)).filter((entry) => entry.type === 'lead').length, 1);
  });
});

test('a scripted submission without a good token is refused, generically, and stores nothing', async () => {
  await withHandler({}, async ({ handler, storePath, logger }) => {
    const cases = [
      ['no token', ''],
      ['malformed', 'not-a-token'],
      ['forged', signToken('some-other-key-'.repeat(3), NOW.getTime() - 30_000, 'a'.repeat(16))],
      ['expired', tokenAged(4 * 60 * 60_000 + 1_000)],
      ['too new', tokenAged(2_000)],
    ];
    for (const [label, token] of cases) {
      const response = responseMock();
      await handler.handleRequest(jsonPost({ ...lead, token }), response);
      assert.equal(response.status, 422, label);
      assert.deepEqual(JSON.parse(response.body), { error: CHECK_FORM_MESSAGE, code: 'token' }, label);
    }
    const honeypot = responseMock();
    await handler.handleRequest(jsonPost({ ...lead, website: 'http://spam.example' }), honeypot);
    assert.deepEqual(JSON.parse(honeypot.body), { error: CHECK_FORM_MESSAGE }, 'the refusal never names the honeypot');
    assert.deepEqual(await readEntries(storePath), []);
    // The reasons still reach the log, for whoever reads it.
    for (const reason of ['no token', 'token forged or malformed', 'token expired', 'submitted too quickly', 'honeypot filled']) {
      assert.ok(logger.lines.some((line) => line.includes(reason)), reason);
    }
  });
});

test('each client gets a limited number of attempts, and the smoke is not counted', async () => {
  const smokeSecret = 's'.repeat(32);
  await withHandler({ config: { clientMax: 3, smokeSecret } }, async ({ handler }) => {
    const statuses = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = responseMock();
      await handler.handleRequest(jsonPost(lead, { 'x-forwarded-for': '203.0.113.7, 172.18.0.2' }), response);
      statuses.push(response.status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429]);

    const neighbour = responseMock();
    await handler.handleRequest(jsonPost(lead, { 'x-forwarded-for': '198.51.100.4, 172.18.0.2' }), neighbour);
    assert.equal(neighbour.status, 200, 'another visitor is unaffected');
    const smoke = responseMock();
    await handler.handleRequest(jsonPost(lead, { 'x-forwarded-for': '203.0.113.7, 172.18.0.2', 'x-contact-smoke': smokeSecret }), smoke);
    assert.equal(smoke.status, 200, 'the authenticated smoke is exempt');
    await handler.idle();
  });
});

test('a browser without JavaScript can send without a token, under a stricter limit', async () => {
  await withHandler({ config: { noTokenClientMax: 2 } }, async ({ handler, storePath }) => {
    const navigate = { accept: 'text/html,*/*;q=0.8', 'sec-fetch-mode': 'navigate', referer: 'https://portfolio.getparkerai.com/', 'x-forwarded-for': '203.0.113.7, 172.18.0.2' };
    const locations = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = responseMock();
      await handler.handleRequest(requestMock({ body: formBody({ ...lead, token: '' }), headers: navigate }), response);
      locations.push(response.headers.Location);
    }
    assert.deepEqual(locations, ['/contact/sent/', '/contact/sent/', '/#contact-not-sent']);
    await handler.idle();
    assert.equal((await readEntries(storePath)).filter((entry) => entry.type === 'lead').length, 2);
  });
});

test('stored leads have a global hourly cap that the smoke does not use up', async () => {
  const smokeSecret = 's'.repeat(32);
  await withHandler({ config: { globalHourlyCap: 2, smokeSecret } }, async ({ handler, setClock }) => {
    const statuses = [];
    for (const address of ['203.0.113.1', '203.0.113.2', '203.0.113.3']) {
      const response = responseMock();
      await handler.handleRequest(jsonPost(lead, { 'x-forwarded-for': address }), response);
      statuses.push(response.status);
    }
    assert.deepEqual(statuses, [200, 200, 429]);
    const smoke = responseMock();
    await handler.handleRequest(jsonPost(lead, { 'x-contact-smoke': smokeSecret }), smoke);
    assert.equal(smoke.status, 200);

    setClock(new Date(NOW.getTime() + 61 * 60_000));
    const later = responseMock();
    await handler.handleRequest(requestMock({ body: new URLSearchParams({ website: '', ...lead, token: signToken(TOKEN_SECRET, NOW.getTime() + 60 * 60_000, 'b'.repeat(16)) }).toString(), headers: { accept: 'application/json', 'x-forwarded-for': '203.0.113.4' } }), later);
    assert.equal(later.status, 200, 'the hour rolls on');
    await handler.idle();
  });
});

test('the client is the right-most address that is not on a private network', () => {
  assert.equal(clientAddress({ 'x-forwarded-for': '203.0.113.7, 172.18.0.2' }), '203.0.113.7');
  assert.equal(clientAddress({ 'x-forwarded-for': 'spoofed, 198.51.100.4, 172.18.0.2' }), '198.51.100.4');
  assert.equal(clientAddress({ 'x-forwarded-for': '2001:db8::1, fd00::2' }), '2001:db8::1');
  assert.equal(clientAddress({ 'x-forwarded-for': '::ffff:192.168.1.5, 10.0.0.2' }), '::ffff:192.168.1.5');
  assert.equal(clientAddress({}, '127.0.0.1'), '127.0.0.1');
});

test('loadConfig rejects a malformed token or a short smoke secret', () => {
  const base = { NTFY_URL: 'http://ntfy:80/portfolio-leads' };
  assert.throws(() => loadConfig({ ...base, NTFY_TOKEN: 'not-a-token' }), /NTFY_TOKEN/);
  assert.throws(() => loadConfig({ ...base, CONTACT_SMOKE_SECRET: 'short' }), /CONTACT_SMOKE_SECRET/);
  assert.throws(() => loadConfig({ ...base, CONTACT_TOKEN_SECRET: 'short' }), /CONTACT_TOKEN_SECRET/);
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
