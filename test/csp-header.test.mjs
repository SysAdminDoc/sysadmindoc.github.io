import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { buildCspHeaderValue, buildWasmCspHeaderValue, decodeHtmlAttribute, WASM_SCRIPT_SRC } from '../scripts/lib/csp-header.mjs';

const root = process.cwd();

async function distWith(html) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'csp-header-'));
  await fs.writeFile(path.join(dir, 'index.html'), html, 'utf8');
  return dir;
}

test('decodeHtmlAttribute decodes each entity exactly once', () => {
  assert.equal(decodeHtmlAttribute('&#39;self&#39; &lt;x&gt;'), "'self' <x>");
  // Decoding &amp; first would turn the escaped text `&amp;quot;` into a quote.
  assert.equal(decodeHtmlAttribute('&amp;quot;'), '&quot;');
  assert.equal(decodeHtmlAttribute('a&amp;b'), 'a&b');
});

test('buildCspHeaderValue turns the built meta policy into the response header', async (t) => {
  const dir = await distWith(
    '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src &#39;self&#39;;\nscript-src \'self\' \'wasm-unsafe-eval\'; report-to csp-endpoint">' +
      '</head><body></body></html>',
  );
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  assert.equal(
    buildCspHeaderValue(dir),
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; report-to csp-endpoint; frame-ancestors 'none'; report-uri /csp-report",
  );
});

test('buildCspHeaderValue refuses a policy the header cannot carry', async (t) => {
  /** @type {Array<[string, RegExp]>} */
  const cases = [
    ['<html><head></head></html>', /missing the production CSP meta policy/],
    ['<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">', /missing report-to csp-endpoint/],
    [
      '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; frame-ancestors \'none\'; report-to csp-endpoint">',
      /already declares frame-ancestors/,
    ],
    [
      '<meta http-equiv="Content-Security-Policy" content="default-src \'self\' &quot;x&quot;; report-to csp-endpoint">',
      /unsupported env-file characters/,
    ],
  ];
  for (const [html, expected] of cases) {
    const dir = await distWith(html);
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    assert.throws(() => buildCspHeaderValue(dir), expected);
  }
});

