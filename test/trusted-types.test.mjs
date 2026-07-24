import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

const readBase = () => fs.readFile(path.join(root, 'src', 'layouts', 'Base.astro'), 'utf8');

test('CSP enforces Trusted Types in production only', async () => {
  const base = await readBase();
  assert.match(
    base,
    /const trustedTypes = isDev \? '' : "; require-trusted-types-for 'script'"/,
    'Trusted Types must be enforced in production and skipped in dev (Vite HMR uses string sinks)',
  );
  assert.match(base, /form-action 'self'\$\{trustedTypes\}/, 'the directive must be appended to the CSP');
});

test('the Trusted Types default policy loads before any sink-firing script', async () => {
  const base = await readBase();
  const ttIndex = base.indexOf('/scripts/trusted-types.js');
  const headInitIndex = base.indexOf('/scripts/head-init.js');
  assert.ok(ttIndex !== -1, 'trusted-types.js must be loaded');
  assert.ok(
    ttIndex < headInitIndex,
    'trusted-types.js must load before other scripts so the default policy exists before any sink fires',
  );
});

test('the default policy constrains script URLs to same-origin', async () => {
  const policy = await fs.readFile(path.join(root, 'public', 'scripts', 'trusted-types.js'), 'utf8');
  assert.match(policy, /createPolicy\('default'/);
  assert.match(policy, /createScriptURL/, 'must back the SW registration and cmdk loader script URLs');
  assert.match(
    policy,
    /url\.origin !== window\.location\.origin/,
    'cross-origin script URLs must be blocked, not passed through',
  );
  assert.match(policy, /createHTML/, 'must back the vendored Pagefind result HTML');
});

test('the offline shell CSP stays identical to the Trusted Types policy', async () => {
  const offline = await fs.readFile(path.join(root, 'public', 'offline.html'), 'utf8');
  assert.match(
    offline,
    /require-trusted-types-for 'script'/,
    'offline.html CSP must match the main policy so the dist CSP-divergence audit passes',
  );
});
