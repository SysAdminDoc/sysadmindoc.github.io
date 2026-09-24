import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { SAFE_REPO_NAME, projectRedirectsCaddy } from '../scripts/lib/project-redirects.mjs';

const root = process.cwd();
const read = (...parts) => fs.readFile(path.join(root, ...parts), 'utf8');

test('each catalog repo gets a permanent redirect, with and without the trailing slash', () => {
  const text = projectRedirectsCaddy({
    projects: [
      { urls: { repository: 'https://github.com/SysAdminDoc/NoNo' } },
      { urls: { repository: 'https://github.com/SysAdminDoc/Onward_Userscript' } },
      { urls: { repository: 'https://github.com/SysAdminDoc/NoNo' } },
      { urls: { repository: 'https://gitlab.com/SysAdminDoc/Elsewhere' } },
      { urls: { repository: 'https://github.com/SysAdminDoc/has space' } },
      { urls: { repository: 'https://github.com/SysAdminDoc/Deep/tree/main' } },
      { urls: { repository: 'not a url' } },
      {},
    ],
  });
  assert.deepEqual(text.trim().split('\n').slice(1), [
    'redir /projects/NoNo/ https://github.com/SysAdminDoc/NoNo 301',
    'redir /projects/NoNo https://github.com/SysAdminDoc/NoNo 301',
    'redir /projects/Onward_Userscript/ https://github.com/SysAdminDoc/Onward_Userscript 301',
    'redir /projects/Onward_Userscript https://github.com/SysAdminDoc/Onward_Userscript 301',
  ]);
});

test('Caddy sends known repos to GitHub and any other safe name to a catalog search', async () => {
  const [caddyfile, compose, deploy] = await Promise.all([
    read('deploy', 'vps', 'Caddyfile'),
    read('deploy', 'vps', 'docker-compose.yml'),
    read('scripts', 'deploy-vps.mjs'),
  ]);
  const matcher = caddyfile.match(/@retired_project path_regexp retired_project \^\/projects\/\(\[([^\]]+)\]\+\)\/\?\$/);
  assert.ok(matcher, 'the retired-project matcher is declared');
  // The matcher lets through exactly the characters the generator allows, so a
  // name that reaches the Location header is always one the generator accepts.
  assert.equal(`^[${matcher[1]}]+$`, SAFE_REPO_NAME.source);
  assert.match(caddyfile, /handle @retired_project \{\s*import project-redirects\.caddy\s*redir \* \/catalog\/\?q=\{re\.retired_project\.1\} 302\s*\}/);
  // The bare /projects/ path, which the per-repo matcher can't reach: it
  // needs a name after the slash. And /projects/index.html, which it would
  // take for a repo called index.html (ninth drain review); redir runs before
  // handle, so the index matcher gets it first.
  assert.match(caddyfile, /@projects_index path \/projects \/projects\/ \/projects\/index\.html\s*\n\s*redir @projects_index \/catalog\/ 301/);
  assert.ok(caddyfile.indexOf('redir @projects_index') < caddyfile.indexOf('handle @retired_project'));
  assert.match(compose, /- \.\/project-redirects\.caddy:\/etc\/caddy\/project-redirects\.caddy:ro/);
  assert.match(deploy, /const projectRedirectsFile = writeProjectRedirects\(distDir\);/);
  assert.match(deploy, /cspEnvFile,\s*projectRedirectsFile,\s*`\$\{ssh\}:\$\{remoteDir\}\/`/);
});

test('favicon.ico holds 16, 32 and 48 pixel PNG images', async () => {
  const ico = await fs.readFile(path.join(root, 'public', 'favicon.ico'));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1, 'type 1 is an icon');
  const count = ico.readUInt16LE(4);
  assert.equal(count, 3);
  const sizes = [];
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + 16 * index;
    const size = ico.readUInt8(entry);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    const image = await sharp(ico.subarray(offset, offset + length)).metadata();
    assert.equal(image.format, 'png');
    assert.equal(image.width, size);
    assert.equal(image.height, size);
    sizes.push(size);
  }
  assert.deepEqual(sizes, [16, 32, 48]);
});

test('the live smoke checks the retired URLs on every deploy', async () => {
  const smoke = await read('scripts', 'smoke-live-site.mjs');
  assert.match(smoke, /await checkNotFoundStatus\(baseUrl, summary\);\n\s+await checkRetiredUrls\(baseUrl, summary\);/);
  assert.match(smoke, /expected 301 to \$\{repository\}/);
  assert.match(smoke, /expected 302 to \/catalog\/\?q=\$\{unknownName\}/);
  assert.match(smoke, /for \(const index of \['\/projects\/', '\/projects', '\/projects\/index\.html'\]\)/);
  assert.match(smoke, /expected 301 to \/catalog\/\./);
});
