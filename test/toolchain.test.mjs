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

test('project check type-checks Node scripts and tests in checkJs mode', async () => {
  const pkg = await readPackage();
  const config = JSON.parse(await fs.readFile(path.join(root, 'tsconfig.scripts.json'), 'utf8'));

  assert.equal(pkg.scripts['typecheck:scripts'], 'tsc --project tsconfig.scripts.json --pretty false');
  assert.match(pkg.scripts.check, /npm run typecheck:scripts/);
  assert.equal(config.compilerOptions.allowJs, true);
  assert.equal(config.compilerOptions.checkJs, true);
  assert.deepEqual(config.include, ['scripts/**/*.mjs', 'test/**/*.mjs']);
});

test('npm v12 install-script allowlist covers the build-script dependency', async () => {
  const pkg = await readPackage();
  assert.ok(
    pkg.allowScripts && typeof pkg.allowScripts === 'object' && !Array.isArray(pkg.allowScripts),
    'package.json must declare an allowScripts allowlist so npm v12 (install scripts off by default) can build native deps',
  );
  const entries = Object.entries(pkg.allowScripts);
  assert.ok(
    entries.some(([key]) => /^esbuild@/.test(key)),
    'esbuild (the only dependency with an install script) must be allowlisted',
  );
  assert.ok(
    entries.every(([, value]) => value === true),
    'every allowScripts entry must be explicitly approved (true)',
  );
});

test('no experimental Astro flag is declared whose precondition the routes do not meet', async () => {
  const config = await fs.readFile(path.join(root, 'astro.config.mjs'), 'utf8');
  const experimental = config.match(/experimental:\s*\{([^}]*)\}/)?.[1] ?? '';

  // incrementalBuild only skips pages from getStaticPaths() that return a
  // cacheKey. With no cacheKey anywhere it caches nothing, and on Astro 7.2.x it
  // additionally pins build.concurrency to 1 — an experimental flag's breakage
  // risk for no benefit. Measured 2026-09-05: warm builds 8.8s with the flag and
  // 10.0s without, no page-skip logging in either, i.e. inside the noise.
  if (/incrementalBuild/.test(experimental)) {
    const routeFiles = await Promise.all(
      ['src/pages/og/[slug].png.ts', 'src/pages/lang/[slug].astro'].map((file) =>
        fs.readFile(path.join(root, file), 'utf8'),
      ),
    );
    for (const source of routeFiles) {
      assert.match(
        source,
        /cacheKey/,
        'every getStaticPaths route must return a content-derived cacheKey before incrementalBuild is enabled',
      );
    }
  }

  // Guard the inverse too: a new getStaticPaths route added later must be listed
  // above, or this check silently stops covering it.
  const pages = await fs.readdir(path.join(root, 'src', 'pages'), { recursive: true });
  const dynamic = pages.filter((entry) => typeof entry === 'string' && /\[.+\]/.test(entry));
  assert.deepEqual(
    dynamic.map((entry) => entry.split(path.sep).join('/')).sort(),
    ['lang/[slug].astro', 'og/[slug].png.ts'],
    'a new dynamic route needs adding to this check',
  );
});
