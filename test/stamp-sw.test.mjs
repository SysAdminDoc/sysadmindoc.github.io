import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { buildPrecacheList, stampServiceWorker } from '../scripts/stamp-sw.mjs';

const root = process.cwd();
const noopLogger = { log: () => {}, warn: () => {} };

async function writeFixtureFile(filePath, body = '') {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
}

async function createFixtureRoot() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-sw-'));
  await writeFixtureFile(path.join(rootDir, 'package.json'), JSON.stringify({ version: '9.9.9' }));
  await writeFixtureFile(
    path.join(rootDir, 'dist', 'sw.js'),
    "const CACHE = 'portfolio-v__BUILD_VERSION__';\nconst PRECACHE = __PRECACHE_PLACEHOLDER__;\n",
  );
  await writeFixtureFile(
    path.join(rootDir, 'dist', 'search', 'index.html'),
    '<link href="/pagefind/pagefind-component-ui.css"><script src="/pagefind/pagefind-component-ui.js" type="module"></script>',
  );
  return rootDir;
}

test('build pipeline indexes Pagefind before service-worker stamping', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const buildCi = pkg.scripts['build:ci'];
  const searchIndex = buildCi.indexOf('npm run search:index');
  const searchAudit = buildCi.indexOf('npm run search:audit');
  const swStamp = buildCi.indexOf('npm run sw:stamp');

  assert.notEqual(searchIndex, -1);
  assert.notEqual(searchAudit, -1);
  assert.notEqual(swStamp, -1);
  assert.ok(searchIndex < swStamp, 'search:index must run before sw:stamp so Pagefind files exist on clean builds');
  assert.ok(searchAudit < swStamp, 'search:audit must validate the generated index before sw:stamp precaches it');
});

test('service-worker stamping precaches the generated Pagefind runtime and index assets', async () => {
  const rootDir = await createFixtureRoot();
  const expectedPagefindFiles = [
    '/pagefind/pagefind-component-ui.css',
    '/pagefind/pagefind-component-ui.js',
    '/pagefind/pagefind-worker.js',
    '/pagefind/pagefind-entry.json',
    '/pagefind/pagefind.en_12345678.pf_meta',
    '/pagefind/wasm.en.pagefind',
    '/pagefind/index/en_1234567.pf_index',
    '/pagefind/filter/en_1234567.pf_filter',
    '/pagefind/fragment/en_1234567.pf_fragment',
  ];

  await writeFixtureFile(path.join(rootDir, 'dist', '_assets', 'main.js'));
  await writeFixtureFile(path.join(rootDir, 'dist', 'scripts', 'main.js'));
  await writeFixtureFile(path.join(rootDir, 'dist', 'fonts', 'site.woff2'));
  await writeFixtureFile(path.join(rootDir, 'dist', 'rss.xml'));
  await writeFixtureFile(path.join(rootDir, 'dist', 'atom.xml'));
  for (const urlPath of expectedPagefindFiles) {
    await writeFixtureFile(path.join(rootDir, 'dist', ...urlPath.slice(1).split('/')), 'fixture');
  }

  const result = stampServiceWorker({ rootDir, logger: noopLogger });
  const sw = await fs.readFile(path.join(rootDir, 'dist', 'sw.js'), 'utf8');

  assert.equal(result.stamped, true);
  assert.equal(result.version, '9.9.9');
  assert.match(sw, /portfolio-v9\.9\.9/);
  assert.doesNotMatch(sw, /__BUILD_VERSION__|__PRECACHE_PLACEHOLDER__/);
  for (const urlPath of expectedPagefindFiles) {
    assert.ok(result.precacheList.includes(urlPath), `${urlPath} should be in the generated precache list`);
    assert.ok(sw.includes(`"${urlPath}"`), `${urlPath} should be written into dist/sw.js`);
  }
});

test('service-worker stamping fails when the search page references Pagefind before indexing', async () => {
  const rootDir = await createFixtureRoot();

  assert.throws(
    () => buildPrecacheList(path.join(rootDir, 'dist')),
    /dist\/search\/index\.html references Pagefind, but dist\/pagefind is empty/,
  );
});
