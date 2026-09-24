import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { SERVE_TOKEN_PREFIX, outsideServer, packedServeTokens, withoutOutsideServer } from '../scripts/lib/audit-server.mjs';
import { playwrightEnv } from '../scripts/visual-gate.mjs';
import { assertPortFree, assertServesBuild, assertServesToken, portAnswers, writeServeToken } from '../tests/playwright/preview-server-control.mjs';

const root = process.cwd();

async function serve(body) {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
  return { server, port, close: () => new Promise((resolve) => server.close(() => resolve(undefined))) };
}

// The twelfth drain review ran a second checkout's audits while another
// server held the port: Astro moved to the next port, and the tests audited
// the other server.
test('a port something else is serving on is refused, by number', async () => {
  const other = await serve('<p>someone else</p>');
  try {
    assert.equal(await portAnswers('127.0.0.1', other.port), true);
    await assert.rejects(assertPortFree('127.0.0.1', other.port, { waitMs: 300, pollMs: 100 }), new RegExp(`something else is serving on 127\\.0\\.0\\.1:${other.port}`));
  } finally {
    await other.close();
  }
  assert.equal(await portAnswers('127.0.0.1', other.port), false);
  await assertPortFree('127.0.0.1', other.port, { waitMs: 300, pollMs: 100 });
});

test("a server whose home page isn't this build's is refused", async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-dist-'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<p>this build</p>');
  const ours = await serve('<p>this build</p>');
  const other = await serve('<p>another build</p>');
  try {
    await assertServesBuild(`http://127.0.0.1:${ours.port}/`, dist);
    await assert.rejects(assertServesBuild(`http://127.0.0.1:${other.port}/`, dist), /answers \(HTTP 200\), but its home page isn't/);
  } finally {
    await ours.close();
    await other.close();
    fs.rmSync(dist, { recursive: true, force: true });
  }
});

/** A static server over `dir`, the way the preview serves dist/. */
async function serveDir(dir) {
  const server = http.createServer((request, response) => {
    const file = path.join(dir, decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(dir) || !fs.existsSync(file)) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200);
    response.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
  return { port, close: () => new Promise((resolve) => server.close(() => resolve(undefined))) };
}

// The thirteenth drain review: a server with this build's home page passed,
// though it was another checkout's at the same commit.
test('only a server serving this dist/ right now returns the run\'s token', async () => {
  const ours = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-ours-'));
  const theirs = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-theirs-'));
  for (const dir of [ours, theirs]) fs.writeFileSync(path.join(dir, 'index.html'), '<p>same commit</p>');
  fs.writeFileSync(path.join(ours, '__preview-check-leftover.txt'), 'old');
  const token = writeServeToken(ours, 'token-1234');
  assert.deepEqual(fs.readdirSync(ours).sort(), ['__preview-check-token-1234.txt', 'index.html'], 'a killed run\'s token goes first');
  const oursServer = await serveDir(ours);
  const theirsServer = await serveDir(theirs);
  try {
    await assertServesToken(`http://127.0.0.1:${oursServer.port}/`, token);
    await assertServesBuild(`http://127.0.0.1:${theirsServer.port}/`, ours);
    await assert.rejects(assertServesToken(`http://127.0.0.1:${theirsServer.port}/`, token), /not with the file this run just wrote into dist\/ \(HTTP 404\)/);
  } finally {
    await oursServer.close();
    await theirsServer.close();
  }
  token.remove();
  assert.deepEqual(fs.readdirSync(ours), ['index.html'], 'and the token never stays to ship');
  fs.rmSync(ours, { recursive: true, force: true });
  fs.rmSync(theirs, { recursive: true, force: true });
});

test('the gate audits its own build, whatever PLAYWRIGHT_BASE_URL says', () => {
  assert.deepEqual(playwrightEnv({ PLAYWRIGHT_BASE_URL: 'http://elsewhere', PATH: 'x' }), { PATH: 'x' });
  const gate = fs.readFileSync(path.join(root, 'scripts', 'visual-gate.mjs'), 'utf8');
  assert.match(gate, /\.\.\.playwrightArgs\(\{ all, update \}\)\], playwrightEnv\(\)\);/);
});

