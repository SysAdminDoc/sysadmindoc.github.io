import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { CAPTURE_STALE_DAYS, CAPTURE_WARN_DAYS, captureAgeLevel, captureDueWarning } from '../scripts/lib/capture-age.mjs';

const root = process.cwd();

// 2026-10-02: all 22 captures crossed 90 days together, with no notice before
// the nightly started aborting.
test('a capture 76 days old warns without failing, and one 91 days old still fails', () => {
  assert.equal(CAPTURE_STALE_DAYS, 90);
  assert.equal(CAPTURE_WARN_DAYS, 75);
  assert.equal(captureAgeLevel(0), 'ok');
  assert.equal(captureAgeLevel(75), 'ok');
  assert.equal(captureAgeLevel(76), 'due');
  assert.equal(captureAgeLevel(90), 'due');
  assert.equal(captureAgeLevel(91), 'stale');
  assert.equal(captureAgeLevel(null), null);

  const report = (ages) => JSON.stringify({ results: Object.entries(ages).map(([slug, masterAgeDays]) => ({ slug, masterAgeDays })) });
  const warning = captureDueWarning(report({ IconForge: 76, SPECTRE: 80, Fresh: 10, Gone: 91 }));
  assert.match(warning ?? '', /^2 live-app screenshot capture\(s\) are past 75 days \(oldest 80d\), and the deploy stops at 90: IconForge, SPECTRE\./);
  assert.equal(captureDueWarning(report({ Fresh: 10 })), null);
  assert.equal(captureDueWarning('not json'), null);

  return fs.readFile(path.join(root, 'scripts', 'audit-live-apps.mjs'), 'utf8').then((audit) => {
    // The stale verdict, which fails the audit, and the warning share one rule.
    assert.match(audit, /screenshotStale = captureAgeLevel\(masterAgeDays\) === 'stale'/);
    assert.match(audit, /screenshotDue = captureAgeLevel\(masterAgeDays\) === 'due'/);
    assert.doesNotMatch(audit, /due\.length \+|\|\| due\.length/, 'a capture that is only due never counts as a failure');
  });
});

test('live app audit requires committed screenshot manifest provenance', async () => {
  const audit = await fs.readFile(path.join(root, 'scripts', 'audit-live-apps.mjs'), 'utf8');
  const capture = await fs.readFile(path.join(root, 'scripts', 'capture-screenshots.mjs'), 'utf8');
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'public', 'screenshots', 'manifest.json'), 'utf8'));

  assert.match(audit, /manifest schema must be sysadmindoc\.screenshot-manifest\.v1/);
  assert.match(audit, /manifest is missing or invalid/);
  assert.match(audit, /manifest has duplicate capture/);
  assert.match(audit, /manifest has extra capture/);
  assert.match(audit, /manifest result is/);
  assert.match(audit, /manifest URL does not match liveApps URL/);
  assert.match(audit, /manifest sha256 does not match master screenshot/);
  assert.match(audit, /Manifest provenance failures:/);
  assert.match(audit, /process\.exit\(1\)/);
  assert.match(capture, /manifest\.sort/);
  assert.match(capture, /schema: 'sysadmindoc\.screenshot-manifest\.v1'/);
  assert.equal(manifest.schema, 'sysadmindoc.screenshot-manifest.v1');
  assert.equal(manifest.captures.length, 22);
  assert.equal(manifest.captures.filter((captureEntry) => captureEntry.result === 'ok').length, 22);
});
