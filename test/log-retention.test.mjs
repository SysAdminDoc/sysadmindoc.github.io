import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { keptLogMb, logRetentionProblem, sizeMb } from '../scripts/lib/log-retention.mjs';

const inspect = (Type, Config = {}) => JSON.stringify({ Type, Config });

test('sizes read the way Docker reads them, in decimal units', () => {
  assert.equal(sizeMb('10m'), 10);
  assert.equal(sizeMb('512k'), 0.512);
  assert.equal(sizeMb('1g'), 1000);
  assert.equal(sizeMb('10000000'), 10, 'no unit means bytes');
  for (const value of ['10mb', '10MB', '10 m', '10MiB', '10M']) assert.equal(sizeMb(value), 10, value);
  for (const value of ['-1', '0', '', 'ten', undefined, '10mm', '10 mb b']) assert.equal(sizeMb(value), null, String(value));
});

// The eleventh drain review: Docker merges daemon.json's defaults into a
// container once, at create time, and inspect shows the result, so an empty
// Config means no limit whatever the host's defaults say now.
test("a container's own LogConfig is all that counts", () => {
  // The edge on 2026-09-24, before and after its compose file set options.
  assert.equal(keptLogMb('{"Type":"json-file","Config":{}}'), null);
  assert.equal(keptLogMb('{"Type":"json-file","Config":{"max-file":"3","max-size":"10m"}}'), 30);
  // max-file alone does nothing, and without a max-size the log never rolls.
  assert.equal(keptLogMb(inspect('json-file', { 'max-size': '10m' })), 10);
  assert.equal(keptLogMb(inspect('json-file', { 'max-file': '3' })), null);
  assert.equal(keptLogMb(inspect('json-file', { 'max-size': '-1', 'max-file': '3' })), null);
  assert.equal(keptLogMb(inspect('json-file', { 'max-size': '10000000', 'max-file': '3' })), 30, 'exactly 10 MB to Docker');
  // The local driver has bounds of its own: five 20 MiB files.
  assert.equal(keptLogMb(inspect('local')), 5 * 20.97152);
  assert.equal(keptLogMb(inspect('local', { 'max-size': '10m', 'max-file': '3' })), 30);
  assert.equal(keptLogMb(inspect('syslog')), null);
  assert.equal(keptLogMb(inspect('')), null, 'an empty type is never what inspect shows for a running container');
  assert.equal(keptLogMb('not json'), null);
});

test('the problem names the container and both numbers', () => {
  assert.equal(logRetentionProblem('caddy', inspect('json-file', { 'max-size': '10m', 'max-file': '3' }), 30), null);
  assert.equal(logRetentionProblem('caddy', inspect('json-file', { 'max-size': '10mb', 'max-file': '3' }), 30), null);
  assert.equal(logRetentionProblem('caddy', inspect('json-file'), 30), "Docker keeps no limit on caddy's own log, but /privacy/ says 30 MB");
  assert.equal(
    logRetentionProblem('portfolio-app', inspect('json-file', { 'max-size': '20m', 'max-file': '3' }), 30),
    "Docker keeps 60 MB of portfolio-app's own log, but /privacy/ says 30 MB",
  );
  assert.equal(
    logRetentionProblem('caddy', inspect('json-file', { 'max-size': '10240k', 'max-file': '3' }), 30),
    "Docker keeps 30.72 MB of caddy's own log, but /privacy/ says 30 MB",
  );
});

test('the deploy reads each container, not the host defaults', () => {
  const deploy = fs.readFileSync(path.join(process.cwd(), 'scripts', 'deploy-vps.mjs'), 'utf8');
  const body = deploy.match(/function verifyServerLogRetention\(\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(body, /for \(const container of \['caddy', 'portfolio-app'\]\)/);
  assert.match(body, /docker inspect \$\{container\} --format '\{\{json \.HostConfig\.LogConfig\}\}'/);
  assert.doesNotMatch(body, /daemon\.json/);
  const compose = fs.readFileSync(path.join(process.cwd(), 'deploy', 'vps', 'docker-compose.yml'), 'utf8');
  const app = compose.match(/\n {2}portfolio-app:\n([\s\S]*?)(?=\n {2}[\w-]+:\n|$)/)?.[1] ?? '';
  assert.match(app, /max-size: "?10m"?/);
  assert.match(app, /max-file: "?3"?/);
});
