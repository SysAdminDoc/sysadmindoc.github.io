import fs from 'node:fs/promises';
import path from 'node:path';

export const defaultSurfaceAllowlist = {
  classes: [
    /^archive-tone-/,
    'cmdk-dot',
    /^cmdk-dot-/,
    /^hm-/,
    /^lang-accent-/,
    /^lang-tone-/,
    /^language-/,
    /^nav-context-/,
    /^pagefind-/,
    /^shiki-[cf]-/,
    /^sk-tone-/,
    /^tag-size-/,
    /^timeline-marker-/,
    /^timeline-type-/,
    /^(cpp|cs|ext|fork|guide|kt|media|other|ps|py|sec|web)$/,
    /^(route-home|route-interior)$/,
  ],
  ids: [],
  dataAttrs: [
    /^data-pagefind-/,
    'data-theme',
  ],
};

function toPosix(value) {
  return value.replaceAll(path.sep, '/');
}

function lineFor(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitSelectorList(value) {
  const selectors = [];
  let start = 0;
  let depth = 0;
  let quote = '';
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const prev = value[index - 1];
    if (quote) {
      if (char === quote && prev !== '\\') quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(' || char === '[') depth += 1;
    if ((char === ')' || char === ']') && depth > 0) depth -= 1;
    if (char === ',' && depth === 0) {
      selectors.push(value.slice(start, index));
      start = index + 1;
    }
  }
  selectors.push(value.slice(start));
  return selectors;
}

function normalizeSelector(selector) {
  return selector
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, '$1');
}

export function extractCssSelectorRecords(css, file = 'inline.css') {
  const records = [];
  const cleaned = stripCssComments(css);
  const rulePattern = /([^{}]+)\{/g;
  let match;
  while ((match = rulePattern.exec(cleaned)) !== null) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('@')) continue;
    if (/^(from|to|\d+(?:\.\d+)?%)$/.test(raw)) continue;
    for (const selector of splitSelectorList(raw)) {
      const normalized = normalizeSelector(selector);
      if (normalized) {
        records.push({
          file,
          line: lineFor(cleaned, match.index),
          selector: normalized,
        });
      }
    }
  }
  return records;
}

function stripSelectorAttributes(selector) {
  return selector.replace(/\[[^\]]*\]/g, ' ');
}

export function selectorAtoms(selector) {
  const dataAttrs = [];
  const dataPattern = /\[\s*(data-[A-Za-z0-9_-]+)/g;
  let dataMatch;
  while ((dataMatch = dataPattern.exec(selector)) !== null) dataAttrs.push(dataMatch[1]);

  const withoutAttributes = stripSelectorAttributes(selector);
  const classes = [];
  const classPattern = /(^|[^A-Za-z0-9_-])\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g;
  let classMatch;
  while ((classMatch = classPattern.exec(withoutAttributes)) !== null) classes.push(classMatch[2]);

  const ids = [];
  const idPattern = /(^|[^A-Za-z0-9_-])#([A-Za-z_][A-Za-z0-9_-]*)/g;
  let idMatch;
  while ((idMatch = idPattern.exec(withoutAttributes)) !== null) ids.push(idMatch[2]);

  return { classes, ids, dataAttrs };
}

function isAllowed(kind, name, allowlist = defaultSurfaceAllowlist) {
  const entries = allowlist[kind] ?? [];
  return entries.some((entry) => {
    if (typeof entry === 'string') return entry === name;
    if (entry instanceof RegExp) return entry.test(name);
    return false;
  });
}

function addWords(set, value) {
  String(value ?? '')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      if (/^-?[A-Za-z_][A-Za-z0-9_-]*$/.test(token)) set.add(token);
    });
}

function quotedFragments(value) {
  const fragments = [];
  const pattern = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;
  while ((match = pattern.exec(value)) !== null) fragments.push(match[2]);
  return fragments.length > 0 ? fragments : [value];
}

function addClassFragments(surface, value) {
  for (const fragment of quotedFragments(value)) {
    const withoutTemplates = fragment.replace(/\$\{[\s\S]*?\}/g, ' ');
    addWords(surface.classes, withoutTemplates);
  }
}

