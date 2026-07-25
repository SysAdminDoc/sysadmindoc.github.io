import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const LOOPBACK_HOST = '127.0.0.1';
const LOCAL_SERVER_SCRIPTS = ['dev', 'dev:agent', 'start', 'preview'];

test('local server scripts bind to IPv4 loopback by default', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));

  for (const scriptName of LOCAL_SERVER_SCRIPTS) {
    const script = packageJson.scripts?.[scriptName];
    assert.equal(typeof script, 'string', `missing npm script: ${scriptName}`);
    assert.match(
      script,
      new RegExp(String.raw`(?:^|\s)--host(?:=|\s+)${LOOPBACK_HOST.replaceAll('.', String.raw`\.`)}(?:\s|$)`),
      `${scriptName} must bind explicitly to ${LOOPBACK_HOST}`,
    );
  }
});

test('tracked local-server documentation preserves the loopback policy', async () => {
  const readme = await readFile('README.md', 'utf8');

  assert.match(readme, /bind to IPv4 loopback\s+\(`127\.0\.0\.1`\) by default/);
  assert.doesNotMatch(readme, /0\.0\.0\.0/);
});
