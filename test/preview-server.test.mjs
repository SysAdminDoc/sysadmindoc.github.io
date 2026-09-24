import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
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
