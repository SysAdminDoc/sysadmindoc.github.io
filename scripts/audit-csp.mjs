#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourceDirs = ['src'];
const options = {
  strict: false,
  candidateScriptSrc: null,
  candidateStyleSrc: null,
  distDir: null,
};

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (arg === '--strict') {
    options.strict = true;
  } else if (arg === '--candidate-script-src') {
    index += 1;
    options.candidateScriptSrc = process.argv[index];
  } else if (arg.startsWith('--candidate-script-src=')) {
    options.candidateScriptSrc = arg.slice('--candidate-script-src='.length);
  } else if (arg === '--candidate-style-src') {
    index += 1;
    options.candidateStyleSrc = process.argv[index];
  } else if (arg.startsWith('--candidate-style-src=')) {
    options.candidateStyleSrc = arg.slice('--candidate-style-src='.length);
  } else if (arg === '--dist') {
    const next = process.argv[index + 1];
    if (next && !next.startsWith('--')) {
      index += 1;
      options.distDir = next;
    } else {
      options.distDir = 'dist';
    }
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node scripts/audit-csp.mjs [--candidate-script-src <tokens>] [--candidate-style-src <tokens>] [--dist [dir]] [--strict]');
    process.exit(0);
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

const executableAllowlist = [];
const eventHandlerAllowlist = [];

function toPosix(value) {
  return value.replaceAll(path.sep, '/');
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    const rel = toPosix(path.relative(root, filePath));
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.astro', '.tmp'].includes(entry.name)) continue;
      files.push(...await collectFiles(filePath));
    } else if (entry.isFile() && /\.(astro|html)$/.test(entry.name) && !/^src\/data\/_.*\.json$/.test(rel)) {
      files.push(filePath);
    }
  }
  return files;
}

function lineFor(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function parseAttrs(source) {
  const attrs = {};
  const pattern = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const [, name, doubleQuoted, singleQuoted, bare] = match;
    attrs[name.toLowerCase()] = doubleQuoted ?? singleQuoted ?? bare ?? true;
  }
  return attrs;
}

function sha256Csp(value) {
  return `sha256-${crypto.createHash('sha256').update(value).digest('base64')}`;
}

function parseCsp(policy) {
  const directives = new Map();
  for (const part of String(policy ?? '').split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    directives.set(tokens[0].toLowerCase(), tokens.slice(1));
  }
  return directives;
}

function directiveAllowsUnsafeInline(tokens) {
  return tokens.includes("'unsafe-inline'");
}

function findExecutableAllowlist(record) {
  return executableAllowlist.find((entry) => entry.file === record.file && record.content.includes(entry.fingerprint)) ?? null;
}

function findEventAllowlist(record) {
  return eventHandlerAllowlist.find(
    (entry) =>
      entry.file === record.file &&
      entry.attribute === record.attribute &&
      record.tagSource.includes(entry.fingerprint),
  ) ?? null;
}

function scriptType(attrs) {
  const type = typeof attrs.type === 'string' ? attrs.type.trim().toLowerCase() : '';
  if (!type) return 'classic';
  if (type === 'module') return 'module';
  if (type === 'application/ld+json') return 'json-ld';
  if (type.endsWith('+json') || type === 'application/json') return 'data-json';
  return type;
}

function scriptIsExecutable(kind) {
  return kind === 'classic' || kind === 'module' || kind === 'text/javascript' || kind === 'application/javascript';
}

function sourceKindForScript(attrs) {
  if (attrs.src) {
    const src = String(attrs.src);
    if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) return 'self-hosted';
    try {
      const url = new URL(src);
      return url.protocol === 'https:' ? 'third-party' : 'other';
    } catch {
      return 'dynamic';
    }
  }
  return 'inline';
}

function candidateTokens(value) {
  if (!value) return null;
  return value.trim().split(/\s+/).filter(Boolean);
}

function scriptAllowedByCandidate(record, tokens) {
  if (directiveAllowsUnsafeInline(tokens)) return true;
  if (!record.hash) return false;
  return tokens.includes(`'${record.hash}'`) || tokens.includes(record.hash);
}

