import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { LEAD_RETENTION_DAYS } from '../src/data/retention.ts';
import { leadRetentionProblem } from '../scripts/lib/lead-retention-check.mjs';

const root = process.cwd();
const running = 'container=/portfolio-contact-handler';

// The third drain review: CONTACT_RETENTION_DAYS in the server's
// contact-secrets.env overrides the default the privacy page is built from,
// and no test can read that file.
test('the running handler keeps leads as long as /privacy/ says, or the deploy says what it keeps instead', () => {
  assert.equal(leadRetentionProblem(`${running}\n`, 365), null, 'unset: the default, which a test holds to the page');
  assert.equal(leadRetentionProblem(`${running}\nCONTACT_RETENTION_DAYS=365\n`, 365), null);
  assert.equal(leadRetentionProblem(`${running}\nCONTACT_RETENTION_DAYS=\n`, 365), null, 'empty reads as unset');
  assert.match(leadRetentionProblem(`${running}\nCONTACT_RETENTION_DAYS=730\n`, 365) ?? '', /keeps leads 730 days .* but \/privacy\/ says 365/);
  assert.match(leadRetentionProblem(`${running}\nCONTACT_RETENTION_DAYS=forever\n`, 365) ?? '', /refuses to start with/);
  assert.match(leadRetentionProblem("Error: No such object: portfolio-contact-handler", 365) ?? '', /could not read the contact handler's environment/);
  assert.match(leadRetentionProblem('', 365) ?? '', /could not read/, 'nothing read is not a pass');
  assert.match(leadRetentionProblem('container=/some-other-container\n', 365) ?? '', /could not read/);
});

test('the deploy reads it from the recreated container, and only that variable leaves the box', () => {
  const deploy = fs.readFileSync(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  const body = deploy.match(/function verifyLeadRetention\(\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(body, /docker inspect portfolio-contact-handler --format 'container=\{\{\.Name\}\}\{\{println\}\}\{\{range \.Config\.Env\}\}\{\{println \.\}\}\{\{end\}\}' 2>&1 \| grep -E '\^\(container=\|CONTACT_RETENTION_DAYS=\)'/);
  assert.match(body, /leadRetentionProblem\(output, LEAD_RETENTION_DAYS\)/);
  assert.match(body, /if \(problem\) throw new Error\(/);
  const recreated = deploy.indexOf('up -d --force-recreate');
  const checked = deploy.indexOf('\nverifyLeadRetention();');
  assert.ok(recreated > 0 && checked > recreated, 'it reads the new container');
  assert.equal(LEAD_RETENTION_DAYS, 365);
});
