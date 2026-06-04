import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const scriptPath = path.join(repoRoot, 'scripts', 'audit-csp.mjs');

function runAudit(args = []) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('csp audit inventories current inline script blockers without failing default mode', () => {
  const output = runAudit();

  assert.match(output, /CSP preflight audit/);
  assert.match(output, /script-src: 'self' 'unsafe-inline'/);
  assert.match(output, /executable inline scripts: 7/);
  assert.match(output, /JSON-LD\/data script blocks: 6/);
  assert.match(output, /inline event handlers: 1/);
  assert.match(output, /first-paint theme initialization/);
  assert.match(output, /page-specific command-palette section data; hash=dynamic/);
  assert.match(output, /recently viewed project tracking; hash=dynamic/);
  assert.match(output, /async global stylesheet media swap/);
  assert.match(output, /CSP preflight audit passed/);
});

test('csp audit strict candidate mode fails on known unsafe-inline blockers', () => {
  const result = spawnSync(process.execPath, [scriptPath, '--candidate-script-src', "'self'", '--strict'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /Candidate script-src: 'self'/);
  assert.match(result.stdout, /BLOCKED - 8 current executable inline surface/);
  assert.match(result.stdout, /recently viewed project tracking/);
  assert.match(result.stdout, /timeline filter controls/);
  assert.match(result.stderr, /candidate script-src 'self' would block 8 current inline surface/);
});