function styleAllowedByCandidate(record, tokens) {
  if (directiveAllowsUnsafeInline(tokens)) return true;
  if (record.kind === 'style-block' && record.hash) {
    return tokens.includes(`'${record.hash}'`) || tokens.includes(record.hash);
  }
  return false;
}

function auditSourceFile(filePath, text) {
  const rel = toPosix(path.relative(root, filePath));
  const cspMetas = [];
  const scripts = [];
  const eventHandlers = [];
  const styleBlocks = [];
  const styleAttributes = [];

  const tagPattern = /<([A-Za-z][\w:-]*)(\s[\s\S]*?)?>/g;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(text)) !== null) {
    const [tagSource, tagNameRaw, attrText = ''] = tagMatch;
    if (tagSource.startsWith('</')) continue;
    const tagName = tagNameRaw.toLowerCase();
    const attrs = parseAttrs(attrText);
    const line = lineFor(text, tagMatch.index);

    if (tagName === 'meta' && String(attrs['http-equiv'] ?? '').toLowerCase() === 'content-security-policy') {
      cspMetas.push({ file: rel, line, content: String(attrs.content ?? '') });
    }

    for (const [name, value] of Object.entries(attrs)) {
      if (/^on[a-z]+$/.test(name)) {
        eventHandlers.push({
          file: rel,
          line,
          tagName,
          attribute: name,
          value: String(value),
          tagSource,
        });
      }
      if (name === 'style') {
        styleAttributes.push({
          file: rel,
          line,
          tagName,
          value: String(value),
        });
      }
    }
  }

  const selfClosingScriptPattern = /<script\b([^>]*?)\/>/gi;
  let selfClosingScriptMatch;
  while ((selfClosingScriptMatch = selfClosingScriptPattern.exec(text)) !== null) {
    const [full, attrText] = selfClosingScriptMatch;
    const attrs = parseAttrs(attrText);
    const kind = scriptType(attrs);
    const sourceKind = sourceKindForScript(attrs);
    const executable = sourceKind === 'inline' && scriptIsExecutable(kind);
    const dynamic = Boolean(attrs['define:vars'] || attrs['set:html']);
    scripts.push({
      file: rel,
      line: lineFor(text, selfClosingScriptMatch.index),
      attrs,
      type: kind,
      sourceKind,
      executable,
      dynamic,
      content: '',
      hash: null,
      tagSource: full.slice(0, Math.min(240, full.length)).replace(/\s+/g, ' ').trim(),
    });
  }

  const scriptPattern = /<script\b((?:(?!\/>)[^>])*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptPattern.exec(text)) !== null) {
    const [full, attrText, content] = scriptMatch;
    const attrs = parseAttrs(attrText);
    const kind = scriptType(attrs);
    const sourceKind = sourceKindForScript(attrs);
    const executable = sourceKind === 'inline' && scriptIsExecutable(kind);
    const dynamic = Boolean(attrs['define:vars'] || attrs['set:html']);
    scripts.push({
      file: rel,
      line: lineFor(text, scriptMatch.index),
      attrs,
      type: kind,
      sourceKind,
      executable,
      dynamic,
      content,
      hash: executable && !dynamic && content.trim() ? sha256Csp(content) : null,
      tagSource: full.slice(0, Math.min(240, full.length)).replace(/\s+/g, ' ').trim(),
    });
  }

  const stylePattern = /<style\b([^>]*)>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = stylePattern.exec(text)) !== null) {
    const attrs = parseAttrs(styleMatch[1]);
    styleBlocks.push({
      kind: 'style-block',
      file: rel,
      line: lineFor(text, styleMatch.index),
      dynamic: Boolean(attrs['set:html']),
      bytes: styleMatch[2].length,
      attrs,
      hash: !attrs['set:html'] && styleMatch[2].trim() ? sha256Csp(styleMatch[2]) : null,
    });
  }

  return { cspMetas, scripts, eventHandlers, styleBlocks, styleAttributes };
}

