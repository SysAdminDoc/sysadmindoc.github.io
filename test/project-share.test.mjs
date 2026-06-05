import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('project pages expose a native share action with copy fallback wiring', async () => {
  const page = await fs.readFile(path.join(root, 'src', 'pages', 'projects', '[slug].astro'), 'utf8');
  const script = await fs.readFile(path.join(root, 'public', 'scripts', 'project-page.js'), 'utf8');

  assert.match(page, /data-project-share/);
  assert.match(page, /data-share-title=\{name\}/);
  assert.match(page, /data-share-text=\{plainDescription \|\| `Project page for \$\{name\}`\}/);
  assert.match(page, /data-share-url=\{projectUrl\}/);
  assert.match(page, /id="project-share-status"/);
  assert.match(page, /aria-live="polite"/);

  assert.match(script, /navigator\.share/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.match(script, /textarea\.focus\(\)/);
  assert.match(script, /document\.execCommand\('copy'\)/);
  assert.match(script, /Project link copied\./);
  assert.match(script, /AbortError/);
});
