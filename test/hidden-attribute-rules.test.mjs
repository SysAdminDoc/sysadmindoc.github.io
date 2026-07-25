import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

/**
 * Author `display` declarations outrank the UA `[hidden]{display:none}` sheet
 * regardless of specificity, so any element a script hides by setting the
 * `hidden` property needs an explicit `[hidden]` rule alongside its own
 * `display`. The screenshots gallery shipped without one and its category
 * filter silently did nothing; the Playwright cover for it skips whenever the
 * live-app data has a single category, so pin the contract here instead.
 */
const HIDDEN_TOGGLED_SELECTORS = [
  { file: 'src/pages/screenshots.astro', selector: '.screenshots-card' },
  { file: 'src/pages/screenshots.astro', selector: '.screenshots-empty' },
  { file: 'src/pages/search.astro', selector: '.search-degraded' },
];

function hasDisplayRule(css, selector) {
  const pattern = new RegExp(`${escapeSelector(selector)}\\s*\\{[^}]*display\\s*:`, 's');
  return pattern.test(css);
}

function hasHiddenRule(css, selector) {
  const pattern = new RegExp(`${escapeSelector(selector)}\\[hidden\\]\\s*\\{[^}]*display\\s*:\\s*none`, 's');
  return pattern.test(css);
}

function escapeSelector(selector) {
  return selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const { file, selector } of HIDDEN_TOGGLED_SELECTORS) {
  test(`${selector} in ${file} stays hideable via the hidden attribute`, async () => {
    const source = await fs.readFile(path.join(root, file), 'utf8');
    if (!hasDisplayRule(source, selector)) return; // no author display rule, UA sheet wins
    assert.ok(
      hasHiddenRule(source, selector),
      `${selector} sets its own display but has no ${selector}[hidden]{display:none} rule, so setting .hidden will not hide it.`,
    );
  });
}

test('timeline events keep their hidden-attribute rule', async () => {
  const css = await fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8');
  assert.ok(
    /\.timeline-event\[hidden\]\s*\{[^}]*display\s*:\s*none/.test(css),
    '.timeline-event sets display:grid, so it needs .timeline-event[hidden]{display:none} for timeline.js filtering.',
  );
});
