#!/usr/bin/env node
// Publish-time supply-chain gate: confirm every installed dependency resolves
// to a package with a valid npm registry signature (and attestation where
// available). This is NOT code signing — it verifies the registry's Sigstore
// signatures over the packages already in the lockfile. Run as part of
// `deploy:preflight` so a tampered or unsigned dependency blocks publication.
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const NETWORK_HINTS = /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|getaddrinfo|network|ENETUNREACH|request to .* failed|fetch failed|socket hang up/i;

function runNpmAuditSignatures() {
  const onWindows = process.platform === 'win32';
  const command = onWindows ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const args = onWindows ? ['/d', '/s', '/c', 'npm', 'audit', 'signatures'] : ['audit', 'signatures'];
  return spawnSync(command, args, { encoding: 'utf8', shell: false });
}

const result = runNpmAuditSignatures();
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();

if (result.error) {
  console.error(`verify-signatures: could not start "npm audit signatures": ${result.error.message}`);
  process.exit(1);
}

// Distinguish a transient network failure from a genuine signature failure so
// the operator knows whether to retry or to stop and investigate.
if (result.status !== 0 && NETWORK_HINTS.test(output)) {
  console.error('verify-signatures: could not reach the npm registry to verify dependency signatures.');
  console.error('verify-signatures: this is a NETWORK issue, not a signature failure.');
  console.error('verify-signatures: reconnect and re-run `npm run verify:signatures` (or `npm run publish:pages`).');
  process.exit(2);
}

if (result.status !== 0) {
  if (output) console.error(output);
  console.error('verify-signatures: npm reported missing or INVALID registry signatures/attestations.');
  console.error('verify-signatures: do not publish until every dependency verifies. Inspect the offending packages above.');
  process.exit(1);
}

if (output) console.log(output);
console.log('verify-signatures: all dependency registry signatures verified.');
