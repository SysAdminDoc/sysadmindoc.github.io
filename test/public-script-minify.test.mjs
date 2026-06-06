import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { minifyPublicScripts } from '../scripts/minify-public-scripts.mjs';

const root = process.cwd();

test('build:ci minifies copied public scripts', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['scripts:minify'], 'node scripts/minify-public-scripts.mjs');
  assert.match(pkg.scripts['build:ci'], /node scripts\/fix-html-structure\.mjs && npm run scripts:minify && npm run csp:audit:dist:style:elem && npm run endpoints:audit/);
  assert.match(await fs.readFile(path.join(root, 'scripts', 'minify-public-scripts.mjs'), 'utf8'), /minifyIdentifiers: false/);
});

test('public script minifier writes smaller dist scripts without renaming globals', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'public-script-minify-'));
  const publicScriptsDir = path.join(tmp, 'public', 'scripts');
  const distScriptsDir = path.join(tmp, 'dist', 'scripts');
  await fs.mkdir(publicScriptsDir, { recursive: true });
  await fs.mkdir(distScriptsDir, { recursive: true });

  const source = `
    var _escMap = { "&": "&amp;" };
    function escapeHTML(value) {
      return String(value ?? "").replace(/[&]/g, function (char) {
        return _escMap[char];
      });
    }
    window.escapeHTML = escapeHTML;
  `;
  await fs.writeFile(path.join(publicScriptsDir, 'shared.js'), source);
  await fs.writeFile(path.join(distScriptsDir, 'shared.js'), source);

  const summary = await minifyPublicScripts({ publicScriptsDir, distScriptsDir });
  const minified = await fs.readFile(path.join(distScriptsDir, 'shared.js'), 'utf8');

  assert.equal(summary.count, 1);
  assert.ok(summary.saved > 0);
  assert.ok(minified.length < source.length);
  assert.match(minified, /function escapeHTML/);
  assert.match(minified, /window\.escapeHTML=escapeHTML/);
});
