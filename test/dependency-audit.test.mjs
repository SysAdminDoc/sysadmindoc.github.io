import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDependencyReport, formatDependencyReport, summarizeAudit } from '../scripts/audit-dependencies.mjs';

const manifest = {
  dependencies: {
    astro: '^6.4.8',
    shiki: '^4.2.0',
  },
  devDependencies: {
    '@playwright/test': '^1.61.0',
    sharp: '^0.35.2',
  },
  overrides: {
    vite: '7.3.5',
  },
};

const lock = {
  packages: {
    'node_modules/astro': { version: '6.4.8' },
    'node_modules/shiki': { version: '4.2.0' },
    'node_modules/@playwright/test': { version: '1.61.0' },
    'node_modules/sharp': { version: '0.35.2' },
    'node_modules/vite': { version: '7.3.5' },
  },
};

test('dependency report records direct packages, overrides, and known blocked majors', () => {
  const report = buildDependencyReport({
    manifest,
    lock,
    outdated: {
      astro: { current: '6.4.8', wanted: '6.4.8', latest: '7.0.3', location: '/repo/node_modules/astro' },
      vite: [
        { current: '7.3.5', wanted: '7.3.5', latest: '8.1.0', dependent: 'astro' },
        { current: '7.3.5', wanted: '7.3.5', latest: '8.1.0', dependent: 'vitefu' },
      ],
      sharp: { current: '0.34.5', wanted: '0.34.5', latest: '0.35.2', dependent: 'astro', location: '/repo/node_modules/astro/node_modules/sharp' },
    },
    audit: { metadata: { vulnerabilities: { high: 0, critical: 0, total: 0 } }, vulnerabilities: {} },
  });

  const astro = report.packages.find((row) => row.name === 'astro');
  const shiki = report.packages.find((row) => row.name === 'shiki');
  const sharp = report.packages.find((row) => row.name === 'sharp');
  const vite = report.packages.find((row) => row.name === 'vite');
  const output = formatDependencyReport(report);

  assert.equal(astro.status, 'major-blocked');
  assert.match(astro.blocked.reason, /Astro 7/);
  assert.equal(vite.type, 'override');
  assert.equal(vite.status, 'major-blocked');
  assert.equal(sharp.status, 'current');
  assert.equal(shiki.status, 'current');
  assert.match(output, /Known blocked majors/);
  assert.match(output, /astro 6\.4\.8 -> 7\.0\.3/);
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
