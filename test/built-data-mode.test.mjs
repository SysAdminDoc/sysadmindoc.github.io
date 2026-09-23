import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { builtDataProblem } from '../scripts/lib/built-data-mode.mjs';

const root = process.cwd();
const status = (generatedData) => JSON.stringify({ generatedData });

test('a build from the committed fixtures, or one that cannot say, is refused', () => {
  for (const mode of ['production-fresh', 'production-attention', 'unauthenticated-partial']) {
    assert.equal(builtDataProblem(status({ mode })), null, mode);
  }
  assert.match(builtDataProblem(status({ mode: 'fixture' })), /built from the committed test fixtures .*visual-gate\.mjs --restore/);
  assert.match(builtDataProblem(status({})), /has no generatedData\.mode/);
  assert.match(builtDataProblem(JSON.stringify({})), /has no generatedData\.mode/);
  assert.match(builtDataProblem(''), /missing or unreadable/);
  assert.match(builtDataProblem('{not json'), /missing or unreadable/);
});

test('deploy-vps checks what the build holds before anything reaches the server', async () => {
  const deploy = await fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  const check = deploy.indexOf('const builtData = builtDataProblem(');
  const firstShip = deploy.indexOf('// 2. Ensure the remote site dir exists.');
  assert.ok(check > 0 && firstShip > check, 'the check runs before the remote dir is touched');
  assert.match(deploy, /if \(builtData\) \{\s*console\.error\(`deploy-vps: \$\{builtData\}\.`\);\s*process\.exit\(1\);\s*\}/);
});

test('the built status.json says fixture when the fixtures are in', async () => {
  // The mode the check reads is the one the site computes from the data.
  const trust = await fs.readFile(path.join(root, 'src', 'data', 'generated-trust.ts'), 'utf8');
  assert.match(trust, /const fixtureMode = input\.profileFeedInfo\.source === 'fixture' \|\| readmeRefresh\?\.source === 'fixture';/);
  assert.match(trust, /const mode = fixtureMode\s*\? 'fixture'/);
  for (const name of ['_profile-projects.json', '_readme-refresh.json']) {
    const fixture = JSON.parse(await fs.readFile(path.join(root, 'src', 'data', 'fixtures', 'generated', name), 'utf8'));
    assert.equal(fixture.source, 'fixture', `${name} marks itself as a fixture`);
  }
});
