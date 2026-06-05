import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('PWA manifest exposes bounded install shortcuts with descriptions', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'public', 'manifest.json'), 'utf8'));

  assert.equal(manifest.id, '/?source=pwa');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.launch_handler, { client_mode: 'navigate-existing' });

  assert.equal(manifest.shortcuts.length, 4);
  assert.deepEqual(
    manifest.shortcuts.map((shortcut) => shortcut.name),
    ['Catalog', 'Search', 'Releases', 'Now'],
  );

  for (const shortcut of manifest.shortcuts) {
    assert.equal(typeof shortcut.short_name, 'string');
    assert.equal(typeof shortcut.description, 'string');
    assert.ok(shortcut.description.length >= 20, `${shortcut.name} shortcut needs useful description copy`);
    assert.match(shortcut.url, /^\/(search\/|releases\/|now\/|\?source=pwa)/);
    assert.match(shortcut.url, /source=pwa/);
  }
});
