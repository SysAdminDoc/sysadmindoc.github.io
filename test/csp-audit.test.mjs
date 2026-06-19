import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const scriptPath = path.join(repoRoot, 'scripts', 'audit-csp.mjs');
const baseLayoutPath = path.join(repoRoot, 'src', 'layouts', 'Base.astro');
const criticalCssPath = path.join(repoRoot, 'src', 'styles', 'critical.css');
const inlineStyleSurfaceCount = 15;

function sha256Csp(value) {
  return `sha256-${crypto.createHash('sha256').update(value).digest('base64')}`;
}

function runAudit(args = []) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('csp audit inventories current inline script blockers without failing default mode', () => {
  const output = runAudit();

  assert.match(output, /CSP preflight audit/);
  assert.match(output, /script-src: 'self'/);
  assert.match(output, /style-src: 'self'/);
  assert.match(output, /style-src-elem: 'self' 'sha256-[A-Za-z0-9+/=]+' 'sha256-[A-Za-z0-9+/=]+'/);
  assert.match(output, /style-src-attr: 'none'/);
  assert.match(output, /script unsafe-inline active: no/);
  assert.match(output, /style unsafe-inline active: no/);
  assert.match(output, /style element unsafe-inline active: no/);
  assert.match(output, /style attribute unsafe-inline active: no/);
  assert.match(output, /executable inline scripts: 0/);
  assert.match(output, /JSON-LD\/data script blocks: 14/);
  assert.match(output, /inline event handlers: 0/);
  assert.match(output, new RegExp(`inline style blocks: ${inlineStyleSurfaceCount}`));
  assert.match(output, /inline style attributes: 0/);
  assert.match(output, /stylesheet\/preload links: 4/);
  assert.match(output, /runtime style\.cssText writes: 0/);
  assert.match(output, /runtime setAttribute\("style"\) writes: 0/);
  assert.match(output, /runtime direct style property references: 30/);
  assert.match(output, /script-src unsafe-inline required today: no/);
  assert.match(output, /style-src unsafe-inline required today: yes/);
  assert.match(output, /style-src-elem unsafe-inline required today: yes/);
  assert.match(output, /style-src-attr unsafe-inline required today: no/);
  assert.match(output, /CSP preflight audit passed/);
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

test('csp audit reports style-src self blockers before style unsafe-inline removal', () => {
  const output = runAudit(['--candidate-style-src', "'self'"]);

  assert.match(output, /Candidate style-src: 'self'/);
  assert.match(
    output,
    new RegExp(`BLOCKED - ${inlineStyleSurfaceCount} current inline style surface\\(s\\) would be blocked`),
  );
  assert.match(output, /style-block: src\/components\/GreatestHits\.astro:\d+ hash='sha256-/);
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
  assert.match(output, /style-block: src\/components\/GreatestHits\.astro:\d+ hash='sha256-/);
  assert.doesNotMatch(output, /style-attribute: src\/components\/SkillCard\.astro:\d+ div\.style/);
  assert.doesNotMatch(output, /style-cssText:/);
  assert.match(output, /CSP preflight audit passed/);
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
