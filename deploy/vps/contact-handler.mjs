#!/usr/bin/env node
// First-party contact form handler. Receives POST /contact, validates the
// submission, checks the honeypot and minimum-time gate, and forwards the
// lead to the local ntfy instance. No third-party service in the flow.
//
// Environment:
//   NTFY_URL           required  e.g. http://ntfy:80/portfolio-leads
//   CONTACT_MIN_TIME   optional  minimum seconds between page load and submit (default 3)
//   CONTACT_LOG        optional  path to write submissions as NDJSON (default /var/lib/contact/submissions.ndjson)

import http from 'node:http';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const NTFY_URL = process.env.NTFY_URL;
if (!NTFY_URL) {
  console.error('contact-handler: NTFY_URL is required');
  process.exit(1);
}

const MIN_TIME_S = Number(process.env.CONTACT_MIN_TIME) || 3;
const LOG_PATH = process.env.CONTACT_LOG || '/var/lib/contact/submissions.ndjson';
const MAX_BODY = 8192;
const PORT = 8090;

try { mkdirSync(dirname(LOG_PATH), { recursive: true }); } catch {}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { req.destroy(); reject(new Error('body too large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseForm(body) {
  const params = new URLSearchParams(body);
  return {
    name: (params.get('name') || '').trim().slice(0, 200),
    email: (params.get('email') || '').trim().slice(0, 200),
    message: (params.get('message') || '').trim().slice(0, 2000),
    honeypot: (params.get('website') || '').trim(),
    loadedAt: Number(params.get('_t')) || 0,
  };
}

function validate(form) {
  if (form.honeypot) return 'honeypot filled';
  if (!form.name) return 'name is required';
  if (!form.email || !form.email.includes('@')) return 'a valid email is required';
  if (!form.message || form.message.length < 10) return 'message must be at least 10 characters';
  if (form.loadedAt > 0) {
    const elapsed = (Date.now() / 1000) - form.loadedAt;
    if (elapsed < MIN_TIME_S) return 'submitted too quickly';
  }
  return null;
}

async function notifyNtfy(form) {
  const title = `Portfolio lead: ${form.name}`;
  const body = `From: ${form.name} <${form.email}>\n\n${form.message}`;
  const res = await fetch(NTFY_URL, {
    method: 'POST',
    headers: {
      'Title': title,
      'Tags': 'incoming_envelope',
      'Priority': '4',
    },
    body,
  });
  if (!res.ok) throw new Error(`ntfy ${res.status}: ${await res.text()}`);
}

function logSubmission(form, status) {
  try {
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      name: form.name,
      email: form.email,
      messageLen: form.message.length,
      status,
    });
    appendFileSync(LOG_PATH, entry + '\n');
  } catch {}
}

function respond(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method !== 'POST' || (req.url !== '/contact' && req.url !== '/api/contact')) {
    respond(res, 404, { error: 'not found' });
    return;
  }

  try {
    const body = await readBody(req);
    const form = parseForm(body);
    const error = validate(form);

    if (error) {
      logSubmission(form, `rejected: ${error}`);
      respond(res, 422, { error });
      return;
    }

    await notifyNtfy(form);
    logSubmission(form, 'delivered');
    respond(res, 200, { ok: true, message: 'Message received. I will get back to you.' });
  } catch (err) {
    console.error('contact-handler error:', err);
    respond(res, 500, { error: 'Something went wrong. Please try emailing directly.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`contact-handler listening on :${PORT}`);
});
