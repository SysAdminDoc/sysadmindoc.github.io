import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { accessLogShapeProblem, keyPaths } from '../scripts/lib/access-log-shape.mjs';

// An entry as the edge writes it with the filter in deploy/vps/caddy-block.txt
// (a throwaway Caddy 2.11.3 on the VPS, 2026-09-23), with made-up values.
const entry = {
  level: 'info',
  ts: 1790000000.5,
  logger: 'http.log.access.portfolio',
  msg: 'handled request',
  request: { remote_ip: '203.0.113.7', client_ip: '203.0.113.7', proto: 'HTTP/2.0', method: 'GET', host: 'portfolio.getparkerai.com', uri: '/catalog/' },
  duration: 0.0021,
  size: 5120,
  status: 200,
  referer: 'https://portfolio.getparkerai.com/search/',
  user_agent: 'Mozilla/5.0',
};
const lines = (...entries) => entries.map((item) => JSON.stringify(item)).join('\n');
const withRequest = (fields) => ({ ...entry, request: { ...entry.request, ...fields } });

test('entries that hold only what /privacy/ names pass', () => {
  assert.equal(accessLogShapeProblem(lines(entry, { ...entry, referer: '' }, { ...entry, level: 'error', status: 502 })), null);
});

test('any field the page does not name fails, however deep', () => {
  // What Caddy 2.11 writes when the filter misses it.
  assert.match(accessLogShapeProblem(lines({ ...entry, bytes_read: 0 })) ?? '', /keeps bytes_read, which \/privacy\/ doesn't name/);
  assert.match(accessLogShapeProblem(lines({ ...entry, user_id: '' })) ?? '', /keeps user_id/);
  assert.match(accessLogShapeProblem(lines(withRequest({ transfer_encoding: ['chunked'] }))) ?? '', /keeps request\.transfer_encoding/);
  assert.match(accessLogShapeProblem(lines(withRequest({ headers: { 'User-Agent': ['x'] } }))) ?? '', /keeps request\.headers\.User-Agent/);
  assert.match(accessLogShapeProblem(lines(withRequest({ remote_port: '51234' }))) ?? '', /keeps request\.remote_port/);
  // A field newer than 2.11, and one line in the middle of good ones.
  assert.match(accessLogShapeProblem(lines(entry, { ...entry, write_error: 'broken pipe' }, entry)) ?? '', /keeps write_error/);
});

test('a query string on the page or the referrer fails', () => {
  assert.match(accessLogShapeProblem(lines(withRequest({ uri: '/search/?q=clinic' }))) ?? '', /query string in the page/);
  assert.match(accessLogShapeProblem(lines({ ...entry, referer: 'https://portfolio.getparkerai.com/search/?q=clinic' })) ?? '', /query string in the referrer/);
});

// The seventh drain review: a request whose Host differs in case skips the
// portfolio logger, so a shape check over old entries passed while new ones
// went elsewhere.
test('the entries must include one from this deploy, or the smoke was logged elsewhere', () => {
  const since = entry.ts - 60;
  assert.equal(accessLogShapeProblem(lines({ ...entry, ts: since - 3600 }, entry), { since }), null);
  assert.match(accessLogShapeProblem(lines({ ...entry, ts: since - 3600 }, { ...entry, ts: since - 1 }), { since }) ?? '', /none of the edge's newest portfolio access-log entries is from this deploy's smoke/);
  assert.equal(accessLogShapeProblem(lines({ ...entry, ts: since - 3600 })), null, 'without since, age is not judged');
});

test('an empty or unreadable log fails rather than passing unchecked', () => {
  assert.match(accessLogShapeProblem('') ?? '', /no entries to check/);
  assert.match(accessLogShapeProblem('\n\n') ?? '', /no entries to check/);
  assert.match(accessLogShapeProblem('tail: cannot open') ?? '', /could not read an entry/);
});

test('the deploy reads the smoke\'s own entries back from the running edge', async () => {
  const deploy = await fs.readFile(path.join(process.cwd(), 'scripts', 'deploy-vps.mjs'), 'utf8');
  assert.match(deploy, /docker exec caddy tail -n 20 \/var\/log\/caddy\/portfolio\.log/);
  const smoke = deploy.indexOf("'--require-lead-delivery',");
  const started = deploy.indexOf('const smokeStartedAt = ');
  const checked = deploy.indexOf('\n  verifyAccessLogShape(smokeStartedAt);');
  assert.ok(started > 0 && started < smoke, 'the clock is read before the smoke runs');
  assert.ok(smoke > 0 && checked > smoke, 'the check runs after the smoke has made its requests');
});

test('key paths reach every leaf, and an array is one leaf', () => {
  assert.deepEqual(keyPaths({ a: 1, b: { c: 'x', d: [1, 2] }, e: {} }), ['a', 'b.c', 'b.d', 'e']);
});
