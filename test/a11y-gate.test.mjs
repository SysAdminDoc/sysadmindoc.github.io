import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('a11y audit npm script is blocking by default', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));

  assert.equal(pkg.scripts['a11y:audit'], 'node scripts/audit-a11y.mjs --strict');
  assert.equal(pkg.scripts['a11y:audit:advisory'], 'node scripts/audit-a11y.mjs');
  assert.equal(pkg.scripts['audit:playwright'], 'playwright test --config=playwright.audits.config.mjs');
  assert.equal(pkg.scripts['audit:playwright:update'], 'playwright test --config=playwright.audits.config.mjs --update-snapshots');
});

test('CI and deploy run the blocking a11y gate', async () => {
  const ci = await fs.readFile(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  const deploy = await fs.readFile(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');

  assert.match(ci, /- name: Accessibility audit\s+run: npm run a11y:audit/);
  assert.doesNotMatch(ci, /a11y:audit \|\|/);
  assert.match(deploy, /- name: Unit tests\s+run: npm test/);
  assert.match(deploy, /- name: Accessibility audit\s+run: npm run a11y:audit/);
});

test('CI runs the Playwright browser a11y and visual baseline gate', async () => {
  const ci = await fs.readFile(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  const config = await fs.readFile(path.join(root, 'playwright.audits.config.mjs'), 'utf8');
  const spec = await fs.readFile(path.join(root, 'tests', 'playwright', 'portfolio-audits.spec.mjs'), 'utf8');

  assert.match(ci, /- name: Install Playwright browsers\s+run: npx playwright install --with-deps chromium/);
  assert.match(ci, /- name: Browser accessibility and visual audit\s+run: npm run audit:playwright/);
  assert.match(config, /snapshotPathTemplate: '\{testDir\}\/__screenshots__\/\{projectName\}\/\{arg\}\{ext\}'/);
  assert.match(spec, /@axe-core\/playwright/);
  assert.match(spec, /toHaveScreenshot/);
});
