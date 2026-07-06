import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDependencyReport, formatDependencyReport, summarizeAudit } from '../scripts/audit-dependencies.mjs';

const manifest = {
  dependencies: {
    astro: '^7.0.6',
    shiki: '^4.3.1',
  },
  devDependencies: {
    '@playwright/test': '^1.61.1',
    sharp: '^0.35.3',
  },
  overrides: {
    vite: '8.1.3',
  },
};

const lock = {
  packages: {
    'node_modules/astro': { version: '7.0.6' },
    'node_modules/shiki': { version: '4.3.1' },
    'node_modules/@playwright/test': { version: '1.61.1' },
    'node_modules/sharp': { version: '0.35.3' },
    'node_modules/vite': { version: '8.1.3' },
  },
};

test('dependency report records direct packages, overrides, and current Astro 7 floors', () => {
  const report = buildDependencyReport({
    manifest,
    lock,
    outdated: {
      astro: { current: '7.0.6', wanted: '7.0.6', latest: '7.0.6', location: '/repo/node_modules/astro' },
      vite: [
        { current: '8.1.3', wanted: '8.1.3', latest: '8.1.3', dependent: 'astro' },
        { current: '8.1.3', wanted: '8.1.3', latest: '8.1.3', dependent: 'vitefu' },
      ],
      sharp: [
        { current: '0.34.5', wanted: '0.34.5', latest: '0.35.3', dependent: 'astro', location: '/repo/node_modules/astro/node_modules/sharp' },
        { current: '0.35.3', wanted: '0.35.3', latest: '0.35.3', dependent: 'sysadmindoc-portfolio', location: '/repo/node_modules/sharp' },
      ],
      shiki: { current: '4.3.1', wanted: '4.3.1', latest: '5.0.0', location: '/repo/node_modules/shiki' },
    },
    audit: { metadata: { vulnerabilities: { high: 0, critical: 0, total: 0 } }, vulnerabilities: {} },
  });

  const astro = report.packages.find((row) => row.name === 'astro');
  const shiki = report.packages.find((row) => row.name === 'shiki');
  const sharp = report.packages.find((row) => row.name === 'sharp');
  const vite = report.packages.find((row) => row.name === 'vite');
  const output = formatDependencyReport(report);

  assert.equal(astro.status, 'current');
  assert.equal(vite.type, 'override');
  assert.equal(vite.status, 'current');
  assert.equal(sharp.status, 'current');
  assert.equal(shiki.status, 'major-available');
  assert.doesNotMatch(output, /Known blocked majors/);
  assert.match(output, /Dependency freshness report passed/);
});

test('dependency audit fails only at the configured security threshold', () => {
  const audit = {
    metadata: {
      vulnerabilities: {
        moderate: 1,
        high: 1,
        critical: 0,
        total: 2,
      },
    },
    vulnerabilities: {
      demo: {
        severity: 'high',
        via: [{ title: 'demo advisory' }],
        fixAvailable: true,
      },
    },
  };

  assert.equal(summarizeAudit(audit, 'high').ok, false);
  assert.equal(summarizeAudit(audit, 'critical').ok, true);
  assert.equal(summarizeAudit(audit, 'none').ok, true);
});
