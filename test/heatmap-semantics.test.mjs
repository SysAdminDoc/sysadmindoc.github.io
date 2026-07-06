import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('homepage heatmap uses binary push-day semantics that match generated stats data', async () => {
  const index = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');
  const styles = await fs.readFile(path.join(root, 'src', 'styles', 'global.css'), 'utf8');
  const stats = JSON.parse(await fs.readFile(path.join(root, 'src', 'data', '_stats.json'), 'utf8'));

  assert.ok(Array.isArray(stats.pushDays), '_stats.json exposes pushDays as date keys, not per-day counts');
  assert.match(index, /const state = active \? 'active' : 'inactive'/);
  assert.match(index, /class=\{`hm-cell hm-\$\{cell\.state\}`\}/);
  assert.match(index, /data-state=\{cell\.state\}/);
  assert.match(index, /Push days, not commit volume/);
  assert.match(index, /Source data records whether at least one public push was observed on each UTC day, not commit volume/);
  assert.match(index, />No push</);
  assert.match(index, />Push day</);
  assert.doesNotMatch(index, /level:\s*active\s*\?\s*4\s*:\s*0/);
  assert.doesNotMatch(index, /hm-\$\{cell\.level\}/);

  assert.match(styles, /\.hm-inactive\{/);
  assert.match(styles, /\.hm-active\{/);
  assert.doesNotMatch(styles, /\.hm-[1-4]\b/);
  assert.doesNotMatch(styles, /Less[\s\S]*More/);
});
