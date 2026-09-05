import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { computeProvenance } from '../scripts/fetch-stars.mjs';

const root = process.cwd();

test('release prose never earns the attested tier', () => {
  // RcloneBrowserNG v2.0.2 was published in the attested tier because its release
  // note reads "This repository has no CI, so there are no build attestations."
  // The classifier matched the word and reported the opposite of what the release
  // said about itself. Prose is a claim; an artifact is evidence.
  const denial = 'This repository has no CI, so there are no build attestations.';
  assert.equal(computeProvenance([{ name: 'app.exe' }, { name: 'SHA256SUMS' }], denial), 'checksum');
  assert.equal(computeProvenance([{ name: 'app.exe' }], denial), 'unsigned');
  assert.equal(computeProvenance([{ name: 'app.exe' }], 'signed with sigstore elsewhere'), 'unsigned');
  assert.equal(computeProvenance([{ name: 'app.exe' }], 'attestations coming soon'), 'unsigned');
});

test('attested requires a sigstore bundle shipped with the release', () => {
  assert.equal(computeProvenance([{ name: 'app.exe' }, { name: 'app.exe.sigstore.json' }], ''), 'attested');
  assert.equal(computeProvenance([{ name: 'app.exe' }, { name: 'app.exe.sigstore' }], ''), 'attested');
  // Case should not matter: GitHub asset names are arbitrary.
  assert.equal(computeProvenance([{ name: 'App.EXE.SIGSTORE.JSON' }], ''), 'attested');
});

test('the lower tiers still classify from artifacts alone', () => {
  assert.equal(computeProvenance([], 'anything'), 'no-assets');
  assert.equal(computeProvenance([{ name: 'app.zip' }, { name: 'app.zip.sha256' }], ''), 'checksum');
  assert.equal(computeProvenance([{ name: 'app.zip' }, { name: 'SHA256SUMS.txt' }], ''), 'checksum');
  assert.equal(computeProvenance([{ name: 'app.tar.gz' }, { name: 'app.tar.gz.asc' }], ''), 'checksum');
  assert.equal(computeProvenance([{ name: 'app.zip' }], ''), 'unsigned');
  // A malformed asset entry must not crash or promote anything.
  assert.equal(computeProvenance([{ name: null }], ''), 'unsigned');
});

test('the attested tier is documented as unreachable while builds stay local', async () => {
  const trust = await fs.readFile(path.join(root, 'src', 'data', 'generated-trust.ts'), 'utf8');

  // GitHub only issues artifact attestations from a workflow
  // (actions/attest-build-provenance), and this project builds and releases
  // locally on purpose. Publishing a trust tier nobody can reach invites the
  // reader to treat a 0 as a failure rather than a policy consequence.
  assert.match(trust, /RELEASE_PROVENANCE_CEILING/);
  assert.match(trust, /attest-build-provenance/);
});
