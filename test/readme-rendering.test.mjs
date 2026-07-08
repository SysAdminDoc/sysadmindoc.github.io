import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getReadmeReadingTime,
  getReadmeHighlighter,
  normalizeReadmeCodeLang,
  renderProjectReadme,
  renderProjectReadmeHtml,
} from '../src/data/readme-rendering.mjs';

test('README renderer highlights fenced code with class-based Shiki tokens', async () => {
  const markdown = [
    '# Demo',
    '',
    '```js',
    'const answer = 42;',
    '```',
  ].join('\n');

  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');

  assert.match(html, /<pre class="readme-code shiki shiki-github-dark-default" tabindex="0">/);
  assert.match(html, /<code class="readme-code-inner language-javascript">/);
  assert.match(html, /class="shiki-c-red"/);
  assert.doesNotMatch(html, /\sstyle=/i);
});

test('README renderer preserves sanitizer boundaries while keeping Shiki spans', async () => {
  const markdown = [
    '# Unsafe',
    '',
    '<span class="project-panel" style="color:red" onclick="alert(1)">bad</span>',
    '<pre class="project-panel">plain</pre>',
    '<img src="docs/screen.png" onerror="alert(1)" style="width:1px">',
    '',
    '```ps1',
    'Write-Host "ok"',
    '```',
  ].join('\n');

  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');

  assert.doesNotMatch(html, /onclick|onerror|\sstyle=/i);
  assert.doesNotMatch(html, /project-panel/);
  assert.match(html, /src="https:\/\/raw\.githubusercontent\.com\/SysAdminDoc\/DemoRepo\/HEAD\/docs\/screen\.png"/);
  assert.match(html, /class="readme-code-inner language-powershell"/);
  assert.match(html, /class="shiki-c-blue"/);
});

test('README renderer returns heading outline and reading-time metadata', async () => {
  const markdown = [
    '# Demo',
    '',
    'Intro words for the project overview.',
    '',
    '## Install',
    '',
    'Clone the repo and run the setup command.',
    '',
    '### Install',
    '',
    'Duplicate headings receive stable suffixed anchors.',
    '',
    '## Usage',
    '',
    'Run the app.',
  ].join('\n');

  const result = await renderProjectReadme(markdown, 'DemoRepo');

  assert.ok(result);
  assert.match(result.html, /<h4 id="install">Install<\/h4>/);
  assert.match(result.html, /<h5 id="install-2">Install<\/h5>/);
  assert.deepEqual(result.outline, [
    { depth: 3, id: 'demo', text: 'Demo' },
    { depth: 4, id: 'install', text: 'Install' },
    { depth: 5, id: 'install-2', text: 'Install' },
    { depth: 4, id: 'usage', text: 'Usage' },
  ]);
  assert.equal(result.readingTime.label, '1 min read');
  assert.ok(result.readingTime.words > 0);
});

test('README renderer nests headings and repairs empty table headers for embedded pages', async () => {
  const markdown = [
    '# Demo',
    '',
    '### Jumped source heading',
    '',
    '|  |  |',
    '|---|---|',
    '| Name | Value |',
  ].join('\n');

  const result = await renderProjectReadme(markdown, 'DemoRepo');

  assert.match(result.html, /<h3 id="demo">Demo<\/h3>/);
  assert.match(result.html, /<h4 id="jumped-source-heading">Jumped source heading<\/h4>/);
  assert.match(result.html, /<th>Column 1<\/th>/);
  assert.match(result.html, /<th>Column 2<\/th>/);
  assert.deepEqual(result.outline.slice(0, 2), [
    { depth: 3, id: 'demo', text: 'Demo' },
    { depth: 4, id: 'jumped-source-heading', text: 'Jumped source heading' },
  ]);
});

test('README reading-time helper rounds up by technical-document word count', () => {
  const words = Array.from({ length: 221 }, (_, index) => `word${index}`).join(' ');

  assert.deepEqual(getReadmeReadingTime(words), {
    words: 221,
    minutes: 2,
    label: '2 min read',
  });
});

test('README renderer falls back cleanly for unknown fence languages', async () => {
  const markdown = [
    '```not-a-real-language',
    '<script>alert(1)</script>',
    '```',
  ].join('\n');

  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');

  assert.match(html, /<pre class="readme-code" tabindex="0">/);
  assert.match(html, /language-not-a-real-language/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/i);
  assert.doesNotMatch(html, /\sstyle=/i);
});

test('README renderer highlights Kotlin fenced code blocks', async () => {
  const markdown = [
    '# KotlinDemo',
    '',
    '```kotlin',
    'fun main() = println("Hello")',
    '```',
  ].join('\n');

  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');

  assert.match(html, /<pre class="readme-code shiki shiki-github-dark-default" tabindex="0">/);
  assert.match(html, /<code class="readme-code-inner language-kotlin">/);
  assert.doesNotMatch(html, /\sstyle=/i);
});

test('README code language aliases resolve kt to kotlin', async () => {
  const highlighter = await getReadmeHighlighter();
  const loaded = highlighter.getLoadedLanguages();

  assert.equal(normalizeReadmeCodeLang('kt', loaded), 'kotlin');
  assert.equal(normalizeReadmeCodeLang('kotlin', loaded), 'kotlin');
});

