// The live smoke's proof that a contact-form lead reaches a person.
//
// A 200 from /api/contact only proves ntfy accepted a publish, which is how the
// form ran for five days while notifying nobody. This proves the other end: the
// lead is stored, published, and readable by a subscriber holding a token, and
// the notify host refuses anyone without one. Smoke leads carry a secret header
// so the handler files them as synthetic and publishes them to their own topic,
// never to the owner's phone.

export const NOTIFY_ORIGIN = 'https://notify.getparkerai.com';
export const LEAD_TOPIC = 'portfolio-leads';
export const LEAD_DELIVERY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 3000;

/**
 * @param {object} options
 * @param {string | URL} options.contactUrl absolute URL of the form endpoint under test
 * @param {string} options.notifyOrigin origin of the ntfy host, no trailing slash
 * @param {string} options.secret the smoke secret the handler expects in X-Contact-Smoke
 * @param {string} options.token an ntfy token that can read the smoke topic
 * @param {boolean} options.required fail, rather than skip, when either credential is missing
 * @param {string} options.runId identifies this smoke run in the lead text
 * @param {string} options.userAgent
 * @param {string[]} options.summary receives one line per proven step
 * @param {(url: string | URL, init?: RequestInit) => Promise<Response>} options.fetch
 * @param {(ms: number) => Promise<void>} options.sleep
 * @param {() => number} [options.now] milliseconds since the epoch
 * @param {number} [options.timeoutMs]
 */
export async function checkLeadDelivery({
  contactUrl,
  notifyOrigin,
  secret,
  token,
  required,
  runId,
  userAgent,
  summary,
  fetch,
  sleep,
  now = Date.now,
  timeoutMs = LEAD_DELIVERY_TIMEOUT_MS,
}) {
  const probes = [
    { label: 'anonymous subscribe', url: `${notifyOrigin}/${LEAD_TOPIC}/json?poll=1`, init: { method: 'GET' } },
    { label: 'anonymous publish', url: `${notifyOrigin}/${LEAD_TOPIC}`, init: { method: 'POST', body: 'anonymous publish probe from the live smoke' } },
  ];
  for (const probe of probes) {
    const response = await fetch(probe.url, { ...probe.init, headers: { 'User-Agent': userAgent } });
    await response.text().catch(() => '');
    if (![401, 403].includes(response.status)) {
      throw new Error(`notify host: ${probe.label} returned HTTP ${response.status}; expected 401 or 403 from ${notifyOrigin}.`);
    }
  }
  summary.push('notify host: anonymous subscribe and publish refused');

  if (!secret || !token) {
    if (required) {
      throw new Error('lead delivery: PORTFOLIO_CONTACT_SMOKE_SECRET and PORTFOLIO_NTFY_SMOKE_TOKEN must be set to prove leads reach a subscriber.');
    }
    summary.push('lead delivery: skipped (no smoke credentials in this environment)');
    return;
  }

  // A fresh marker per call: --retries reruns this check, and a lead from an
  // earlier attempt that arrived late must not pass for this one.
  const marker = `smoke-${runId}-${Math.random().toString(36).slice(2, 10)}`;
  const form = new URLSearchParams({
    name: 'Live Smoke',
    email: 'smoke@example.invalid',
    message: `Synthetic lead ${marker} from the deploy smoke. Safe to ignore.`,
    website: '',
    _t: String(Math.floor(now() / 1000) - 60),
  });
  const started = now();
  const post = await fetch(contactUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'X-Contact-Smoke': secret,
      'User-Agent': userAgent,
    },
    body: form.toString(),
  });
  const postBody = await post.text();
  if (post.status === 403) {
    throw new Error(
      'lead delivery: /api/contact refused the smoke secret (HTTP 403). PORTFOLIO_CONTACT_SMOKE_SECRET here no longer matches ' +
        'CONTACT_SMOKE_SECRET in contact-secrets.env on the server; copy the current value from the credentials note.',
    );
  }
  if (post.status !== 200) {
    throw new Error(`lead delivery: /api/contact returned HTTP ${post.status}: ${postBody.slice(0, 200)}`);
  }

  // since=all rather than a timestamp: ntfy compares `since` with the time its
  // own server stamped on each message, so a timestamp from this machine's clock
  // misses the lead whenever this machine runs a few seconds ahead of the VPS.
  // The smoke topic holds a few days of smoke leads, and the marker picks ours.
  const pollUrl = `${notifyOrigin}/${LEAD_TOPIC}-smoke/json?poll=1&since=all`;
  while (now() - started < timeoutMs) {
    const poll = await fetch(pollUrl, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': userAgent } });
    const body = await poll.text();
    if (poll.status !== 200) {
      throw new Error(`lead delivery: the smoke subscriber was refused (HTTP ${poll.status}); check the token in PORTFOLIO_NTFY_SMOKE_TOKEN.`);
    }
    if (body.includes(marker)) {
      summary.push(`lead delivery: synthetic lead stored, published and read back by a subscriber in ${Math.round((now() - started) / 1000)}s`);
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`lead delivery: synthetic lead ${marker} was accepted but never reached the smoke topic within ${timeoutMs / 1000}s.`);
}
