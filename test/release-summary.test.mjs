import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  markdownLineToText,
  summarizeReleaseBody,
  truncateOnWord,
} from '../src/data/release-summary.mjs';

test('markdownLineToText unwraps emphasis, code, and links', () => {
  assert.equal(markdownLineToText('**Settings search** is back'), 'Settings search is back');
  assert.equal(markdownLineToText('see `CHANGELOG.md` for history'), 'see CHANGELOG.md for history');
  assert.equal(markdownLineToText('read the [docs](https://example.com/docs)'), 'read the docs');
  assert.equal(markdownLineToText('![screenshot](/a.png)'), 'screenshot');
  assert.equal(markdownLineToText('__Important__ note'), 'Important note');
  assert.equal(markdownLineToText('an *emphasised* word'), 'an emphasised word');
});

test('markdownLineToText strips list, quote, and heading prefixes', () => {
  assert.equal(markdownLineToText('- **OCR**: language fix'), 'OCR: language fix');
  assert.equal(markdownLineToText('* bullet'), 'bullet');
  assert.equal(markdownLineToText('1. first item'), 'first item');
  assert.equal(markdownLineToText('> quoted line'), 'quoted line');
  assert.equal(markdownLineToText('## Heading'), 'Heading');
});

test('markdownLineToText drops emphasis markers orphaned by a mid-word truncation', () => {
  assert.equal(markdownLineToText('history. · **Settings sear'), 'history. · Settings sear');
  assert.equal(markdownLineToText('leaked into the `WinRT'), 'leaked into the WinRT');
});

test('markdownLineToText cleans list markers left mid-string by legacy summaries', () => {
  const legacy = 'SwiftShot v2.10.1 — deep-audit pass. · - **OCR**: language fix · - Second item';
  assert.equal(
    markdownLineToText(legacy),
    'SwiftShot v2.10.1 — deep-audit pass. · OCR: language fix · Second item',
  );
});

test('markdownLineToText leaves snake_case identifiers intact', () => {
  assert.equal(markdownLineToText('set version_code_138 on build'), 'set version_code_138 on build');
  assert.equal(markdownLineToText('MANAGE_MEDIA permission'), 'MANAGE_MEDIA permission');
});

test('markdownLineToText collapses whitespace', () => {
  assert.equal(markdownLineToText('  spaced    out\ttext '), 'spaced out text');
});

test('truncateOnWord never splits a word and marks the cut', () => {
  const result = truncateOnWord('alpha beta gamma delta epsilon', 20);
  assert.ok(result.length <= 20, `expected <= 20 chars, got ${result.length}`);
  assert.ok(result.endsWith('…'));
  assert.ok(!/\bdelt\b|\bepsilo\b/.test(result), `truncated mid-word: ${result}`);
  assert.ok('alpha beta gamma delta epsilon'.startsWith(result.slice(0, -1)));
});

test('truncateOnWord leaves short text untouched', () => {
  assert.equal(truncateOnWord('short enough', 220), 'short enough');
});

test('truncateOnWord hard-cuts a single oversized word', () => {
  const result = truncateOnWord('supercalifragilisticexpialidocious', 10);
  assert.equal(result.length, 10);
  assert.ok(result.endsWith('…'));
});

test('summarizeReleaseBody produces prose from a real-shaped release body', () => {
  const body = [
    '## What changed',
    '',
    'Signed universal release APK for Aura v6.38.0 (versionCode 138).',
    '- **Settings search** now filters every section.',
    '- Fixed `MediaStore` deletion on Android 15.',
    '- A fourth line that should not appear.',
  ].join('\n');
  const summary = summarizeReleaseBody(body);
  assert.ok(!summary.includes('**'), `emphasis markers leaked: ${summary}`);
  assert.ok(!summary.includes('`'), `code markers leaked: ${summary}`);
  assert.ok(!summary.includes('##'), `heading markers leaked: ${summary}`);
  assert.ok(!summary.includes('A fourth line'), 'summary should stop after maxLines');
  assert.match(summary, /Signed universal release APK/);
  assert.match(summary, / · /);
});

test('summarizeReleaseBody drops fenced code blocks', () => {
  const body = ['Upgrade notes.', '```bash', 'npm install thing', '```', 'Second line.'].join('\n');
  const summary = summarizeReleaseBody(body);
  assert.ok(!summary.includes('npm install'), `code block leaked: ${summary}`);
  assert.match(summary, /Upgrade notes/);
});

test('summarizeReleaseBody is idempotent over an already summarized value', () => {
  const body = 'First line.\n- **Second** line.\n- Third `line`.';
  const once = summarizeReleaseBody(body);
  assert.equal(summarizeReleaseBody(once), once);
});

test('summarizeReleaseBody handles empty and nullish bodies', () => {
  assert.equal(summarizeReleaseBody(''), '');
  assert.equal(summarizeReleaseBody(null), '');
  assert.equal(summarizeReleaseBody(undefined), '');
});
