import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  auditDeadCssSelectors,
  auditRuntimeDomTargets,
  collectSourceSurface,
} from '../scripts/lib/source-surface-audit.mjs';

test('source surface audit catches dead CSS selector atoms', () => {
  const surface = collectSourceSurface(new Map([
    ['src/pages/example.astro', '<section id="realPanel" class="real-panel" data-real-ready></section>'],
  ]));
  const result = auditDeadCssSelectors(new Map([
    ['src/styles/example.css', '.real-panel[data-real-ready]{display:block}.ghost-panel #ghostChild[data-ghost-ready]{display:none}'],
  ]), surface);
  const names = new Set(result.findings.map((finding) => finding.name));

  assert.equal(names.has('real-panel'), false);
  assert.equal(names.has('data-real-ready'), false);
  assert.equal(names.has('ghost-panel'), true);
  assert.equal(names.has('ghostChild'), true);
  assert.equal(names.has('data-ghost-ready'), true);
});

test('source surface audit catches stale runtime DOM targets but allows generated surfaces', () => {
  const surface = collectSourceSurface(new Map([
    ['src/pages/example.astro', '<section id="realPanel" class="real-panel" data-real-ready></section>'],
    ['public/scripts/example.js', "const toast = document.createElement('div'); toast.className = 'runtime-toast'; document.body.appendChild(toast);"],
  ]));
  const result = auditRuntimeDomTargets(new Map([
    ['public/scripts/example.js', "document.getElementById('ghostPanel'); document.querySelector('.runtime-toast'); document.querySelector('.ghost-panel[data-ghost-ready]');"],
  ]), surface);
  const names = new Set(result.findings.map((finding) => finding.name));

  assert.equal(names.has('runtime-toast'), false);
  assert.equal(names.has('ghostPanel'), true);
  assert.equal(names.has('ghost-panel'), true);
  assert.equal(names.has('data-ghost-ready'), true);
});
