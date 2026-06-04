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
  assert.match(result.html, /<h2 id="install">Install<\/h2>/);
  assert.match(result.html, /<h3 id="install-2">Install<\/h3>/);
  assert.deepEqual(result.outline, [
    { depth: 1, id: 'demo', text: 'Demo' },
    { depth: 2, id: 'install', text: 'Install' },
    { depth: 3, id: 'install-2', text: 'Install' },
    { depth: 2, id: 'usage', text: 'Usage' },
  ]);
  assert.equal(result.readingTime.label, '1 min read');
  assert.ok(result.readingTime.words > 0);
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

test('README code language aliases resolve only to loaded Shiki languages', async () => {
  const highlighter = await getReadmeHighlighter();
  const loaded = highlighter.getLoadedLanguages();

  assert.equal(normalizeReadmeCodeLang('ps1', loaded), 'powershell');
  assert.equal(normalizeReadmeCodeLang('js', loaded), 'javascript');
  assert.equal(normalizeReadmeCodeLang('not-a-real-language', loaded), null);
});