const scanRoots = options.distDir ? [options.distDir] : sourceDirs;
const files = (await Promise.all(scanRoots.map((dir) => collectFiles(path.resolve(root, dir))))).flat();
if (options.distDir && files.length === 0) {
  throw new Error(`No built HTML files found under ${options.distDir}. Run the build before using --dist.`);
}
const sourceAudits = [];
for (const filePath of files) {
  sourceAudits.push(auditSourceFile(filePath, await fs.readFile(filePath, 'utf8')));
}

const cspMetas = sourceAudits.flatMap((audit) => audit.cspMetas);
const scripts = sourceAudits.flatMap((audit) => audit.scripts);
const eventHandlers = sourceAudits.flatMap((audit) => audit.eventHandlers);
const styleBlocks = sourceAudits.flatMap((audit) => audit.styleBlocks);
const styleAttributes = sourceAudits.flatMap((audit) => audit.styleAttributes);
const activeCsp = cspMetas[0]?.content ?? '';
const directives = parseCsp(activeCsp);
const scriptSrc = directives.get('script-src') ?? directives.get('default-src') ?? [];
const styleSrc = directives.get('style-src') ?? directives.get('default-src') ?? [];
const executableInline = scripts.filter((script) => script.executable);
const jsonDataScripts = scripts.filter((script) => script.type === 'json-ld' || script.type === 'data-json');
const externalScripts = scripts.filter((script) => script.attrs.src);
const selfHostedScripts = externalScripts.filter((script) => script.sourceKind === 'self-hosted');
const thirdPartyScripts = externalScripts.filter((script) => script.sourceKind === 'third-party');

for (const script of executableInline) script.allowlist = findExecutableAllowlist(script);
for (const handler of eventHandlers) handler.allowlist = findEventAllowlist(handler);

const unknownExecutable = executableInline.filter((script) => !script.allowlist);
const unknownEventHandlers = eventHandlers.filter((handler) => !handler.allowlist);
const candidate = candidateTokens(options.candidateScriptSrc);
const candidateStyle = candidateTokens(options.candidateStyleSrc);
const candidateBlockers = candidate
  ? [
      ...executableInline
        .filter((script) => !scriptAllowedByCandidate(script, candidate))
        .map((script) => ({ kind: 'inline-script', record: script })),
      ...eventHandlers
        .filter(() => !directiveAllowsUnsafeInline(candidate))
        .map((handler) => ({ kind: 'event-handler', record: handler })),
    ]
  : [];
const candidateStyleBlockers = candidateStyle
  ? [
      ...styleBlocks
        .filter((style) => !styleAllowedByCandidate(style, candidateStyle))
        .map((style) => ({ kind: 'style-block', record: style })),
      ...styleAttributes
        .filter((style) => !styleAllowedByCandidate({ ...style, kind: 'style-attribute' }, candidateStyle))
        .map((style) => ({ kind: 'style-attribute', record: style })),
    ]
  : [];

function formatLocation(record) {
  return `${record.file}:${record.line}`;
}

function printCandidateBlockers(blockers, labelFor, max = 80) {
  const shown = blockers.slice(0, max);
  for (const blocker of shown) {
    console.log(`  - ${blocker.kind}: ${formatLocation(blocker.record)} ${labelFor(blocker)}`);
  }
  if (blockers.length > shown.length) {
    console.log(`  ... ${blockers.length - shown.length} more blocker(s) omitted`);
  }
}

function printScript(script) {
  const status = script.allowlist ? 'known' : 'unknown';
  const hash = script.hash ? ` hash='${script.hash}'` : ' hash=dynamic';
  const label = script.allowlist?.label ?? 'unclassified inline script';
  console.log(`  - ${formatLocation(script)} ${status}: ${label};${hash}`);
  if (script.allowlist?.decision) console.log(`    decision: ${script.allowlist.decision}`);
}

function printEvent(handler) {
  const status = handler.allowlist ? 'known' : 'unknown';
  const label = handler.allowlist?.label ?? `${handler.tagName}.${handler.attribute}`;
  console.log(`  - ${formatLocation(handler)} ${status}: ${label}`);
  if (handler.allowlist?.decision) console.log(`    decision: ${handler.allowlist.decision}`);
}