function addIdFragment(surface, value) {
  for (const fragment of quotedFragments(value)) {
    const cleaned = fragment.replace(/\$\{[\s\S]*?\}/g, '').trim();
    if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(cleaned)) surface.ids.add(cleaned);
  }
}

function readAttributeValue(source, startIndex) {
  let index = startIndex;
  while (index < source.length && /\s/.test(source[index])) index += 1;
  if (source[index] !== '=') return { value: '', end: index };
  index += 1;
  while (index < source.length && /\s/.test(source[index])) index += 1;
  const first = source[index];
  if (first === '"' || first === "'" || first === '`') {
    const quote = first;
    index += 1;
    const start = index;
    while (index < source.length) {
      if (source[index] === quote && source[index - 1] !== '\\') {
        return { value: source.slice(start, index), end: index + 1 };
      }
      index += 1;
    }
    return { value: source.slice(start), end: index };
  }
  if (first === '{') {
    index += 1;
    const start = index;
    let depth = 1;
    let quote = '';
    while (index < source.length) {
      const char = source[index];
      const prev = source[index - 1];
      if (quote) {
        if (char === quote && prev !== '\\') quote = '';
        index += 1;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        index += 1;
        continue;
      }
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;
      if (depth === 0) return { value: source.slice(start, index), end: index + 1 };
      index += 1;
    }
    return { value: source.slice(start), end: index };
  }
  const start = index;
  while (index < source.length && !/[\s>]/.test(source[index])) index += 1;
  return { value: source.slice(start, index), end: index };
}

function extractAttributeValues(text, attrNamePattern) {
  const values = [];
  const pattern = new RegExp(`\\b${attrNamePattern.source}\\b`, 'g');
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const { value, end } = readAttributeValue(text, pattern.lastIndex);
    if (value) values.push(value);
    pattern.lastIndex = Math.max(pattern.lastIndex, end);
  }
  return values;
}

