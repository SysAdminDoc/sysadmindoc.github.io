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
  candidateStyleElemSrc: null,
  candidateStyleAttrSrc: null,
  activeStyleElemSrc: false,
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
  } else if (arg === '--candidate-style-src-elem') {
    index += 1;
    options.candidateStyleElemSrc = process.argv[index];
  } else if (arg.startsWith('--candidate-style-src-elem=')) {
    options.candidateStyleElemSrc = arg.slice('--candidate-style-src-elem='.length);
  } else if (arg === '--active-style-src-elem') {
    options.activeStyleElemSrc = true;
  } else if (arg === '--candidate-style-src-attr') {
    index += 1;
    options.candidateStyleAttrSrc = process.argv[index];
  } else if (arg.startsWith('--candidate-style-src-attr=')) {
    options.candidateStyleAttrSrc = arg.slice('--candidate-style-src-attr='.length);
  } else if (arg === '--dist') {
    const next = process.argv[index + 1];
    if (next && !next.startsWith('--')) {
      index += 1;
      options.distDir = next;
    } else {
      options.distDir = 'dist';
    }
  } else if (arg === '--help' || arg === '-h') {
    console.log('Usage: node scripts/audit-csp.mjs [--candidate-script-src <tokens>] [--candidate-style-src <tokens>] [--candidate-style-src-elem <tokens>] [--active-style-src-elem] [--candidate-style-src-attr <tokens>] [--dist [dir]] [--strict]');
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
  return `sha256-${crypto.createHash('sha256').update(value.replace(/\r\n?/g, '\n')).digest('base64')}`;
}

function extractSingleQuotedConst(text, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`const\\s+${escapedName}\\s*=\\s*'([^']*)';`));
  return match?.[1] ?? null;
}

async function resolveGeneratedCsp(filePath, text, value) {
  if (value !== '{contentSecurityPolicy}') return value;

  const policyTemplate = text.match(/const\s+contentSecurityPolicy\s*=\s*`([\s\S]*?)`;/)?.[1] ?? null;
  const criticalImport = text.match(/import\s+criticalCss\s+from\s+['"]([^'"]+)\?raw['"];/)?.[1] ?? null;
  const noJsRevealCss = extractSingleQuotedConst(text, 'noJsRevealCss');
  if (!policyTemplate || !criticalImport || !noJsRevealCss) return value;

  const criticalCssPath = path.resolve(path.dirname(filePath), criticalImport);
  const criticalCss = await fs.readFile(criticalCssPath, 'utf8').catch(() => null);
  if (criticalCss === null) return value;

  const styleElemSrc = ["'self'", `'${sha256Csp(criticalCss)}'`, `'${sha256Csp(noJsRevealCss)}'`].join(' ');
  return policyTemplate
    .replace('${scriptSrc}', "'self'")
    .replace('${styleSrc}', "'self'")
    .replace('${styleElemSrc}', styleElemSrc)
    .replace('${styleAttrSrc}', "'none'");
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

function effectiveDirective(directives, name, fallbacks = []) {
  if (directives.has(name)) return { tokens: directives.get(name), source: name };
  for (const fallback of fallbacks) {
    if (directives.has(fallback)) return { tokens: directives.get(fallback), source: fallback };
  }
  return { tokens: [], source: null };
}

function directiveLabel(name, directive) {
  const tokens = directive.tokens.join(' ') || '(none)';
  if (!directive.source || directive.source === name) return tokens;
  return `${tokens} (inherits ${directive.source})`;
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
    return sourceKindForUrl(String(attrs.src)).kind;
  }
  return 'inline';
}

function sourceKindForUrl(value) {
  const urlValue = String(value ?? '');
  if (urlValue.startsWith('/') || urlValue.startsWith('./') || urlValue.startsWith('../')) {
    return { kind: 'self-hosted', value: urlValue };
  }
  if (/^\{[^}]+\}$/.test(urlValue)) {
    return { kind: 'dynamic-self', value: urlValue };
  }
  try {
    const url = new URL(urlValue);
    return { kind: url.protocol === 'https:' ? 'third-party' : 'other', value: urlValue, origin: url.origin, protocol: url.protocol };
  } catch {
    return { kind: 'dynamic', value: urlValue };
  }
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

function styleLinkAllowedByCandidate(record, tokens) {
  if (tokens.includes('*')) return true;
  if ((record.sourceKind === 'self-hosted' || record.sourceKind === 'dynamic-self') && tokens.includes("'self'")) return true;
  if (record.sourceKind === 'third-party' && record.protocol && tokens.includes(record.protocol)) return true;
  if (record.sourceKind === 'third-party' && record.origin && tokens.includes(record.origin)) return true;
  return false;
}

