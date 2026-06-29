import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const pathExists = async (target) => fs.access(target).then(() => true, () => false);

test('a11y audit npm script is blocking by default', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));

  assert.equal(pkg.scripts['a11y:audit'], 'node scripts/audit-a11y.mjs --strict');
  assert.equal(pkg.scripts['a11y:audit:advisory'], 'node scripts/audit-a11y.mjs');
  assert.equal(pkg.scripts['audit:playwright'], 'playwright test --config=playwright.audits.config.mjs');
  assert.equal(pkg.scripts['audit:playwright:update'], 'playwright test --config=playwright.audits.config.mjs --update-snapshots');
  assert.equal(
    pkg.scripts['audit:interactions'],
    'playwright test --config=playwright.interactions.config.mjs tests/playwright/interaction-smoke.spec.mjs',
  );
});

test('local release gates keep the blocking a11y gate available', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));

  assert.equal(await pathExists(path.join(root, '.github', 'workflows')), false);
  assert.match(pkg.scripts.test, /node --test/);
  assert.match(pkg.scripts.build, /npm run data:validate/);
  assert.match(pkg.scripts.build, /npm run build:ci/);
  assert.equal(pkg.scripts['a11y:audit'], 'node scripts/audit-a11y.mjs --strict');
});

test('Playwright browser a11y and visual baseline gates run locally', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const config = await fs.readFile(path.join(root, 'playwright.audits.config.mjs'), 'utf8');
  const interactionsConfig = await fs.readFile(path.join(root, 'playwright.interactions.config.mjs'), 'utf8');
  const spec = await fs.readFile(path.join(root, 'tests', 'playwright', 'portfolio-audits.spec.mjs'), 'utf8');

  assert.equal(pkg.scripts['audit:playwright'], 'playwright test --config=playwright.audits.config.mjs');
  assert.equal(
    pkg.scripts['audit:interactions'],
    'playwright test --config=playwright.interactions.config.mjs tests/playwright/interaction-smoke.spec.mjs',
  );
  assert.match(config, /snapshotPathTemplate: '\{testDir\}\/__screenshots__\/\{projectName\}\/\{arg\}\{ext\}'/);
  assert.match(config, /PLAYWRIGHT_AUDIT_PORT \?\? process\.env\.PLAYWRIGHT_PORT \?\? '4324'/);
  assert.match(config, /reuseExistingServer: false/);
  assert.match(interactionsConfig, /playwright\.audits\.config\.mjs/);
  assert.match(interactionsConfig, /outputDir: '\.tmp\/playwright-interactions-results'/);
  assert.match(interactionsConfig, /outputFolder: '\.tmp\/playwright-interactions-report'/);
  assert.match(spec, /@axe-core\/playwright/);
  assert.match(spec, /toHaveScreenshot/);
});