test('the Playwright preview serves the production CSP header', async () => {
  const [config, preview] = await Promise.all([
    fs.readFile(path.join(root, 'astro.config.mjs'), 'utf8'),
    fs.readFile(path.join(root, 'tests', 'playwright', 'preview-server.mjs'), 'utf8'),
  ]);

  // A worker's CSP comes only from its own script's response headers, so a
  // preview without the header runs /sw.js and the Pagefind worker unrestricted
  // and the browser suites cannot see what the live site refuses.
  assert.match(preview, /env: \{ PORTFOLIO_PREVIEW_PRODUCTION_HEADERS: '1' \}/);
  assert.match(config, /process\.env\.PORTFOLIO_PREVIEW_PRODUCTION_HEADERS === '1'/);
  // The preview can't choose a header by path, so it sends the search value
  // everywhere; every other page's own <meta> policy narrows it back.
  assert.match(config, /'Content-Security-Policy': buildWasmCspHeaderValue\(/);
  assert.match(config, /server: \{ headers: productionPreviewHeaders \}/);
});

// Pagefind compiles its index reader in /pagefind/pagefind-worker.js, which
// runs under its own response header, and on /search/ itself when the worker
// fails or takes over 5 seconds to start. Without the keyword on the worker,
// live search hung at "Searching" from 2026-08-20 until 2026-09-23. Every
// page's policy carried the keyword too until 2026-10-09, though only /search/
// can compile WebAssembly.
test("'wasm-unsafe-eval' reaches the Pagefind worker and /search/ and nothing else", async (t) => {
  const [base, offline, caddyfile] = await Promise.all([
    fs.readFile(path.join(root, 'src', 'layouts', 'Base.astro'), 'utf8'),
    fs.readFile(path.join(root, 'public', 'offline.html'), 'utf8'),
    fs.readFile(path.join(root, 'deploy', 'vps', 'Caddyfile'), 'utf8'),
  ]);
  assert.match(base, /^const isSearch = Astro\.url\.pathname === '\/search\/';$/m);
  const scriptSrc = base.match(/const scriptSrc = isDev \? "([^"]+)" : isSearch \? "([^"]+)" : "([^"]+)";/);
  assert.ok(scriptSrc, 'Base.astro must declare scriptSrc for dev, /search/ and every other page');
  assert.equal(scriptSrc[3], "'self'", 'an ordinary page policy allows no eval of any kind');
  assert.equal(scriptSrc[2], "'self' 'wasm-unsafe-eval'", "/search/ keeps Pagefind's main-thread fallback");
  assert.doesNotMatch(scriptSrc[1], /'wasm-unsafe-eval'|'unsafe-eval'/);
  assert.doesNotMatch(offline, /wasm-unsafe-eval/);

  // The Caddyfile widens the stamped header for the worker and /search/ with
  // the same pair the preview uses, so the two can't drift apart. Caddy reads
  // the find value as a regular expression.
  assert.equal(WASM_SCRIPT_SRC.find, "script-src 'self'");
  assert.equal(WASM_SCRIPT_SRC.replace, "script-src 'self' 'wasm-unsafe-eval'");
  assert.doesNotMatch(WASM_SCRIPT_SRC.find, /[.*+?^${}()|[\]\\]/);
  assert.match(caddyfile, /^\t@pagefind_wasm path \/search\/ \/search\/index\.html \/pagefind\/pagefind-worker\.js$/m);
  // A header with a matcher runs before the unmatched one that sets the
  // policy, so an immediate replace finds nothing; local Caddy 2.11.4 served
  // the worker without the keyword until the replace was deferred.
  assert.ok(
    caddyfile.includes(
      `\theader @pagefind_wasm {\n\t\tContent-Security-Policy "${WASM_SCRIPT_SRC.find}" "${WASM_SCRIPT_SRC.replace}"\n\t\tdefer\n\t}\n`,
    ),
    'the header rewrite uses the shared pair and is deferred',
  );
  assert.equal((caddyfile.match(/wasm-unsafe-eval/g) ?? []).length, 1, 'the keyword appears on the Pagefind route alone');

  const dir = await distWith(
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'report-sample\'; report-to csp-endpoint">',
  );
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  assert.equal(
    buildWasmCspHeaderValue(dir),
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'report-sample'; report-to csp-endpoint; frame-ancestors 'none'; report-uri /csp-report",
  );
  const odd = await distWith('<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'none\'; report-to csp-endpoint">');
  t.after(() => fs.rm(odd, { recursive: true, force: true }));
  assert.throws(() => buildWasmCspHeaderValue(odd), /no "script-src 'self'" for the search header to widen/);
});

test("'report-sample' rides on every directive an inline block is checked against, and only those", async () => {
  const [base, offline] = await Promise.all([
    fs.readFile(path.join(root, 'src', 'layouts', 'Base.astro'), 'utf8'),
    fs.readFile(path.join(root, 'public', 'offline.html'), 'utf8'),
  ]);
  // Without it, 262 of the first 327 stored reports named nothing but a
  // directive, and nobody could tell the site's own code from an extension's.
  assert.match(base, /const reportSample = isDev \? '' : " 'report-sample'";/);
  assert.match(base, /script-src \$\{scriptSrc\}\$\{reportSample\}; style-src \$\{styleSrc\}\$\{reportSample\}; style-src-elem \$\{styleElemSrc\}\$\{reportSample\}; style-src-attr \$\{styleAttrSrc\};/);

  const policy = offline.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? '';
  const directives = new Map(policy.split(';').map((part) => part.trim().split(/\s+/)).map(([name, ...tokens]) => [name, tokens]));
  for (const name of ['script-src', 'style-src', 'style-src-elem']) {
    assert.ok(directives.get(name)?.includes("'report-sample'"), `${name} carries 'report-sample' in offline.html`);
  }
  // 'none' only means none on its own.
  assert.deepEqual(directives.get('style-src-attr'), ["'none'"]);
  assert.ok(!directives.get('default-src')?.includes("'report-sample'"));
});
