import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('Beyond Code section exists with aerial clips and no Spotify embeds', async () => {
  const index = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');

  assert.match(index, /id="beyond"/);
  assert.match(index, /const aerialClips = \[/);
  assert.doesNotMatch(index, /open\.spotify\.com|Spotify embed|i\.scdn\.co/);
});
