import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('every route declares rel="me" identity links', async () => {
  const base = await fs.readFile(path.join(root, 'src', 'layouts', 'Base.astro'), 'utf8');
  assert.match(base, /rel="me" href="https:\/\/github\.com\/SysAdminDoc"/);
  assert.match(base, /rel="me" href="https:\/\/www\.linkedin\.com\/in\/matthewryanparker"/);
  assert.match(base, /rel="me" href=\{contactMailto\(\)\}/);
});

test('the homepage exposes a representative h-card', async () => {
  const home = await fs.readFile(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');
  assert.match(home, /class="hero-identity h-card"/, 'h-card root belongs on the hero identity block');
  assert.match(home, /hero-avatar loaded u-photo/, 'the avatar is the u-photo');
  assert.match(home, /class="hn p-name"/, 'the h1 carries p-name');
  assert.match(home, /class="u-url" href="\/" hidden/, 'u-url must be present and non-visual');
});

test('h-card classes stay presentation-free', async () => {
  // The microformats vocabulary must never pick up styling, or a future CSS
  // change would silently alter the profile markup instead of the design.
  const styles = await Promise.all(
    ['global.css', 'critical.css', 'interior-quiet.css'].map((file) =>
      fs.readFile(path.join(root, 'src', 'styles', file), 'utf8'),
    ),
  );
  for (const css of styles) {
    for (const token of ['.h-card', '.p-name', '.u-photo', '.u-url']) {
      assert.ok(
        !css.includes(token),
        `${token} must not be styled — microformats classes are data, not design`,
      );
    }
  }
});
