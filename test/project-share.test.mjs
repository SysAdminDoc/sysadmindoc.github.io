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
  assert.match(script, /navigator\.clipboard\.writeText\(text\)\.catch/);
  assert.match(script, /return legacyCopy\(text\)/);
  assert.match(script, /textarea\.focus\(\)/);
  assert.match(script, /previousFocus\.focus\(\{ preventScroll: true \}\)/);
  assert.match(script, /document\.execCommand\('copy'\)/);
  assert.match(script, /Project link copied\./);
  assert.match(script, /Copy the address from your browser\./);
  assert.match(script, /AbortError/);
});

test('screenshot sharing recovers from clipboard rejection without hidden shortcuts', async () => {
  const script = await fs.readFile(path.join(root, 'public', 'scripts', 'shot-viewer.js'), 'utf8');

  assert.match(script, /navigator\.clipboard\.writeText\(text\)\.catch/);
  assert.match(script, /return legacyCopy\(text\)/);
  assert.match(script, /previousFocus\.focus\(\{ preventScroll: true \}\)/);
  assert.match(script, /Copy the address from your browser\./);
  assert.doesNotMatch(script, /e\.key === 'f'/);
});

test('deferred command search exposes a retry state and malformed jump hashes stay safe', async () => {
  const loader = await fs.readFile(path.join(root, 'public', 'scripts', 'cmdk-loader.js'), 'utf8');
  const jumpNav = await fs.readFile(path.join(root, 'public', 'scripts', 'section-jump-nav.js'), 'utf8');

  assert.match(loader, /Command search couldn't load\. Try again\./);
  assert.match(loader, /loading = null/);
  assert.match(loader, /script\.remove\(\)/);
  assert.match(loader, /data-load-state', 'error'/);
  assert.match(jumpNav, /try \{\s*initialId = decodeURIComponent\(initialId\)/);
});
