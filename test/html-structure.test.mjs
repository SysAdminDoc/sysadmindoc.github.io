import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { auditDist, inspectHtml, repairHtml } from '../scripts/fix-html-structure.mjs';

async function withTempDist(run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sysadmindoc-html-'));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('html structure guard is no-op for valid build output', async () => {
  await withTempDist(async (dir) => {
    const file = path.join(dir, 'index.html');
    const html =
      '<!doctype html><html lang="en"><head></head><body><script src="/scripts/shared.js"></script><script src="/scripts/main.js"></script><script src="/scripts/home-catalog.js"></script></body></html>';
    await fs.writeFile(file, html);

    const result = auditDist(dir);
    assert.equal(result.scanned, 1);
    assert.equal(result.fixed, 0);
    assert.deepEqual(result.structuralViolations, []);
    assert.deepEqual(result.orderViolations, []);
    assert.equal(await fs.readFile(file, 'utf8'), html);
  });
});

test('html structure guard reports legacy early html close without mutating', async () => {
  await withTempDist(async (dir) => {
    const file = path.join(dir, 'legacy.html');
    const html = '<!doctype html><html><head></head></html><body><main>Page</main></body>';
    await fs.writeFile(file, html);

    const result = auditDist(dir);
    assert.equal(result.fixed, 0);
    assert.deepEqual(result.structuralViolations, ['/legacy.html']);
    assert.equal(await fs.readFile(file, 'utf8'), html);
  });
});

test('html structure guard can repair legacy output only when requested', async () => {
  await withTempDist(async (dir) => {
    const file = path.join(dir, 'legacy.html');
    const html = '<!doctype html><html><head></head></html><body><main>Page</main></body>';
    await fs.writeFile(file, html);

    const result = auditDist(dir, { repair: true });
    assert.equal(result.fixed, 1);
    assert.deepEqual(result.structuralViolations, ['/legacy.html']);

    const repaired = await fs.readFile(file, 'utf8');
    assert.equal(inspectHtml(repaired).hasEarlyHtmlClose, false);
    assert.equal(inspectHtml(repaired).missingFinalHtmlClose, false);
    assert.equal(repaired, repairHtml(html));
  });
});

test('html structure guard still catches homepage script order regressions', async () => {
  await withTempDist(async (dir) => {
    await fs.writeFile(
      path.join(dir, 'index.html'),
      '<!doctype html><html><head></head><body><script src="/scripts/main.js"></script><script src="/scripts/shared.js"></script></body></html>',
    );

    const result = auditDist(dir);
    assert.deepEqual(result.orderViolations, ['/index.html']);
  });
});

test('html structure guard catches feature scripts before homepage core', async () => {
  await withTempDist(async (dir) => {
    await fs.writeFile(
      path.join(dir, 'index.html'),
      '<!doctype html><html><head></head><body><script src="/scripts/shared.js"></script><script src="/scripts/home-catalog.js"></script><script src="/scripts/main.js"></script></body></html>',
    );

    const result = auditDist(dir);
    assert.deepEqual(result.orderViolations, ['/index.html']);
  });
});