test('README code language aliases resolve only to loaded Shiki languages', async () => {
  const highlighter = await getReadmeHighlighter();
  const loaded = highlighter.getLoadedLanguages();

  assert.equal(normalizeReadmeCodeLang('ps1', loaded), 'powershell');
  assert.equal(normalizeReadmeCodeLang('js', loaded), 'javascript');
  assert.equal(normalizeReadmeCodeLang('not-a-real-language', loaded), null);
});

// ---------------------------------------------------------------------------
// Adversarial sanitizer fixtures
// ---------------------------------------------------------------------------

// Helper: shared negative assertions applied to every adversarial case.
function assertNoExecutableHtml(html, label) {
  assert.doesNotMatch(html, /<script[\s>]/i, `${label}: <script> tag must not survive`);
  assert.doesNotMatch(html, /\son\w+\s*=/i, `${label}: on* event handler must not survive`);
  assert.doesNotMatch(html, /javascript:/i, `${label}: javascript: protocol must not survive`);
  assert.doesNotMatch(html, /<xmp[\s>]/i, `${label}: <xmp> tag must not survive`);
  assert.doesNotMatch(html, /<textarea[\s>]/i, `${label}: <textarea> tag must not survive`);
}

test('README sanitizer strips <xmp> raw-text bypass tag', async () => {
  const markdown = '<xmp><script>alert(1)</script></xmp>';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  assertNoExecutableHtml(html, '<xmp>');
});

test('README sanitizer strips <textarea> content-swallowing tag', async () => {
  const markdown = '<textarea><script>alert(1)</script></textarea>';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  assertNoExecutableHtml(html, '<textarea>');
});

test('README sanitizer strips SVG with inline <script>', async () => {
  const markdown = '<svg><script>alert(1)</script></svg>';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  assertNoExecutableHtml(html, 'SVG+script');
  // svg itself should also be gone (not in allowedTags)
  assert.doesNotMatch(html, /<svg[\s>]/i);
});

test('README sanitizer neutralises data:text/html URI in <img src>', async () => {
  // allowedSchemesByTag for img includes 'data' (for image/* payloads), so
  // sanitize-html keeps the src but the inline <script> payload is HTML-entity-
  // encoded by the time it reaches the attribute value — it cannot execute.
  const markdown = '<img src="data:text/html,<script>alert(1)</script>">';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  assertNoExecutableHtml(html, 'data-uri-img');
  // Confirm the <script> inside the data URI is entity-encoded, not literal
  assert.doesNotMatch(html, /<script>/i);
  assert.match(html, /&lt;script&gt;/i);
});

test('README sanitizer removes <script> injected via malformed closing tags', async () => {
  const markdown = '</p><script>alert(1)</script>';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  assertNoExecutableHtml(html, 'malformed-closing-tag');
});

test('README sanitizer strips onmouseover event handler from <div>', async () => {
  const markdown = '<div onmouseover="alert(1)">hover me</div>';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  assertNoExecutableHtml(html, 'onmouseover-div');
  // The div itself is allowed (in sanitize-html defaults) but the handler must be gone
  assert.match(html, /hover me/);
});

test('README sanitizer strips onerror event handler from <img>', async () => {
  const markdown = '<img onerror="alert(1)" src="x.png">';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  assertNoExecutableHtml(html, 'onerror-img');
  // img tag itself should survive (it is in allowedTags) but without the handler
  assert.match(html, /<img /i);
});

test('README sanitizer neutralises javascript: Markdown link via URL rewriting', async () => {
  // The marked link renderer calls resolveReadmeLink(), which treats
  // "javascript:alert(1)" as a relative path (no http/https/data/# prefix) and
  // prepends the GitHub blob base URL. The result is a harmless absolute HTTPS
  // link, not an executable javascript: URI.
  const markdown = '[click](javascript:alert(1))';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  assert.doesNotMatch(html, /<script[\s>]/i);
  assert.doesNotMatch(html, /\son\w+\s*=/i);
  // Must resolve to a safe https: URL, not a bare javascript: URI
  assert.match(html, /href="https:\/\/github\.com\/SysAdminDoc\/DemoRepo\/blob\/HEAD\/javascript:alert\(1\)"/);
});

test('README sanitizer neutralises javascript: href in raw HTML anchor via URL rewriting', async () => {
  // sanitize-html's transformTags for <a> calls resolveReadmeLink(), which
  // converts the relative-looking "javascript:alert(1)" path into a safe
  // absolute https: GitHub URL (same defence as the Markdown link path above).
  const markdown = '<a href="javascript:alert(1)">click</a>';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  assert.doesNotMatch(html, /<script[\s>]/i);
  assert.doesNotMatch(html, /\son\w+\s*=/i);
  // Must resolve to a safe https: URL, not a bare javascript: URI
  assert.match(html, /href="https:\/\/github\.com\/SysAdminDoc\/DemoRepo\/blob\/HEAD\/javascript:alert\(1\)"/);
});

test('README sanitizer strips onclick from task-list <input type="checkbox">', async () => {
  const markdown = '<input type="checkbox" onclick="alert(1)">';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  assertNoExecutableHtml(html, 'checkbox-onclick');
  // Checkbox is allowed but must be forced disabled with no extra attributes
  if (/<input/i.test(html)) {
    assert.match(html, /disabled/i);
    assert.doesNotMatch(html, /onclick/i);
  }
});

test('README sanitizer strips non-checkbox <input> types entirely', async () => {
  const markdown = '<input type="text" value="pwned">';
  const html = await renderProjectReadmeHtml(markdown, 'DemoRepo');
  // transformTags drops non-checkbox inputs (tagName: '')
  assert.doesNotMatch(html, /<input/i);
});
