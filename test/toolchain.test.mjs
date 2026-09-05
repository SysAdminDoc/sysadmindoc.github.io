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

  // min-release-age needs npm 11.10 or newer, so the pinned line and the setting
  // have to stay compatible: an older pin would make the cooldown silently inert.
  const minor = Number(pkg.packageManager.match(/^npm@11\.(\d+)\./)[1]);
  assert.ok(minor >= 10, `packageManager pins npm 11.${minor}, which predates min-release-age support`);
});

test('a committed .npmrc sets the supply-chain cooldown', async () => {
  const npmrc = await fs.readFile(path.join(root, '.npmrc'), 'utf8');
  const gitignore = await fs.readFile(path.join(root, '.gitignore'), 'utf8');

  // npm supports min-release-age but leaves it off, so a fresh publish from a
  // hijacked maintainer account installs immediately. Shai-Hulud V2 runs from
  // preinstall, so even a failed install executes it.
  const value = npmrc.match(/^min-release-age\s*=\s*(\d+)\s*$/m)?.[1];
  assert.ok(value, '.npmrc must set min-release-age');
  assert.ok(Number(value) >= 1, 'min-release-age must be at least one day to be a cooldown at all');

  // The unit is days, not minutes: a value copied from pnpm's 1440-minute
  // default would silently mean four years and block every install.
  assert.ok(Number(value) <= 30, `min-release-age is ${value} days; the option takes days, not minutes`);

  // It only helps if it ships with the repo.
  assert.doesNotMatch(gitignore, /^\.npmrc$/m, '.npmrc must stay committed');
  // No credentials belong in a committed npmrc.
  assert.doesNotMatch(npmrc, /_authToken|_auth\s*=|password/i);
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
  // Every declared flag must be named here with the precondition it needs, so a
  // future flag cannot be added and pass this check by not being incrementalBuild.
  const preconditions = {
    async incrementalBuild() {
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
    },
  };

  const declared = [...experimental.matchAll(/([A-Za-z][A-Za-z0-9]*)\s*:/g)].map((match) => match[1]);
  for (const flag of declared) {
    assert.ok(
      Object.hasOwn(preconditions, flag),
      `experimental.${flag} is declared with no precondition check; add one here before enabling it`,
    );
    await preconditions[flag]();
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

test('the deploy preflight refuses an untagged release', async () => {
  const pkg = await readPackage();
  const script = await fs.readFile(path.join(root, 'scripts', 'verify-release-tag.mjs'), 'utf8');

  // Tagging lapsed twice: v0.31.0-v0.38.0 were backfilled on 2026-08-20 and
  // v0.42.1-v0.42.3 on 2026-09-05. A convention nothing enforces lapses.
  assert.equal(pkg.scripts['verify:release-tag'], 'node scripts/verify-release-tag.mjs');
  assert.match(pkg.scripts['deploy:preflight'], /npm run verify:release-tag\b/);

  // A tag that merely exists is not enough. It has to be annotated, so it
  // carries an author and date, and it has to describe the code being shipped.
  assert.match(script, /objectType !== 'tag'/);
  assert.match(script, /merge-base', '--is-ancestor'/);
  assert.match(script, /is not on origin/);

  // The deploy builds the working tree but a tag points at a commit. Checking
  // only the working tree let a dirty checkout pass: commit an untagged bump,
  // edit package.json back to an already-tagged version, and the gate agreed.
  assert.match(script, /git\(\['show', 'HEAD:package\.json'\]/);
  assert.match(script, /headVersion !== version/);
});

test('the build removes dist/ first so stale artifacts cannot ship', async () => {
  const pkg = await readPackage();
  const script = await fs.readFile(path.join(root, 'scripts', 'clean-dist.mjs'), 'utf8');

  // deploy-vps tars the whole dist/ directory, so anything a previous build left
  // behind ships. A leftover dist/.prerender/chunks/server_*.mjs from an
  // interrupted build was caught by the CSP audit on 2026-09-05; a stale file
  // with no sink would have deployed silently.
  assert.equal(pkg.scripts['build:clean'], 'node scripts/clean-dist.mjs');
  const ci = pkg.scripts['build:ci'];
  assert.ok(
    ci.indexOf('npm run build:clean') < ci.indexOf('astro build'),
    'dist/ must be removed before astro build writes into it',
  );
  assert.ok(ci.startsWith('npm run build:clean'), 'the clean must be the first step of build:ci');

  // Deleting a directory from a script deserves a guard against being pointed
  // somewhere else by a stray cwd.
  assert.match(script, /refusing to remove/);
  assert.match(script, /path\.basename\(distDir\) !== 'dist'/);
});
