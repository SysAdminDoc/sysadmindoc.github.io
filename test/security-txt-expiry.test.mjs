import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  SECURITY_TXT_WARN_DAYS,
  securityTxtExpiresValue,
  securityTxtExpiry,
} from '../scripts/lib/security-txt-expiry.mjs';

const root = process.cwd();
const DAY_MS = 86_400_000;
const now = new Date('2026-09-23T12:00:00.000Z');
const inDays = (days) => new Date(now.getTime() + days * DAY_MS).toISOString();

test('security.txt expiry is fine until 60 days out, then warns, then fails', () => {
  assert.equal(SECURITY_TXT_WARN_DAYS, 60);
  assert.deepEqual(securityTxtExpiry(inDays(200), now), { level: 'ok', message: null, daysLeft: 200 });
  assert.equal(securityTxtExpiry(new Date(now.getTime() + 60 * DAY_MS + 1).toISOString(), now).level, 'ok');

  const edge = securityTxtExpiry(inDays(60), now);
  assert.equal(edge.level, 'warn');
  assert.equal(edge.daysLeft, 60);
  assert.match(edge.message ?? '', /security\.txt expires 2026-11-22T12:00:00\.000Z, 60 day\(s\) from now/);
  assert.match(edge.message ?? '', /public\/\.well-known\/security\.txt/);

  const lastHour = securityTxtExpiry(new Date(now.getTime() + 3_600_000).toISOString(), now);
  assert.equal(lastHour.level, 'warn');
  assert.equal(lastHour.daysLeft, 1);

  const expired = securityTxtExpiry(now.toISOString(), now);
  assert.equal(expired.level, 'fail');
  assert.match(expired.message ?? '', /is in the past/);

  const tooFar = securityTxtExpiry(inDays(370), now);
  assert.equal(tooFar.level, 'fail');
  assert.match(tooFar.message ?? '', /more than 1 year from now/);

  assert.equal(securityTxtExpiry('someday', now).level, 'fail');
});

test('the Expires value is read from the field, whatever the line endings', () => {
  const body = '# comment\r\nContact: https://example.test/\r\nExpires: 2027-06-16T00:00:00.000Z  \r\nPreferred-Languages: en\r\n';
  assert.equal(securityTxtExpiresValue(body), '2027-06-16T00:00:00.000Z');
  assert.equal(securityTxtExpiresValue('Contact: https://example.test/\n# Expires: 2001-01-01\n'), null);
});

// The endpoint audit reads these from dist/. Copying just them keeps the check
// on the real build without copying the whole tree.
const endpointAuditFiles = [
  'resume.json', 'projects.json', 'releases.json', 'status.json', 'cmdk-data.js', 'llms.txt',
  'index.html', '.well-known/security.txt', 'robots.txt', 'speculation-rules.json', 'humans.txt',
];

test('the endpoint audit warns inside the 60 days and still fails after expiry', async (t) => {
  const built = await fs.access(path.join(root, 'dist', 'index.html')).then(() => true, () => false);
  if (!built) {
    t.skip('dist/ not built; run npm run build');
    return;
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-securitytxt-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  for (const file of endpointAuditFiles) {
    await fs.mkdir(path.dirname(path.join(dir, file)), { recursive: true });
    await fs.copyFile(path.join(root, 'dist', file), path.join(dir, file));
  }
  const securityPath = path.join(dir, '.well-known', 'security.txt');
  const original = await fs.readFile(securityPath, 'utf8');
  const audit = () =>
    spawnSync(process.execPath, [path.join(root, 'scripts', 'audit-public-endpoints.mjs'), '--dist', dir], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
    });

  const clean = audit();
  assert.equal(clean.status, 0, `the unmodified copy passes: ${clean.stderr}`);

  const soon = new Date(Date.now() + 30 * DAY_MS).toISOString();
  await fs.writeFile(securityPath, original.replace(/^Expires:.*$/m, `Expires: ${soon}`));
  const warned = audit();
  assert.equal(warned.status, 0, `a warning alone does not fail the audit: ${warned.stderr}`);
  assert.match(warned.stderr, new RegExp(`WARN {2}security\\.txt expires ${soon.replace(/\./g, '\\.')}, 30 day\\(s\\) from now`));

  await fs.writeFile(securityPath, original.replace(/^Expires:.*$/m, 'Expires: 2001-01-01T00:00:00.000Z'));
  const expired = audit();
  assert.equal(expired.status, 1);
  assert.match(expired.stderr, /security\.txt Expires date "2001-01-01T00:00:00\.000Z" is in the past/);
});