function styleAttributeAllowedByCandidate(_record, tokens) {
  return directiveAllowsUnsafeInline(tokens);
}

async function auditSourceFile(filePath, text) {
  const rel = toPosix(path.relative(root, filePath));
  const cspMetas = [];
  const scripts = [];
  const eventHandlers = [];
  const styleBlocks = [];
  const styleAttributes = [];
  const styleLinks = [];

  const tagPattern = /<([A-Za-z][\w:-]*)(\s[\s\S]*?)?>/g;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(text)) !== null) {
    const [tagSource, tagNameRaw, attrText = ''] = tagMatch;
    if (tagSource.startsWith('</')) continue;
    const tagName = tagNameRaw.toLowerCase();
    const attrs = parseAttrs(attrText);
    const line = lineFor(text, tagMatch.index);

    if (tagName === 'meta' && String(attrs['http-equiv'] ?? '').toLowerCase() === 'content-security-policy') {
      cspMetas.push({ file: rel, line, content: await resolveGeneratedCsp(filePath, text, String(attrs.content ?? '')) });
    }

    if (tagName === 'link') {
      const relValue = String(attrs.rel ?? '').toLowerCase();
      const asValue = String(attrs.as ?? '').toLowerCase();
      const isStylesheet = relValue.split(/\s+/).includes('stylesheet');
      const isStylePreload = relValue.split(/\s+/).includes('preload') && asValue === 'style';
      if (isStylesheet || isStylePreload) {
        const href = String(attrs.href ?? '');
        const source = sourceKindForUrl(href);
        styleLinks.push({
          kind: isStylePreload ? 'style-preload' : 'style-link',
          file: rel,
          line,
          tagName,
          href,
          rel: relValue,
          sourceKind: source.kind,
          origin: source.origin,
          protocol: source.protocol,
          tagSource: tagSource.slice(0, Math.min(240, tagSource.length)).replace(/\s+/g, ' ').trim(),
        });
      }
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

  return { file: rel, cspMetas, scripts, eventHandlers, styleBlocks, styleAttributes, styleLinks };
}

async function collectRuntimeStyleFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.astro', '.tmp'].includes(entry.name)) continue;
      files.push(...await collectRuntimeStyleFiles(filePath));
    } else if (entry.isFile() && /\.(js|mjs|ts)$/.test(entry.name)) {
      files.push(filePath);
    }
  }
  return files;
}

