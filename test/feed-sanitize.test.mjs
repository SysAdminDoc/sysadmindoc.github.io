import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import sanitizeHtml from 'sanitize-html';
import { FEED_CONTENT_SANITIZE, TEXT_ONLY_SANITIZE } from '../src/data/feed-sanitize.ts';

const root = process.cwd();

// sanitize-html's GitHub repository is archived, though patches still reach npm
// (2.17.7 landed 2026-08-13, months after the archive). That makes it worth
// stating this site's assumptions explicitly rather than inheriting library
// defaults, and pinning them so a future upgrade that widens a default cannot
// widen this site's output silently.
test('feed content sanitizer narrows the library defaults', () => {
  assert.deepEqual(FEED_CONTENT_SANITIZE.allowedSchemes, ['https'], 'feeds should only carry HTTPS links');
  assert.equal(FEED_CONTENT_SANITIZE.allowProtocolRelative, false);
  assert.equal(FEED_CONTENT_SANITIZE.disallowedTagsMode, 'discard');
  assert.deepEqual(FEED_CONTENT_SANITIZE.allowedAttributes, { a: ['href'] });

  // The library ships a broader default; this asserts the narrowing is real
  // rather than a restatement of what we would have got anyway.
  assert.ok(
    sanitizeHtml.defaults.allowedSchemes.length > FEED_CONTENT_SANITIZE.allowedSchemes.length,
    'the library default must be broader than the configuration used here',
  );
});

test('feed sanitizer drops non-HTTPS and protocol-relative links', () => {
  const hostile = [
    '<p>ok</p>',
    '<a href="javascript:alert(1)">js</a>',
    '<a href="http://insecure.test/x">http</a>',
    '<a href="//evil.test/x">protocol relative</a>',
    '<a href="https://github.com/SysAdminDoc/x">good</a>',
    '<script>alert(1)</script>',
    '<img src="x" onerror="alert(1)">',
  ].join('');

  const cleaned = sanitizeHtml(hostile, FEED_CONTENT_SANITIZE);

  assert.doesNotMatch(cleaned, /javascript:/i, 'javascript: URLs must not survive');
  assert.doesNotMatch(cleaned, /http:\/\//i, 'plain http links must not survive');
  assert.doesNotMatch(cleaned, /href="\/\//, 'protocol-relative links must not survive');
  assert.doesNotMatch(cleaned, /<script|onerror/i, 'scripts and event handlers must not survive');
  assert.match(cleaned, /https:\/\/github\.com\/SysAdminDoc\/x/, 'legitimate HTTPS links must survive');
});

test('text-only sanitizer strips every tag', () => {
  const cleaned = sanitizeHtml('<b>bold</b> <a href="https://x.test">link</a><script>x()</script>', TEXT_ONLY_SANITIZE);
  assert.equal(cleaned.includes('<'), false, 'no markup may survive the text-only pass');
  assert.match(cleaned, /bold/);
});

test('every sanitize-html call site uses the shared configuration', () => {
  // Two endpoints previously carried duplicate inline option objects, which is
  // how one of them drifts from the other. Keep them on the shared constants.
  const callSites = ['src/pages/rss.xml.ts', 'src/pages/atom.xml.ts', 'src/data/portfolio.ts'];
  for (const relative of callSites) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.match(source, /FEED_CONTENT_SANITIZE|TEXT_ONLY_SANITIZE/, `${relative} must use a shared sanitize config`);
    assert.doesNotMatch(
      source,
      /allowedTags:\s*\[/,
      `${relative} must not re-declare sanitize options inline; extend src/data/feed-sanitize.ts instead`,
    );
  }
});

test('sanitize-html runs only in build-time code', () => {
  // Static output means these modules execute during the build, never in a
  // visitor's browser. If sanitize-html ever appears under public/scripts it
  // would be shipped to the client, which is a different risk profile entirely.
  const shipped = path.join(root, 'public', 'scripts');
  for (const entry of fs.readdirSync(shipped)) {
    if (!entry.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(shipped, entry), 'utf8');
    assert.doesNotMatch(source, /sanitize-html/, `${entry} must not pull sanitize-html into the client bundle`);
  }
});
