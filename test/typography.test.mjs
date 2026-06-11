import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('long-form prose opts into text-wrap pretty with a feature gate', async () => {
  const css = await fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8');

  assert.match(css, /@supports\s*\(text-wrap:pretty\)/);
  assert.match(css, /\.project-readme :where\(p, li, blockquote, td\)\{[\s\S]*text-wrap:pretty;/);
  assert.match(css, /\.project-desc,/);
  assert.match(css, /\.project-section-copy,/);
  assert.match(css, /\.archive-summary,/);
  assert.match(css, /\.resume-summary,/);
  assert.match(css, /\.uses-section-head p,/);
  assert.match(css, /\.now-p,/);
  assert.match(css, /\.career-card-summary,/);
});
