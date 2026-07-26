import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('homepage delegates visual evidence instead of embedding a media gallery', async () => {
  const index = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');

  assert.match(index, /href="\/screenshots\/"/);
  assert.doesNotMatch(index, /id="beyond"|const aerialClips = \[|youtube(?:-nocookie)?\.com|open\.spotify\.com|i\.scdn\.co/);
});