// The fifteenth drain review: `Playwright_Base_Url` still reached the gate's
// child on Windows, and a stray PLAYWRIGHT_BASE_URL alone pointed the deploy
// preflight's browser audit at another server.
test('an outside server counts only when asked for, and the gate and the nightly deploy drop both names in any case', () => {
  assert.equal(outsideServer({ PLAYWRIGHT_BASE_URL: 'http://elsewhere' }), undefined);
  assert.equal(outsideServer({ PLAYWRIGHT_BASE_URL: 'http://elsewhere', PLAYWRIGHT_OUTSIDE_SERVER: 'yes' }), undefined);
  assert.equal(outsideServer({ PLAYWRIGHT_OUTSIDE_SERVER: '1' }), undefined);
  assert.equal(outsideServer({ PLAYWRIGHT_BASE_URL: 'http://elsewhere', PLAYWRIGHT_OUTSIDE_SERVER: '1' }), 'http://elsewhere');
  const env = { Playwright_Base_Url: 'http://a', playwright_base_url: 'http://b', PLAYWRIGHT_OUTSIDE_SERVER: '1', playwright_Outside_Server: '1', PLAYWRIGHT_BASE_URL_X: 'kept', Path: 'x' };
  assert.deepEqual(playwrightEnv(env), { PLAYWRIGHT_BASE_URL_X: 'kept', Path: 'x' });
  assert.deepEqual(withoutOutsideServer(env), { PLAYWRIGHT_BASE_URL_X: 'kept', Path: 'x' });
  const refresh = fs.readFileSync(path.join(root, 'scripts', 'refresh-and-deploy.mjs'), 'utf8');
  assert.match(refresh, /env = \{[^}]*\.\.\.withoutOutsideServer\(process\.env\),/, 'the preflight runs without them');
  assert.doesNotMatch(refresh, /\.\.\.process\.env\b/);
  for (const config of ['playwright.audits.config.mjs', 'playwright.interactions.config.mjs', 'playwright.cross-engine.config.mjs']) {
    const source = fs.readFileSync(path.join(root, config), 'utf8');
    assert.match(source, /const baseURL = outsideServer\(\) \?\? `http:\/\/\$\{host\}:\$\{port\}`;/, config);
    assert.doesNotMatch(source, /process\.env\.PLAYWRIGHT_BASE_URL/, config);
  }
  const setup = fs.readFileSync(path.join(root, 'tests', 'playwright', 'preview-server.mjs'), 'utf8');
  assert.match(setup, /\n  if \(outsideServer\(\)\) return;\n/);
  assert.doesNotMatch(setup, /if \(process\.env\.PLAYWRIGHT_BASE_URL\) return/);
});

test('the deploy packs no serve token, even one left in dist/', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-dist-'));
  const tarball = path.join(os.tmpdir(), `deploy-token-${process.pid}.tar.gz`);
  try {
    fs.writeFileSync(path.join(dist, 'index.html'), '<p>site</p>');
    writeServeToken(dist, 'left-by-a-killed-run');
    fs.mkdirSync(path.join(dist, 'notes'));
    fs.writeFileSync(path.join(dist, 'notes', `${SERVE_TOKEN_PREFIX}nested.txt`), 'x');
    execFileSync('tar', ['-czf', tarball, '-C', dist, '.'], { windowsHide: true });
    const everything = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8', windowsHide: true });
    assert.deepEqual(packedServeTokens(everything).sort(), ['./__preview-check-left-by-a-killed-run.txt', './notes/__preview-check-nested.txt'], 'the listing check sees one anywhere');
    fs.rmSync(tarball);
    execFileSync('tar', ['-czf', tarball, `--exclude=${SERVE_TOKEN_PREFIX}*`, '-C', dist, '.'], { windowsHide: true });
    const shipped = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8', windowsHide: true });
    assert.deepEqual(packedServeTokens(shipped), []);
    assert.match(shipped, /\.\/index\.html/);
  } finally {
    fs.rmSync(dist, { recursive: true, force: true });
    fs.rmSync(tarball, { force: true });
  }
  const deploy = fs.readFileSync(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  const pack = deploy.indexOf("run('tar', ['-czf', tarball, `--exclude=${SERVE_TOKEN_PREFIX}*`, '-C', distDir, '.']);");
  const check = deploy.indexOf("packedServeTokens(execFileSync('tar', ['-tzf', tarball]");
  const refuse = deploy.indexOf('if (packedTokens.length) {');
  const ship = deploy.indexOf("run('scp', [...sshOptions, tarball,");
  assert.ok(pack > 0 && pack < check && check < refuse && refuse < ship, 'packed without tokens, and read back before it ships');
});

test('the global setup checks the port before it starts the preview, and the build before it claims it', () => {
  const setup = fs.readFileSync(path.join(root, 'tests', 'playwright', 'preview-server.mjs'), 'utf8');
  const stop = setup.indexOf("astroPreview(['stop'], { ignoreErrors: true });");
  const free = setup.indexOf('await assertPortFree(hostname, port);');
  const token = setup.indexOf('const serveToken = writeServeToken(dist, randomUUID());');
  const start = setup.indexOf("astroPreview(['--background'");
  const served = setup.indexOf('await assertServesToken(baseURL, serveToken);');
  const build = setup.indexOf('await assertServesBuild(baseURL, dist);');
  const claim = setup.indexOf('writeMarker(');
  const removed = setup.indexOf('serveToken.remove();');
  assert.ok(stop > 0 && stop < free && free < token && token < start, 'stop our own old daemon, check the port, write the token, then start');
  assert.ok(start < served && served < build && build < claim, 'and check what answers before claiming it');
  assert.ok(removed > claim && /\} finally \{\s*serveToken\.remove\(\);/.test(setup), 'the token comes out in a finally');
  const control = fs.readFileSync(path.join(root, 'tests', 'playwright', 'preview-server-control.mjs'), 'utf8');
  assert.match(control, /windowsHide: true/, 'npx runs through a shell on Windows, which must not open a window');
});
