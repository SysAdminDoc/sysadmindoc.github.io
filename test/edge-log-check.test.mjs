import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { REQUIRED_EDGE_EXCLUDES, edgeLogExclusionProblem } from '../scripts/lib/edge-log-check.mjs';

const root = process.cwd();

test('the edge must keep both portfolio access and error entries out of its own log', () => {
  const live = ['http.log.access.log0', 'http.log.access.portfolio', 'http.log.error.portfolio'];
  assert.equal(edgeLogExclusionProblem(JSON.stringify(live)), null);
  assert.match(edgeLogExclusionProblem(JSON.stringify(['http.log.access.portfolio'])) ?? '', /doesn't exclude http\.log\.error\.portfolio/);
  assert.match(edgeLogExclusionProblem('[]') ?? '', /http\.log\.access\.portfolio or http\.log\.error\.portfolio/);
  assert.match(edgeLogExclusionProblem('null') ?? '', /no exclude list/);
  assert.match(edgeLogExclusionProblem('wget: can\'t connect to remote host') ?? '', /could not read/);
});

test('the names the check expects are the ones the edge block and the deploy use', async () => {
  // The exclusions name the portfolio's logger, so the edge block must give it
  // that name, and the deploy must read them back.
  const block = await fs.readFile(path.join(root, 'deploy', 'vps', 'caddy-block.txt'), 'utf8');
  assert.match(block, /\blog portfolio \{\s*\n\s*output file \/var\/log\/caddy\/portfolio\.log/);
  assert.deepEqual([...REQUIRED_EDGE_EXCLUDES], ['http.log.access.portfolio', 'http.log.error.portfolio']);
  const deploy = await fs.readFile(path.join(root, 'scripts', 'deploy-vps.mjs'), 'utf8');
  assert.match(deploy, /verifyEdgeLogging\(\);/);
  assert.match(deploy, /http:\/\/127\.0\.0\.1:2019\/config\/logging\/logs\/default\/exclude/);
});
