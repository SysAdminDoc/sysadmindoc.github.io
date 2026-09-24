import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { assertPortFree, assertServesBuild, portAnswers } from '../tests/playwright/preview-server-control.mjs';

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

test('the global setup checks the port before it starts the preview, and the build before it claims it', () => {
  const setup = fs.readFileSync(path.join(root, 'tests', 'playwright', 'preview-server.mjs'), 'utf8');
  const stop = setup.indexOf("astroPreview(['stop'], { ignoreErrors: true });");
  const free = setup.indexOf('await assertPortFree(hostname, port);');
  const start = setup.indexOf("astroPreview(['--background'");
  const build = setup.indexOf("await assertServesBuild(baseURL, path.join(process.cwd(), 'dist'));");
  const claim = setup.indexOf('writeMarker(');
  assert.ok(stop > 0 && stop < free && free < start, 'stop our own old daemon, then check the port, then start');
  assert.ok(start < build && build < claim, 'and check what answers before claiming it');
  const control = fs.readFileSync(path.join(root, 'tests', 'playwright', 'preview-server-control.mjs'), 'utf8');
  assert.match(control, /windowsHide: true/, 'npx runs through a shell on Windows, which must not open a window');
});