function auditRuntimeStyleFile(filePath, text) {
  const rel = toPosix(path.relative(root, filePath));
  const cssTextWrites = [];
  const setAttributeStyleWrites = [];
  const directStylePropertyReferences = [];

  const cssTextPattern = /\.style\.cssText\s*=/g;
  let cssTextMatch;
  while ((cssTextMatch = cssTextPattern.exec(text)) !== null) {
    cssTextWrites.push({
      kind: 'style-cssText',
      file: rel,
      line: lineFor(text, cssTextMatch.index),
      label: 'style.cssText write',
    });
  }

  const setAttributePattern = /\.setAttribute\(\s*['"]style['"]/g;
  let setAttributeMatch;
  while ((setAttributeMatch = setAttributePattern.exec(text)) !== null) {
    setAttributeStyleWrites.push({
      kind: 'style-setAttribute',
      file: rel,
      line: lineFor(text, setAttributeMatch.index),
      label: 'setAttribute("style") write',
    });
  }

  const directStylePattern = /\.style\.(?!cssText\b)([A-Za-z_$][\w$-]*)/g;
  let directStyleMatch;
  while ((directStyleMatch = directStylePattern.exec(text)) !== null) {
    directStylePropertyReferences.push({
      kind: 'style-property',
      file: rel,
      line: lineFor(text, directStyleMatch.index),
      property: directStyleMatch[1],
    });
  }

  return { cssTextWrites, setAttributeStyleWrites, directStylePropertyReferences };
}

const scanRoots = options.distDir ? [options.distDir] : sourceDirs;
const files = (await Promise.all(scanRoots.map((dir) => collectFiles(path.resolve(root, dir))))).flat();
if (options.distDir && files.length === 0) {
  throw new Error(`No built HTML files found under ${options.distDir}. Run the build before using --dist.`);
}
const sourceAudits = [];
for (const filePath of files) {
  sourceAudits.push(await auditSourceFile(filePath, await fs.readFile(filePath, 'utf8')));
}
const runtimeStyleRoots = [path.resolve(root, 'public', 'scripts')];
const runtimeStyleFiles = (await Promise.all(runtimeStyleRoots.map((dir) => collectRuntimeStyleFiles(dir)))).flat();
const runtimeStyleAudits = [];
for (const filePath of runtimeStyleFiles) {
  runtimeStyleAudits.push(auditRuntimeStyleFile(filePath, await fs.readFile(filePath, 'utf8')));
}

const cspMetas = sourceAudits.flatMap((audit) => audit.cspMetas);
const scripts = sourceAudits.flatMap((audit) => audit.scripts);
const eventHandlers = sourceAudits.flatMap((audit) => audit.eventHandlers);
const styleBlocks = sourceAudits.flatMap((audit) => audit.styleBlocks);
const styleAttributes = sourceAudits.flatMap((audit) => audit.styleAttributes);
const styleLinks = sourceAudits.flatMap((audit) => audit.styleLinks);
const cssTextWrites = runtimeStyleAudits.flatMap((audit) => audit.cssTextWrites);
const setAttributeStyleWrites = runtimeStyleAudits.flatMap((audit) => audit.setAttributeStyleWrites);
const directStylePropertyReferences = runtimeStyleAudits.flatMap((audit) => audit.directStylePropertyReferences);
const activeCsp = cspMetas[0]?.content ?? '';
const cspPolicies = new Set(cspMetas.map((meta) => meta.content));
const filesWithoutCsp = options.distDir ? sourceAudits.filter((audit) => audit.cspMetas.length === 0) : [];
const filesWithMultipleCsp = options.distDir ? sourceAudits.filter((audit) => audit.cspMetas.length > 1) : [];
const divergentCspMetas = options.distDir && activeCsp
  ? cspMetas.filter((meta) => meta.content !== activeCsp)
  : [];
const directives = parseCsp(activeCsp);
const scriptDirective = effectiveDirective(directives, 'script-src', ['default-src']);
const styleDirective = effectiveDirective(directives, 'style-src', ['default-src']);
const styleElemDirective = effectiveDirective(directives, 'style-src-elem', ['style-src', 'default-src']);
const styleAttrDirective = effectiveDirective(directives, 'style-src-attr', ['style-src', 'default-src']);
const scriptSrc = scriptDirective.tokens;
const styleSrc = styleDirective.tokens;
const styleElemSrc = styleElemDirective.tokens;
const styleAttrSrc = styleAttrDirective.tokens;
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
const candidateStyleElem = options.activeStyleElemSrc ? styleElemSrc : candidateTokens(options.candidateStyleElemSrc);
const candidateStyleAttr = candidateTokens(options.candidateStyleAttrSrc);
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
const candidateStyleElemBlockers = candidateStyleElem
  ? [
      ...styleBlocks
        .filter((style) => !styleAllowedByCandidate(style, candidateStyleElem))
        .map((style) => ({ kind: 'style-block', record: style })),
      ...styleLinks
        .filter((link) => !styleLinkAllowedByCandidate(link, candidateStyleElem))
        .map((link) => ({ kind: link.kind, record: link })),
    ]
  : [];
const candidateStyleAttrBlockers = candidateStyleAttr
  ? [
      ...styleAttributes
        .filter((style) => !styleAttributeAllowedByCandidate(style, candidateStyleAttr))
        .map((style) => ({ kind: 'style-attribute', record: style })),
      ...cssTextWrites
        .filter((write) => !styleAttributeAllowedByCandidate(write, candidateStyleAttr))
        .map((write) => ({ kind: 'style-cssText', record: write })),
      ...setAttributeStyleWrites
        .filter((write) => !styleAttributeAllowedByCandidate(write, candidateStyleAttr))
        .map((write) => ({ kind: 'style-setAttribute', record: write })),
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

function summarizePaths(records, getPath = (record) => record.file, max = 8) {
  const paths = records.map(getPath);
  const shown = paths.slice(0, max).join(', ');
  if (paths.length <= max) return shown;
  return `${shown}, ... ${paths.length - max} more`;
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
if (options.distDir) {
  console.log(`  files with one CSP meta: ${files.length - filesWithoutCsp.length - filesWithMultipleCsp.length}/${files.length}`);
  console.log(`  unique CSP policies: ${cspPolicies.size}`);
}
if (activeCsp) console.log(`  active CSP: ${activeCsp}`);
console.log(`  script-src: ${directiveLabel('script-src', scriptDirective)}`);
console.log(`  style-src: ${directiveLabel('style-src', styleDirective)}`);
console.log(`  style-src-elem: ${directiveLabel('style-src-elem', styleElemDirective)}`);
console.log(`  style-src-attr: ${directiveLabel('style-src-attr', styleAttrDirective)}`);
console.log(`  script unsafe-inline active: ${directiveAllowsUnsafeInline(scriptSrc) ? 'yes' : 'no'}`);
console.log(`  style unsafe-inline active: ${directiveAllowsUnsafeInline(styleSrc) ? 'yes' : 'no'}`);
console.log(`  style element unsafe-inline active: ${directiveAllowsUnsafeInline(styleElemSrc) ? 'yes' : 'no'}`);
console.log(`  style attribute unsafe-inline active: ${directiveAllowsUnsafeInline(styleAttrSrc) ? 'yes' : 'no'}`);
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
console.log(`  stylesheet/preload links: ${styleLinks.length}`);
console.log(`  runtime style.cssText writes: ${cssTextWrites.length}`);
console.log(`  runtime setAttribute("style") writes: ${setAttributeStyleWrites.length}`);
console.log(`  runtime direct style property references: ${directStylePropertyReferences.length}`);
console.log('');
console.log('Current unsafe-inline dependencies');
console.log(`  script-src unsafe-inline required today: ${executableInline.length + eventHandlers.length > 0 ? 'yes' : 'no'}`);
console.log(`  style-src unsafe-inline required today: ${styleBlocks.length + styleAttributes.length > 0 ? 'yes' : 'no'}`);
console.log(`  style-src-elem unsafe-inline required today: ${styleBlocks.length > 0 ? 'yes' : 'no'}`);
console.log(`  style-src-attr unsafe-inline required today: ${styleAttributes.length + cssTextWrites.length + setAttributeStyleWrites.length > 0 ? 'yes' : 'no'}`);

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

if (candidateStyleElem) {
  console.log('');
  console.log(`${options.activeStyleElemSrc ? 'Active' : 'Candidate'} style-src-elem: ${candidateStyleElem.join(' ')}`);
  if (candidateStyleElemBlockers.length === 0) {
    console.log(`  PASS - ${options.activeStyleElemSrc ? 'active policy' : 'candidate'} allows all current style element/link surfaces.`);
  } else {
    console.log(`  BLOCKED - ${candidateStyleElemBlockers.length} current style element/link surface(s) would be blocked.`);
    printCandidateBlockers(candidateStyleElemBlockers, (blocker) => {
      const record = blocker.record;
      if (blocker.kind === 'style-block') {
        return record.hash ? `hash='${record.hash}'` : 'hash=dynamic';
      }
      return `${record.rel || 'stylesheet'} ${record.sourceKind}`;
    });
  }
}

if (candidateStyleAttr) {
  console.log('');
  console.log(`Candidate style-src-attr: ${candidateStyleAttr.join(' ')}`);
  if (candidateStyleAttrBlockers.length === 0) {
    console.log('  PASS - candidate allows all current style attribute surfaces.');
  } else {
    console.log(`  BLOCKED - ${candidateStyleAttrBlockers.length} current style attribute surface(s) would be blocked.`);
    printCandidateBlockers(candidateStyleAttrBlockers, (blocker) => {
      const record = blocker.record;
      if (blocker.kind === 'style-attribute') return `${record.tagName}.style`;
      return record.label;
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
if (options.strict && options.distDir && filesWithoutCsp.length > 0) {
  failures.push(`${filesWithoutCsp.length} built HTML file(s) are missing a CSP meta tag: ${summarizePaths(filesWithoutCsp)}.`);
}
if (options.strict && options.distDir && filesWithMultipleCsp.length > 0) {
  failures.push(`${filesWithMultipleCsp.length} built HTML file(s) have multiple CSP meta tags: ${summarizePaths(filesWithMultipleCsp)}.`);
}
if (options.strict && options.distDir && divergentCspMetas.length > 0) {
  failures.push(`${divergentCspMetas.length} built CSP meta tag(s) differ from the active policy: ${summarizePaths(divergentCspMetas)}.`);
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
if (options.strict && options.activeStyleElemSrc && styleElemDirective.source !== 'style-src-elem') {
  failures.push('active style-src-elem directive is missing.');
}
if (options.strict && options.activeStyleElemSrc && directiveAllowsUnsafeInline(styleElemSrc)) {
  failures.push("active style-src-elem still allows 'unsafe-inline'.");
}
if (options.strict && candidateStyleElem && candidateStyleElemBlockers.length > 0) {
  const styleElemLabel = options.activeStyleElemSrc ? 'active style-src-elem' : 'candidate style-src-elem';
  failures.push(`${styleElemLabel} ${candidateStyleElem.join(' ')} would block ${candidateStyleElemBlockers.length} current style element/link surface(s).`);
}
if (options.strict && candidateStyleAttr && candidateStyleAttrBlockers.length > 0) {
  failures.push(`candidate style-src-attr ${candidateStyleAttr.join(' ')} would block ${candidateStyleAttrBlockers.length} current style attribute surface(s).`);
}
if (options.strict && !directives.has('form-action')) {
  failures.push("form-action directive is missing. form-action has no default-src fallback; omitting it leaves form destinations unrestricted.");
}

if (failures.length > 0) {
  console.error('');
  console.error('CSP preflight audit failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('');
console.log('CSP preflight audit passed.');
