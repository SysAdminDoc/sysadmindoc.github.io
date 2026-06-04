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
  assert.match(output, /script-src: 'self'/);
  assert.match(output, /script unsafe-inline active: no/);
  assert.match(output, /executable inline scripts: 0/);
  assert.match(output, /JSON-LD\/data script blocks: 12/);
  assert.match(output, /inline event handlers: 0/);
  assert.match(output, /script-src unsafe-inline required today: no/);
  assert.match(output, /CSP preflight audit passed/);
});

test('csp audit strict candidate mode passes with script-src self after script migration', () => {
  const result = spawnSync(process.execPath, [scriptPath, '--candidate-script-src', "'self'", '--strict'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Candidate script-src: 'self'/);
  assert.match(result.stdout, /PASS - candidate allows all current executable inline script surfaces/);
  assert.equal(result.stderr, '');
});
