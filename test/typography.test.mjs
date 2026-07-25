import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { readCssEntry } from '../scripts/lib/css-entry.mjs';

const root = process.cwd();

test('long-form prose opts into text-wrap pretty with a feature gate', async () => {
  const css = await readCssEntry(path.join(root, 'src', 'styles', 'global.css'), { root });

  assert.match(css, /@supports\s*\(text-wrap:pretty\)/);
  assert.match(css, /\.footer-summary,/);
  assert.match(css, /\.archive-summary,/);
  assert.match(css, /\.resume-summary,/);
  assert.match(css, /\.uses-section-head p,/);
  assert.match(css, /\.now-p,/);
  assert.doesNotMatch(css, /\.career-card-summary/);
});
