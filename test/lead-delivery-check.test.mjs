import assert from 'node:assert/strict';
import test from 'node:test';
import { LEAD_DELIVERY_TIMEOUT_MS, checkLeadDelivery, tokenWaitMs } from '../scripts/lib/lead-delivery-check.mjs';

const NOTIFY = 'https://notify.example';
const CONTACT = 'https://site.example/api/contact';
const TOKEN_URL = 'https://site.example/api/contact/token';
const FORM_TOKEN = 'v1.fake-form-token';

/**
 * The form endpoint and ntfy in one fake, on a virtual clock. ntfy stamps each
 * message with its own server time and filters `since` against that, which is
 * the behaviour a deploy-PC timestamp got wrong.
 */
function fakeLeadPath({ serverOffsetMs = 0, publishDelayMs = 0, contactStatus = 200, tokenStatus = 200, minAgeMs = 3000, sayMinAge = true } = {}) {
  const state = { now: Date.parse('2026-09-23T03:00:00Z'), serverOffsetMs, publishDelayMs, contactStatus, tokenStatus, tokenFetchedAt: null, postedToken: null, posts: 0 };
  const messages = [];
  const scheduled = [];
  const serverSeconds = () => Math.floor((state.now + state.serverOffsetMs) / 1000);
  const flush = () => {
    for (const item of scheduled) {
      if (!item.done && state.now >= item.at) {
        item.done = true;
        messages.push({ time: serverSeconds(), message: item.text });
      }
    }
  };
  async function fetch(url, init = {}) {
    const target = new URL(url);
    const headers = new Headers(init.headers);
    if (target.href === TOKEN_URL) {
      state.tokenFetchedAt = state.now;
      if (state.tokenStatus !== 200) return new Response('{}', { status: state.tokenStatus });
      return new Response(JSON.stringify(sayMinAge ? { token: FORM_TOKEN, minAgeMs } : { token: FORM_TOKEN }), { status: 200 });
    }
    if (target.href === CONTACT) {
      if (state.contactStatus !== 200) return new Response('{"error":"forbidden"}', { status: state.contactStatus });
      state.posts += 1;
      state.postedToken = new URLSearchParams(String(init.body)).get('token');
      // The real handler refuses a token younger than its CONTACT_MIN_TIME.
      if (state.postedToken !== FORM_TOKEN || state.now - state.tokenFetchedAt < minAgeMs) {
        return new Response('{"error":"Please check the form and try again.","code":"token"}', { status: 422 });
      }
      scheduled.push({ at: state.now + state.publishDelayMs, text: new URLSearchParams(String(init.body)).get('message'), done: false });
      flush();
      return new Response('{"ok":true}', { status: 200 });
    }
    if (target.origin !== NOTIFY) throw new Error(`unexpected fetch ${target.href}`);
    if (!headers.get('authorization')) return new Response('{"code":40301}', { status: 403 });
    if (target.pathname === '/portfolio-leads-smoke/json') {
      flush();
      const since = target.searchParams.get('since');
      const visible = since === 'all' ? messages : messages.filter((m) => m.time >= Number(since));
      return new Response(visible.map((m) => JSON.stringify(m)).join('\n'), { status: 200 });
    }
    return new Response('', { status: 404 });
  }
  return {
    state,
    fetch,
    sleep: async (ms) => { state.now += ms; },
    now: () => state.now,
  };
}

function run(lead, overrides = {}) {
  const summary = [];
  const promise = checkLeadDelivery({
    contactUrl: CONTACT,
    tokenUrl: TOKEN_URL,
    notifyOrigin: NOTIFY,
    secret: 's'.repeat(40),
    token: `tk_${'a'.repeat(29)}`,
    required: true,
    runId: 'run-1',
    userAgent: 'test',
    summary,
    fetch: lead.fetch,
    sleep: lead.sleep,
    now: lead.now,
    ...overrides,
  });
  return { promise, summary };
}

test('a lead read back on the VPS clock passes whatever the deploy PC clock says', async () => {
  for (const serverOffsetMs of [0, -6_000, -90_000, 90_000]) {
    const lead = fakeLeadPath({ serverOffsetMs });
    const { promise, summary } = run(lead);
    await promise;
    assert.match(summary.at(-1), /read back by a subscriber/, `server clock offset ${serverOffsetMs} ms`);
  }
});

test('a retry does not pass on the late lead of an earlier attempt', async () => {
  const lead = fakeLeadPath({ publishDelayMs: 90_000 });
  await assert.rejects(run(lead).promise, /never reached the smoke topic/);
  // The first attempt's lead lands during the second attempt, whose own never does.
  lead.state.publishDelayMs = 10 * LEAD_DELIVERY_TIMEOUT_MS;
  await assert.rejects(run(lead).promise, /never reached the smoke topic/);
});

test('the smoke sends the form the way the page script does: token first, then a wait', async () => {
  const lead = fakeLeadPath();
  await run(lead).promise;
  assert.equal(lead.state.postedToken, FORM_TOKEN);

  const broken = fakeLeadPath({ tokenStatus: 502 });
  await assert.rejects(run(broken).promise, /form token endpoint returned HTTP 502 without a token/);
});

// The third drain review: a fixed 3.5 s wait failed the first try of every
// smoke once CONTACT_MIN_TIME went past it.
test('the smoke waits as long as the handler says its token needs, and no longer', async () => {
  const slow = fakeLeadPath({ minAgeMs: 5000 });
  const { promise, summary } = run(slow);
  await promise;
  assert.equal(slow.state.posts, 1, 'sent once, on the first try');
  assert.match(summary.at(-1), /read back by a subscriber/);
  // A handler from before minAgeMs still asks for three seconds.
  const older = fakeLeadPath({ sayMinAge: false });
  await run(older).promise;
  assert.equal(older.state.posts, 1);
  assert.equal(tokenWaitMs({ token: 'x', minAgeMs: 5000 }), 5500);
  assert.equal(tokenWaitMs({ token: 'x' }), 3500);
  assert.equal(tokenWaitMs({ token: 'x', minAgeMs: -1 }), 3500);
  assert.equal(tokenWaitMs({ token: 'x', minAgeMs: '5000' }), 3500, 'only a number counts');
  assert.equal(tokenWaitMs({ token: 'x', minAgeMs: 10 * 60_000 }), 60_500, 'a minute at most');
  assert.equal(tokenWaitMs(null), 3500);
});

test('a refused smoke secret fails at once with the fix named', async () => {
  const lead = fakeLeadPath({ contactStatus: 403 });
  await assert.rejects(run(lead).promise, /refused the smoke secret \(HTTP 403\).*CONTACT_SMOKE_SECRET/);
});

test('missing credentials fail a required check and skip an optional one', async () => {
  const lead = fakeLeadPath();
  await assert.rejects(run(lead, { token: '' }).promise, /must be set to prove leads reach a subscriber/);
  const optional = run(lead, { secret: '', required: false });
  await optional.promise;
  assert.equal(optional.summary.at(-1), 'lead delivery: skipped (no smoke credentials in this environment)');
});