function datasetNameToAttr(name) {
  return `data-${name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;
}

export function collectSourceSurface(sourceTexts) {
  const surface = {
    classes: new Set(),
    ids: new Set(),
    dataAttrs: new Set(),
  };

  for (const [relativePath, text] of sourceTexts.entries()) {
    for (const classValue of extractAttributeValues(text, /class(?::list)?/)) {
      addClassFragments(surface, classValue);
    }

    const classConstPattern = /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*Class[A-Za-z_$\w]*\s*=\s*([^;\n]+)/g;
    let classConstMatch;
    while ((classConstMatch = classConstPattern.exec(text)) !== null) addClassFragments(surface, classConstMatch[1]);

    const classNamePattern = /\.className\s*=\s*(["'`][\s\S]*?["'`])/g;
    let classNameMatch;
    while ((classNameMatch = classNamePattern.exec(text)) !== null) addClassFragments(surface, classNameMatch[1]);

    const classListPattern = /\.classList\.(?:add|remove|toggle|replace)\(([\s\S]*?)\)/g;
    let classListMatch;
    while ((classListMatch = classListPattern.exec(text)) !== null) {
      for (const fragment of quotedFragments(classListMatch[1])) addWords(surface.classes, fragment);
    }

    const setClassPattern = /\.setAttribute\(\s*["']class["']\s*,\s*(["'`][\s\S]*?["'`])/g;
    let setClassMatch;
    while ((setClassMatch = setClassPattern.exec(text)) !== null) addClassFragments(surface, setClassMatch[1]);

    for (const idValue of extractAttributeValues(text, /id/)) {
      addIdFragment(surface, idValue);
    }

    const setIdPattern = /\.setAttribute\(\s*["']id["']\s*,\s*(["'`][\s\S]*?["'`])/g;
    let setIdMatch;
    while ((setIdMatch = setIdPattern.exec(text)) !== null) addIdFragment(surface, setIdMatch[1]);

    const idWritePattern = /\.id\s*=\s*(["'`][\s\S]*?["'`])/g;
    let idWriteMatch;
    while ((idWriteMatch = idWritePattern.exec(text)) !== null) addIdFragment(surface, idWriteMatch[1]);

    const tagPattern = /<[^>]+>/g;
    let tagMatch;
    while ((tagMatch = tagPattern.exec(text)) !== null) {
      const tagSource = tagMatch[0];
      const dataAttrPattern = /(?:^|\s)(data-[A-Za-z0-9_-]+)(?=\s|=|>|\/)/g;
      let dataAttrMatch;
      while ((dataAttrMatch = dataAttrPattern.exec(tagSource)) !== null) surface.dataAttrs.add(dataAttrMatch[1]);
    }
    if (!relativePath.startsWith('public/scripts/')) {
      const sourceDataAttrPattern = /\b(data-[A-Za-z0-9_-]+)\s*=/g;
      let sourceDataAttrMatch;
      while ((sourceDataAttrMatch = sourceDataAttrPattern.exec(text)) !== null) {
        surface.dataAttrs.add(sourceDataAttrMatch[1]);
      }
    }

    const setDataPattern = /\.setAttribute\(\s*["'](data-[A-Za-z0-9_-]+)["']/g;
    let setDataMatch;
    while ((setDataMatch = setDataPattern.exec(text)) !== null) surface.dataAttrs.add(setDataMatch[1]);

    const datasetWritePattern = /\.dataset\.([A-Za-z_$][\w$]*)\s*=/g;
    let datasetWriteMatch;
    while ((datasetWriteMatch = datasetWritePattern.exec(text)) !== null) {
      surface.dataAttrs.add(datasetNameToAttr(datasetWriteMatch[1]));
    }
  }

  return surface;
}

function missingAtomFindings(record, atoms, surface, allowlist) {
  const findings = [];
  for (const name of atoms.classes) {
    if (!surface.classes.has(name) && !isAllowed('classes', name, allowlist)) {
      findings.push({ ...record, kind: 'class', name });
    }
  }
  for (const name of atoms.ids) {
    if (!surface.ids.has(name) && !isAllowed('ids', name, allowlist)) {
      findings.push({ ...record, kind: 'id', name });
    }
  }
  for (const name of atoms.dataAttrs) {
    if (!surface.dataAttrs.has(name) && !isAllowed('dataAttrs', name, allowlist)) {
      findings.push({ ...record, kind: 'data attribute', name });
    }
  }
  return findings;
}

export function missingSelectorAtoms(selector, surface, allowlist = defaultSurfaceAllowlist) {
  return missingAtomFindings(
    { file: 'inline.css', line: 1, selector },
    selectorAtoms(selector),
    surface,
    allowlist,
  );
}

function dedupeFindings(findings) {
  const byKey = new Map();
  for (const finding of findings) {
    const key = `${finding.file}:${finding.kind}:${finding.name}`;
    if (!byKey.has(key)) byKey.set(key, finding);
  }
  return [...byKey.values()].sort((a, b) =>
    a.file.localeCompare(b.file) ||
    a.line - b.line ||
    a.kind.localeCompare(b.kind) ||
    a.name.localeCompare(b.name),
  );
}

export function auditDeadCssSelectors(cssSourceTexts, surface, allowlist = defaultSurfaceAllowlist) {
  const findings = [];
  let selectorCount = 0;
  let atomCount = 0;
  for (const [file, css] of cssSourceTexts.entries()) {
    for (const record of extractCssSelectorRecords(css, file)) {
      selectorCount += 1;
      const atoms = selectorAtoms(record.selector);
      atomCount += atoms.classes.length + atoms.ids.length + atoms.dataAttrs.length;
      findings.push(...missingAtomFindings(record, atoms, surface, allowlist));
    }
  }
  return {
    findings: dedupeFindings(findings),
    counts: {
      cssFiles: cssSourceTexts.size,
      selectors: selectorCount,
      selectorAtoms: atomCount,
      knownClasses: surface.classes.size,
      knownIds: surface.ids.size,
      knownDataAttrs: surface.dataAttrs.size,
    },
  };
}

function extractStringConstants(text) {
  const constants = new Map();
  const pattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(["'`])((?:\\.|(?!\2)[\s\S])*?)\2\s*;/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (!match[3].includes('${')) constants.set(match[1], match[3]);
  }
  return constants;
}

function resolvedStringFragments(arg, constants) {
  const trimmed = String(arg ?? '').trim();
  if (constants.has(trimmed)) return [constants.get(trimmed)];
  const literal = trimmed.match(/^(["'`])((?:\\.|(?!\1)[\s\S])*?)\1$/);
  if (literal && !literal[2].includes('${')) return [literal[2]];
  return quotedFragments(trimmed).filter((fragment) => /[.#[]/.test(fragment));
}

export function extractRuntimeDomTargets(text, file = 'inline.js') {
  const constants = extractStringConstants(text);
  const targets = [];
  const selectorCallPattern = /\.(querySelector(?:All)?|closest|matches)\(([\s\S]*?)\)/g;
  let selectorCallMatch;
  while ((selectorCallMatch = selectorCallPattern.exec(text)) !== null) {
    for (const selector of resolvedStringFragments(selectorCallMatch[2], constants)) {
      targets.push({
        file,
        line: lineFor(text, selectorCallMatch.index),
        kind: 'selector',
        method: selectorCallMatch[1],
        selector,
      });
    }
  }

  const idCallPattern = /\.(?:getElementById)\(([\s\S]*?)\)/g;
  let idCallMatch;
  while ((idCallMatch = idCallPattern.exec(text)) !== null) {
    for (const id of resolvedStringFragments(idCallMatch[1], constants)) {
      if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(id)) {
        targets.push({
          file,
          line: lineFor(text, idCallMatch.index),
          kind: 'id',
          method: 'getElementById',
          name: id,
        });
      }
    }
  }

  const helperIdCallPattern = /\breadJsonScript\(([\s\S]*?)\)/g;
  let helperIdCallMatch;
  while ((helperIdCallMatch = helperIdCallPattern.exec(text)) !== null) {
    for (const id of resolvedStringFragments(helperIdCallMatch[1], constants)) {
      if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(id)) {
        targets.push({
          file,
          line: lineFor(text, helperIdCallMatch.index),
          kind: 'id',
          method: 'readJsonScript',
          name: id,
        });
      }
    }
  }

  return targets;
}

export function auditRuntimeDomTargets(scriptSourceTexts, surface, allowlist = defaultSurfaceAllowlist) {
  const findings = [];
  let targetCount = 0;
  let atomCount = 0;
  for (const [file, text] of scriptSourceTexts.entries()) {
    for (const target of extractRuntimeDomTargets(text, file)) {
      if (target.kind === 'id') {
        targetCount += 1;
        atomCount += 1;
        if (!surface.ids.has(target.name) && !isAllowed('ids', target.name, allowlist)) {
          findings.push({ ...target, kind: 'id', selector: `#${target.name}` });
        }
        continue;
      }
      const atoms = selectorAtoms(target.selector);
      const totalAtoms = atoms.classes.length + atoms.ids.length + atoms.dataAttrs.length;
      if (totalAtoms === 0) continue;
      targetCount += 1;
      atomCount += totalAtoms;
      findings.push(...missingAtomFindings(target, atoms, surface, allowlist));
    }
  }
  return {
    findings: dedupeFindings(findings),
    counts: {
      scriptFiles: scriptSourceTexts.size,
      targets: targetCount,
      targetAtoms: atomCount,
      knownClasses: surface.classes.size,
      knownIds: surface.ids.size,
      knownDataAttrs: surface.dataAttrs.size,
    },
  };
}

async function listFiles(dir, predicate = () => true) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.astro', '.tmp', 'dist', 'node_modules'].includes(entry.name)) continue;
      files.push(...(await listFiles(filePath, predicate)));
    } else if (entry.isFile() && predicate(filePath)) {
      files.push(filePath);
    }
  }
  return files;
}

export async function readSourceSurfaceTexts(root) {
  const roots = [path.join(root, 'src'), path.join(root, 'public', 'scripts')];
  const files = (
    await Promise.all(roots.map((dir) => listFiles(dir, (filePath) => {
      const rel = toPosix(path.relative(root, filePath));
      if (/^src\/styles\//.test(rel)) return false;
      if (/^src\/data\/_.*\.json$/i.test(rel)) return false;
      return /\.(astro|html|js|mjs|ts)$/i.test(filePath);
    })))
  ).flat();
  const texts = new Map();
  for (const filePath of files) {
    texts.set(toPosix(path.relative(root, filePath)), await fs.readFile(filePath, 'utf8'));
  }
  return texts;
}
