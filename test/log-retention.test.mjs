import assert from 'node:assert/strict';
import test from 'node:test';
import { keptLogMb, logRetentionProblem, sizeMb } from '../scripts/lib/log-retention.mjs';

const inspect = (Type, Config = {}) => JSON.stringify({ Type, Config });
const daemon = (options, driver) => JSON.stringify({ ...(driver ? { 'log-driver': driver } : {}), 'log-opts': options });

test('sizes read the way Docker reads them', () => {
  assert.equal(sizeMb('10m'), 10);
  assert.equal(sizeMb('512k'), 0.5);
  assert.equal(sizeMb('1g'), 1024);
  assert.equal(sizeMb('1048576'), 1, 'no unit means bytes');
  for (const value of ['-1', '', 'ten', undefined, '10mb']) assert.equal(sizeMb(value), null, String(value));
});

test('a container without options of its own keeps what the host default says', () => {
  // The edge on 2026-09-23: json-file, no options, host default 10m x 3.
  assert.equal(keptLogMb(inspect('json-file'), daemon({ 'max-size': '10m', 'max-file': '3' })), 30);
  // Its own options win over the host's.
  assert.equal(keptLogMb(inspect('json-file', { 'max-size': '5m', 'max-file': '2' }), daemon({ 'max-size': '10m', 'max-file': '3' })), 10);
  assert.equal(keptLogMb(inspect('json-file', { 'max-file': '2' }), daemon({ 'max-size': '10m', 'max-file': '3' })), 20, 'and merge with them');
  // max-file alone does nothing, and without a max-size the log never rolls.
  assert.equal(keptLogMb(inspect('json-file', { 'max-size': '10m' }), ''), 10);
  assert.equal(keptLogMb(inspect('json-file'), ''), null);
  assert.equal(keptLogMb(inspect('json-file'), daemon({ 'max-file': '3' })), null);
  assert.equal(keptLogMb(inspect('json-file', { 'max-size': '-1' }), ''), null);
  // A host default for another driver doesn't apply.
  assert.equal(keptLogMb(inspect('json-file'), daemon({ 'max-size': '10m' }, 'local')), null);
  // The local driver has bounds of its own.
  assert.equal(keptLogMb(inspect('local'), ''), 100);
  assert.equal(keptLogMb(inspect('syslog'), ''), null);
  assert.equal(keptLogMb('not json', ''), null);
  assert.equal(keptLogMb(inspect('json-file'), '{broken'), null, 'an unreadable daemon.json bounds nothing');
});

test('the problem names the container and both numbers', () => {
  assert.equal(logRetentionProblem('caddy', inspect('json-file'), daemon({ 'max-size': '10m', 'max-file': '3' }), 30), null);
  assert.equal(
    logRetentionProblem('caddy', inspect('json-file'), '', 30),
    "Docker keeps no limit on caddy's own log, but /privacy/ says 30 MB",
  );
  assert.equal(
    logRetentionProblem('portfolio-app', inspect('json-file', { 'max-size': '20m', 'max-file': '3' }), '', 30),
    "Docker keeps 60 MB of portfolio-app's own log, but /privacy/ says 30 MB",
  );
});
