import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

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
