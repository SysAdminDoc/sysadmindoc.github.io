import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { LEAD_RETENTION_DAYS } from '../src/data/retention.ts';
import { leadRetentionProblem } from '../scripts/lib/lead-retention-check.mjs';

const root = process.cwd();
const health = (days, retentionEnforced = true) => JSON.stringify({ ok: true, leadRetentionDays: days, retentionEnforced });

// The third drain review: CONTACT_RETENTION_DAYS in the server's
// contact-secrets.env overrides the default the privacy page is built from,
// and no test can read that file. The twentieth: the variable in the
// container's config isn't what the process uses, so the handler says.
test('the running handler keeps leads as long as /privacy/ says, or the deploy says what it keeps instead', () => {
  assert.equal(leadRetentionProblem(`${health(365)}\n`, 365), null);
  assert.match(leadRetentionProblem(health(730), 365) ?? '', /deletes leads after 730 days, but \/privacy\/ says 365/);
  for (const days of [undefined, null, 0, -1, 1.5, '365']) {
    assert.match(leadRetentionProblem(JSON.stringify({ ok: true, leadRetentionDays: days }), 365) ?? '', /doesn't say how long it keeps leads/, String(days));
  }
  // The twenty-third review: a purge that keeps failing deletes nothing.
  assert.match(leadRetentionProblem(health(365, false), 365) ?? '', /last purge failed, so leads past 365 days aren't being deleted/);
  assert.match(leadRetentionProblem(JSON.stringify({ ok: true, leadRetentionDays: 365 }), 365) ?? '', /last purge failed/, "a handler that doesn't say is not a pass");
  assert.match(leadRetentionProblem('ok', 365) ?? '', /could not read the contact handler's health \(got "ok"\)/, 'an older handler that answers plain ok');
  assert.match(leadRetentionProblem('no answer from /healthz', 365) ?? '', /could not read/);
  assert.match(leadRetentionProblem('', 365) ?? '', /could not read/, 'nothing read is not a pass');
  assert.match(leadRetentionProblem(JSON.stringify({ ok: false, leadRetentionDays: 365 }), 365) ?? '', /could not read/);
  assert.match(leadRetentionProblem('[365]', 365) ?? '', /could not read/);
});

test('the deploy asks the recreated container, and only its health leaves the box', () => {
  const deploy = fs.readFileSync(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  const body = deploy.match(/function verifyLeadRetention\(\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(body, /docker exec portfolio-contact-handler wget -qO- http:\/\/127\.0\.0\.1:8090\/healthz/);
  assert.doesNotMatch(body, /docker inspect|\.Config\.Env/, 'none of the environment, which holds its secrets');
  assert.match(body, /leadRetentionProblem\(output, LEAD_RETENTION_DAYS\)/);
  assert.match(body, /if \(problem\) throw new Error\(/);
  const compose = fs.readFileSync(path.join(root, 'deploy', 'vps', 'docker-compose.yml'), 'utf8');
  assert.match(compose, /"http:\/\/127\.0\.0\.1:8090\/healthz"/, 'the port the healthcheck uses');
  const recreated = deploy.indexOf('up -d --force-recreate');
  const checked = deploy.indexOf('\nverifyLeadRetention();');
  assert.ok(recreated > 0 && checked > recreated, 'it reads the new container');
  assert.equal(LEAD_RETENTION_DAYS, 365);
});
