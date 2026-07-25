import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkupAttributes, scanMarkup } from '../scripts/lib/csp-markup-parser.mjs';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const scriptPath = path.join(repoRoot, 'scripts', 'audit-csp.mjs');
const baseLayoutPath = path.join(repoRoot, 'src', 'layouts', 'Base.astro');
const criticalCssPath = path.join(repoRoot, 'src', 'styles', 'critical.css');
const inlineStyleSurfaceCount = 2;
const astroExtractedStyleBlockCount = 13;

function countJavaScriptFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((count, entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return count + countJavaScriptFiles(entryPath);
    return count + Number(entry.isFile() && entry.name.endsWith('.js'));
  }, 0);
}

function sha256Csp(value) {
  return `sha256-${crypto.createHash('sha256').update(value.replace(/\r\n?/g, '\n')).digest('base64')}`;
}

function runAudit(args = []) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('CSP markup parsing keeps Astro expressions and quoted greater-than signs inside their attributes', () => {
  const [component] = scanMarkup('<Widget class:list={items.map((item) => item.active)} title={`house style guide`} />');
  const attrs = parseMarkupAttributes(component.attrText);

  assert.equal(attrs['class:list'], '{items.map((item) => item.active)}');
  assert.equal(attrs.title, '{`house style guide`}');
  assert.equal('style' in attrs, false);

  const tags = scanMarkup(`
    <!--<script>commentedOut()</script>-->
    <a href="/x" title="a > b" onclick="alert(1)">Link</a>
    <script data-x="a>b">activeScript()</script>
  `);
  assert.deepEqual(tags.map(({ tagName }) => tagName), ['a', 'script']);
  assert.equal(parseMarkupAttributes(tags[0].attrText).onclick, 'alert(1)');
  assert.equal(parseMarkupAttributes(tags[1].attrText)['data-x'], 'a>b');
  assert.equal(tags[1].content, 'activeScript()');
});

test('csp audit inventories current inline script blockers without failing default mode', () => {
  const output = runAudit();

  assert.match(output, /CSP preflight audit/);
  assert.match(output, /script-src: 'self'/);
  assert.match(output, /style-src: 'self'/);
  assert.match(output, /style-src-elem: 'self' 'sha256-[A-Za-z0-9+/=]+' 'sha256-[A-Za-z0-9+/=]+'/);
  assert.match(output, /style-src-attr: 'none'/);
  assert.doesNotMatch(output, /\$\{[^}]+\}/);
  assert.match(output, /script unsafe-inline active: no/);
  assert.match(output, /style unsafe-inline active: no/);
  assert.match(output, /style element unsafe-inline active: no/);
  assert.match(output, /style attribute unsafe-inline active: no/);
  assert.match(output, /executable inline scripts: 0/);
  assert.match(output, /JSON-LD\/data script blocks: 15/);
  assert.match(output, /inline event handlers: 0/);
  assert.match(output, new RegExp(`inline style blocks: ${inlineStyleSurfaceCount}`));
  assert.match(output, new RegExp(`Astro extracted style blocks: ${astroExtractedStyleBlockCount}`));
  assert.match(output, /inline style attributes: 0/);
  assert.match(output, /stylesheet\/preload links: 5/);
  assert.match(output, new RegExp(`runtime JavaScript files scanned: ${countJavaScriptFiles(path.join(repoRoot, 'public'))}`));
  assert.match(output, /runtime style\.cssText writes: 0/);
  assert.match(output, /runtime setAttribute\("style"\) writes: 0/);
  assert.match(output, /runtime direct style property references: 7/);
  assert.match(output, /runtime HTML sink writes: 0/);
  assert.match(output, /script-src unsafe-inline required today: no/);
  assert.match(output, /style-src unsafe-inline required today: no/);
  assert.match(output, /style-src-elem unsafe-inline required today: no/);
  assert.match(output, /style-src-attr unsafe-inline required today: no/);
  assert.match(output, /Trusted Types trial ready: yes/);
  assert.match(output, /CSP preflight audit passed/);
});

