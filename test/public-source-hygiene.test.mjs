import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import process from 'node:process';
import { promisify } from 'node:util';
import { test } from 'node:test';

const execFileAsync = promisify(execFile);

test('public source hygiene audit passes and detects local-only markdown references', async () => {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/audit-public-source-hygiene.mjs', '--self-test'], {
    cwd: process.cwd(),
  });

  assert.match(stdout, /Public source hygiene self-test passed\./);
  assert.match(stdout, /Public source hygiene audit passed\./);
});