console.log('CSP preflight audit');
console.log(`  ${options.distDir ? 'built HTML files' : 'source files'} scanned: ${files.length}`);
console.log(`  CSP meta tags: ${cspMetas.length}`);
if (activeCsp) console.log(`  active CSP: ${activeCsp}`);
console.log(`  script-src: ${scriptSrc.join(' ') || '(inherits default-src)'}`);
console.log(`  style-src: ${styleSrc.join(' ') || '(inherits default-src)'}`);
console.log(`  script unsafe-inline active: ${directiveAllowsUnsafeInline(scriptSrc) ? 'yes' : 'no'}`);
console.log(`  style unsafe-inline active: ${directiveAllowsUnsafeInline(styleSrc) ? 'yes' : 'no'}`);
console.log('');
console.log('Inline script inventory');
console.log(`  executable inline scripts: ${executableInline.length}`);
console.log(`  JSON-LD/data script blocks: ${jsonDataScripts.length}`);
console.log(`  self-hosted external scripts: ${selfHostedScripts.length}`);
console.log(`  third-party external scripts: ${thirdPartyScripts.length}`);
for (const script of executableInline) printScript(script);
console.log('');
console.log('Inline handler and style inventory');
console.log(`  inline event handlers: ${eventHandlers.length}`);
for (const handler of eventHandlers) printEvent(handler);
console.log(`  inline style blocks: ${styleBlocks.length}`);
console.log(`  inline style attributes: ${styleAttributes.length}`);
console.log('');
console.log('Current unsafe-inline dependencies');
console.log(`  script-src unsafe-inline required today: ${executableInline.length + eventHandlers.length > 0 ? 'yes' : 'no'}`);
console.log(`  style-src unsafe-inline required today: ${styleBlocks.length + styleAttributes.length > 0 ? 'yes' : 'no'}`);

if (candidate) {
  console.log('');
  console.log(`Candidate script-src: ${candidate.join(' ')}`);
  if (candidateBlockers.length === 0) {
    console.log('  PASS - candidate allows all current executable inline script surfaces.');
  } else {
    console.log(`  BLOCKED - ${candidateBlockers.length} current executable inline surface(s) would be blocked.`);
    printCandidateBlockers(candidateBlockers, (blocker) => {
      const record = blocker.record;
      return blocker.kind === 'inline-script'
        ? record.allowlist?.label ?? 'unclassified inline script'
        : record.allowlist?.label ?? `${record.tagName}.${record.attribute}`;
    });
  }
}

if (candidateStyle) {
  console.log('');
  console.log(`Candidate style-src: ${candidateStyle.join(' ')}`);
  if (candidateStyleBlockers.length === 0) {
    console.log('  PASS - candidate allows all current inline style surfaces.');
  } else {
    console.log(`  BLOCKED - ${candidateStyleBlockers.length} current inline style surface(s) would be blocked.`);
    printCandidateBlockers(candidateStyleBlockers, (blocker) => {
      const record = blocker.record;
      if (blocker.kind === 'style-block') {
        return record.hash ? `hash='${record.hash}'` : 'hash=dynamic';
      }
      return `${record.tagName}.style`;
    });
  }
}

const failures = [];
if (options.strict && unknownExecutable.length > 0) {
  failures.push(`${unknownExecutable.length} executable inline script(s) are outside the CSP audit allowlist.`);
}
if (options.strict && unknownEventHandlers.length > 0) {
  failures.push(`${unknownEventHandlers.length} inline event handler(s) are outside the CSP audit allowlist.`);
}
if (options.strict && directiveAllowsUnsafeInline(scriptSrc)) {
  failures.push("script-src still allows 'unsafe-inline'.");
}
if (options.strict && candidate && candidateBlockers.length > 0) {
  failures.push(`candidate script-src ${candidate.join(' ')} would block ${candidateBlockers.length} current inline surface(s).`);
}
if (options.strict && candidateStyle && candidateStyleBlockers.length > 0) {
  failures.push(`candidate style-src ${candidateStyle.join(' ')} would block ${candidateStyleBlockers.length} current inline style surface(s).`);
}

if (failures.length > 0) {
  console.error('');
  console.error('CSP preflight audit failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('');
console.log('CSP preflight audit passed.');