test('csp audit sees handlers after quoted greater-than signs and ignores commented scripts', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-markup-parser-'));
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "style-src-attr 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  try {
    fs.writeFileSync(
      path.join(tmp, 'index.html'),
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body><!--<script>commentedOut()</script>--><div style></div><a title="a > b" onclick="alert(1)">Link</a></body></html>`,
    );
    const result = spawnSync(process.execPath, [scriptPath, '--dist', tmp, '--strict'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stdout, /executable inline scripts: 0/);
    assert.match(result.stdout, /inline event handlers: 1/);
    assert.match(result.stdout, /inline style attributes: 0/);
    assert.match(result.stderr, /1 inline event handler\(s\) are outside the CSP audit allowlist/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('csp audit hashes scripts correctly when an attribute contains a greater-than sign', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-script-attribute-'));
  const content = 'activeScript()';
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "style-src-attr 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  try {
    fs.writeFileSync(
      path.join(tmp, 'index.html'),
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body><script data-x="a>b">${content}</script></body></html>`,
    );
    const output = execFileSync(process.execPath, [scriptPath, '--dist', tmp], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    assert.match(output, /executable inline scripts: 1/);
    assert.match(output, new RegExp(`hash='${sha256Csp(content).replaceAll('+', '\\+')}'`));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('source-mode CSP resolution follows the production branch and rejects unsafe-inline drift', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-source-policy-'));
  const layoutDir = path.join(tmp, 'src', 'layouts');
  const stylesDir = path.join(tmp, 'src', 'styles');
  fs.mkdirSync(layoutDir, { recursive: true });
  fs.mkdirSync(stylesDir, { recursive: true });
  const source = fs.readFileSync(baseLayoutPath, 'utf8');
  const mutated = source.replace(
    `const scriptSrc = isDev ? "'self' 'unsafe-inline'" : "'self'";`,
    `const scriptSrc = isDev ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline'";`,
  );
  assert.notEqual(mutated, source);

  try {
    fs.writeFileSync(path.join(layoutDir, 'Base.astro'), mutated);
    fs.copyFileSync(criticalCssPath, path.join(stylesDir, 'critical.css'));
    const result = spawnSync(process.execPath, [scriptPath, '--strict'], {
      cwd: tmp,
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stdout, /active CSP: .*script-src 'self' 'unsafe-inline'/);
    assert.doesNotMatch(result.stdout, /\$\{[^}]+\}/);
    assert.match(result.stderr, /script-src still allows 'unsafe-inline'/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('csp style element hashes match the critical and no-js inline style blocks', () => {
  const baseLayout = fs.readFileSync(baseLayoutPath, 'utf8');
  const criticalCss = fs.readFileSync(criticalCssPath, 'utf8');
  const noJsFallbackCss = baseLayout.match(/const noJsRevealCss = '([^']+)';/)?.[1] ?? '';
  const astroConfig = fs.readFileSync(path.join(repoRoot, 'astro.config.mjs'), 'utf8');
  const output = runAudit();

  assert.match(astroConfig, /inlineStylesheets:\s*'never'/);
  assert.ok(noJsFallbackCss, 'expected a source no-JS fallback CSS constant in Base.astro');
  assert.match(baseLayout, /const styleElemSrc = isDev/);
  assert.match(baseLayout, /\? "'self' 'unsafe-inline'"\s+: \["'self'", `'\$\{sha256Csp\(criticalCss\)\}'`, `'\$\{sha256Csp\(noJsRevealCss\)\}'`\]\.join\(' '\)/);
  assert.match(baseLayout, /sha256Csp\(criticalCss\)/);
  assert.match(baseLayout, /sha256Csp\(noJsRevealCss\)/);
  assert.match(baseLayout, /content=\{contentSecurityPolicy\}/);
  assert.match(baseLayout, /<style is:inline set:html=\{noJsRevealCss\}><\/style>/);
  assert.match(output, new RegExp(`'${sha256Csp(criticalCss).replaceAll('+', '\\+')}'`));
  assert.match(output, new RegExp(`'${sha256Csp(noJsFallbackCss).replaceAll('+', '\\+')}'`));
});

test('csp audit strict candidate mode passes with script-src self after script migration', () => {
  const result = spawnSync(process.execPath, [scriptPath, '--candidate-script-src', "'self'", '--strict'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Candidate script-src: 'self'/);
  assert.match(result.stdout, /PASS - candidate allows all current executable inline script surfaces/);
  assert.equal(result.stderr, '');
});

test('csp audit reports style-src self blockers for true inline styles', () => {
  const output = runAudit(['--candidate-style-src', "'self'"]);

  assert.match(output, /Candidate style-src: 'self'/);
  assert.match(
    output,
    new RegExp(`BLOCKED - ${inlineStyleSurfaceCount} current inline style surface\\(s\\) would be blocked`),
  );
  assert.match(output, /style-block: src\/layouts\/Base\.astro:\d+ hash='sha256-/);
  assert.doesNotMatch(output, /style-block: src\/components\/GreatestHits\.astro:/);
  assert.doesNotMatch(output, /style-attribute:/);
  assert.match(output, /CSP preflight audit passed/);
});

test('csp audit strict style candidate fails until inline style surfaces are removed', () => {
  const result = spawnSync(process.execPath, [scriptPath, '--candidate-style-src', "'self'", '--strict'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Candidate style-src: 'self'/);
  assert.match(
    result.stdout,
    new RegExp(`BLOCKED - ${inlineStyleSurfaceCount} current inline style surface\\(s\\) would be blocked`),
  );
  assert.match(
    result.stderr,
    new RegExp(`candidate style-src 'self' would block ${inlineStyleSurfaceCount} current inline style surface\\(s\\)`),
  );
});

test('csp audit reports style-src-elem self blockers separately from style attributes', () => {
  const output = runAudit(['--candidate-style-src-elem', "'self'"]);

  assert.match(output, /Candidate style-src-elem: 'self'/);
  assert.match(
    output,
    new RegExp(`BLOCKED - ${inlineStyleSurfaceCount} current style element\\/link surface\\(s\\) would be blocked`),
  );
  assert.match(output, /style-block: src\/layouts\/Base\.astro:\d+ hash='sha256-/);
  assert.doesNotMatch(output, /style-block: src\/components\/GreatestHits\.astro:/);
  assert.doesNotMatch(output, /style-attribute: src\/components\/SkillCard\.astro:\d+ div\.style/);
  assert.doesNotMatch(output, /style-cssText:/);
  assert.match(output, /CSP preflight audit passed/);
});

test('csp audit strict active style-src-elem passes with source Astro style accounting', () => {
  const result = spawnSync(process.execPath, [
    scriptPath,
    '--strict',
    '--active-style-src-elem',
    '--candidate-style-src-attr',
    "'none'",
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, new RegExp(`inline style blocks: ${inlineStyleSurfaceCount}`));
  assert.match(result.stdout, new RegExp(`Astro extracted style blocks: ${astroExtractedStyleBlockCount}`));
  assert.match(result.stdout, /Active style-src-elem: 'self' 'sha256-/);
  assert.match(result.stdout, /PASS - active policy allows all current style element\/link surfaces/);
  assert.match(result.stdout, /Candidate style-src-attr: 'none'/);
  assert.match(result.stdout, /PASS - candidate allows all current style attribute surfaces/);
  assert.equal(result.stderr, '');
});

test('csp audit reports style-src-attr none as clean after attribute migration', () => {
  const output = runAudit(['--candidate-style-src-attr', "'none'"]);

  assert.match(output, /Candidate style-src-attr: 'none'/);
  assert.match(output, /PASS - candidate allows all current style attribute surfaces/);
  assert.doesNotMatch(output, /style-attribute:/);
  assert.doesNotMatch(output, /style-cssText:/);
  assert.doesNotMatch(output, /style-property:/);
  assert.match(output, /CSP preflight audit passed/);
});

test('csp audit strict split style candidates reflect staged attribute migration', () => {
  const elem = spawnSync(process.execPath, [scriptPath, '--candidate-style-src-elem', "'self'", '--strict'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(elem.status, 1);
  assert.match(elem.stdout, /Candidate style-src-elem: 'self'/);
  assert.match(
    elem.stderr,
    new RegExp(`candidate style-src-elem 'self' would block ${inlineStyleSurfaceCount} current style element\\/link surface\\(s\\)`),
  );

  const attr = spawnSync(process.execPath, [scriptPath, '--candidate-style-src-attr', "'none'", '--strict'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(attr.status, 0);
  assert.match(attr.stdout, /Candidate style-src-attr: 'none'/);
  assert.match(attr.stdout, /PASS - candidate allows all current style attribute surfaces/);
  assert.equal(attr.stderr, '');
});

test('csp audit can verify rendered style elements against the active policy', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-active-style-'));
  const inlineCss = 'body{color:#123;background:#fff}';
  const inlineHash = sha256Csp(inlineCss);
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    `style-src-elem 'self' '${inlineHash}'`,
    "style-src-attr 'none'",
    "form-action 'self'",
  ].join('; ');

  fs.writeFileSync(
    path.join(tmp, 'index.html'),
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"><style>${inlineCss}</style><link rel="stylesheet" href="/assets/site.css"></head><body></body></html>`,
  );

  const result = spawnSync(process.execPath, [scriptPath, '--dist', tmp, '--active-style-src-elem', '--strict'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Active style-src-elem: 'self' 'sha256-/);
  assert.match(result.stdout, /PASS - active policy allows all current style element\/link surfaces/);
  assert.equal(result.stderr, '');
});

test('csp audit strict dist mode fails on missing or divergent CSP metadata', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-meta-consistency-'));
  const nestedDir = path.join(tmp, 'nested');
  fs.mkdirSync(nestedDir);
  const inlineCss = 'body{color:#123}';
  const inlineHash = sha256Csp(inlineCss);
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    `style-src-elem 'self' '${inlineHash}'`,
    "style-src-attr 'none'",
    "form-action 'self'",
  ].join('; ');
  const divergentPolicy = policy.replace("connect-src 'self'", "connect-src 'self' https://example.com");
  const divergentFallbackPolicy = divergentPolicy === policy
    ? `${policy}; connect-src https://example.com`
    : divergentPolicy;

  fs.writeFileSync(
    path.join(tmp, 'index.html'),
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"><style>${inlineCss}</style></head><body></body></html>`,
  );
  fs.writeFileSync(path.join(tmp, 'missing.html'), '<!doctype html><html><head></head><body></body></html>');
  fs.writeFileSync(
    path.join(nestedDir, 'divergent.html'),
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${divergentFallbackPolicy}"></head><body></body></html>`,
  );

  const result = spawnSync(process.execPath, [scriptPath, '--dist', tmp, '--active-style-src-elem', '--strict'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /files with one CSP meta: 2\/3/);
  assert.match(result.stdout, /unique CSP policies: 2/);
  assert.match(result.stderr, /1 built HTML file\(s\) are missing a CSP meta tag: .*missing\.html/);
  assert.match(result.stderr, /1 built CSP meta tag\(s\) differ from the active policy: .*(index\.html|nested\/divergent\.html)/);
});

test('csp audit strict dist mode fails when active style-src-attr blocks an inline style', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-style-attr-active-'));
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "style-src-elem 'self'",
    "style-src-attr 'none'",
    "form-action 'self'",
  ].join('; ');

  try {
    fs.writeFileSync(
      path.join(tmp, 'index.html'),
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body style="color:red"></body></html>`,
    );
    const result = spawnSync(process.execPath, [scriptPath, '--dist', tmp, '--strict'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stdout, /style-src-attr unsafe-inline required today: yes/);
    assert.match(result.stderr, /1 style attribute\/write surface\(s\) are blocked by the active style-src-attr policy/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('csp audit strict dist mode fails when script-src blocks an external origin', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-script-origin-active-'));
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "style-src-elem 'self'",
    "style-src-attr 'none'",
    "form-action 'self'",
  ].join('; ');

  try {
    fs.writeFileSync(
      path.join(tmp, 'index.html'),
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"><script src="https://cdn.example.com/app.js"></script></head><body></body></html>`,
    );
    const result = spawnSync(process.execPath, [scriptPath, '--dist', tmp, '--strict'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stdout, /third-party external scripts: 1/);
    assert.match(result.stdout, /external-script: .*https:\/\/cdn\.example\.com\/app\.js blocked by active script-src/);
    assert.match(result.stderr, /1 external script source\(s\) are blocked by the active script-src/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('csp audit strict dist mode scans bundled JavaScript for runtime HTML sinks', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-runtime-sink-'));
  const assetsDir = path.join(tmp, '_assets');
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "style-src-elem 'self'",
    "style-src-attr 'none'",
    "form-action 'self'",
  ].join('; ');

  try {
    fs.mkdirSync(assetsDir);
    fs.writeFileSync(
      path.join(tmp, 'index.html'),
      `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body></body></html>`,
    );
    fs.writeFileSync(path.join(assetsDir, 'page.js'), "document.body.innerHTML = '<main>unsafe</main>';\n");

    const result = spawnSync(process.execPath, [scriptPath, '--dist', tmp, '--strict'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stdout, /runtime JavaScript files scanned: 1/);
    assert.match(result.stdout, /runtime HTML sink writes: 1/);
    assert.match(result.stdout, /_assets\/page\.js:1 innerHTML assignment/);
    assert.match(result.stderr, /1 runtime HTML sink write\(s\) block Trusted Types trial readiness: .*_assets\/page\.js/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
