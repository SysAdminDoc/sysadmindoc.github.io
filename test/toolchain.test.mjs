import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

async function readPackage() {
  return JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
}

function majorOf(version) {
  const match = String(version ?? '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

test('.nvmrc agrees with the declared Node engine floor', async () => {
  const pkg = await readPackage();
  const nvmrc = (await fs.readFile(path.join(root, '.nvmrc'), 'utf8')).trim();
  const nvmrcMajor = majorOf(nvmrc);
  const engineFloor = majorOf(pkg.engines?.node);

  assert.ok(nvmrcMajor !== null, '.nvmrc must declare a Node major version');
  assert.ok(engineFloor !== null, 'package.json engines.node must declare a floor');
  assert.ok(
    nvmrcMajor >= engineFloor,
    `.nvmrc (${nvmrc}) must be >= engines.node floor (${pkg.engines.node})`,
  );
});

test('packageManager pins the validated npm line', async () => {
  const pkg = await readPackage();
  assert.match(
    pkg.packageManager ?? '',
    /^npm@11\.\d+\.\d+$/,
    'packageManager must pin a concrete npm 11.x version for reproducible local publishing',
  );
});

test('publish preflight verifies dependency registry signatures', async () => {
  const pkg = await readPackage();
  assert.equal(pkg.scripts['verify:signatures'], 'node scripts/verify-signatures.mjs');
  assert.match(pkg.scripts['deploy:preflight'], /npm run verify:signatures/);
});
