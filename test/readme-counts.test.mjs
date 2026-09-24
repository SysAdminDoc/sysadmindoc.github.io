import assert from 'node:assert/strict';
import test from 'node:test';
import { readmeCountDrift } from '../scripts/lib/readme-counts.mjs';

const readme = [
  '- **Content collections**: featured (9), catalog (206 feed-backed / 209 local fallback), skills (8)',
  'npm run smoke:live -- --expected-projects 208 --expected-releases 60 --expected-feed-items 208',
].join('\n');
const counts = { feedCount: 206, fallbackCount: 209, releaseCount: 60, renderedCount: 208 };

test('a README that states what the data holds has no drift', () => {
  assert.deepEqual(readmeCountDrift(readme, counts), []);
  assert.deepEqual(readmeCountDrift(readme, { ...counts, renderedCount: null }), [], 'no build, no rendered check');
});

test('each count the data outgrew is named', () => {
  assert.deepEqual(readmeCountDrift(readme, { ...counts, feedCount: 207 }), ['the README says 206 feed-backed projects, the profile feed has 207']);
  assert.deepEqual(readmeCountDrift(readme, { ...counts, fallbackCount: 210 }), ['the README says 209 local fallback projects, src/data/projects.ts has 210']);
  assert.deepEqual(readmeCountDrift(readme, { ...counts, releaseCount: 61 }), ['the README says --expected-releases 60, the release cache has 61']);
  assert.deepEqual(readmeCountDrift(readme, { ...counts, renderedCount: 209 }), [
    'the README says --expected-projects 208, the build lists 209',
    'the README says --expected-feed-items 208, the build lists 209',
  ]);
  assert.deepEqual(readmeCountDrift('nothing about counts', { ...counts, renderedCount: null }), [
    'the README no longer states the catalog counts',
    'the README no longer states --expected-releases',
  ]);
});
