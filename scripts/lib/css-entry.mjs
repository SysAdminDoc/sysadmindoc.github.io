import fs from 'node:fs/promises';
import path from 'node:path';

const importPattern = /@import\s+(?:url\(\s*)?(["'])([^"']+)\1\s*\)?[^;]*;/g;

function toPosix(value) {
  return value.replaceAll(path.sep, '/');
}

function localImportPath(filePath, specifier, root) {
  if (!specifier.startsWith('.')) return null;
  const withoutQuery = specifier.split(/[?#]/, 1)[0];
  const resolved = path.resolve(path.dirname(filePath), withoutQuery);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`CSS import escapes repository root: ${specifier} from ${filePath}`);
  }
  return resolved;
}

/**
 * Load a CSS entry point and recursively inline its local imports for audits.
 * The returned source map keeps each physical file separate for precise
 * dead-selector findings.
 *
 * @param {string} entryPath
 * @param {{root?: string}} [options]
 */
export async function loadCssEntry(entryPath, options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const cache = new Map();
  const sources = new Map();

  async function read(filePath) {
    const resolved = path.resolve(filePath);
    if (!cache.has(resolved)) cache.set(resolved, await fs.readFile(resolved, 'utf8'));
    const source = cache.get(resolved);
    if (typeof source !== 'string') throw new Error(`Unable to read CSS source: ${resolved}`);
    sources.set(toPosix(path.relative(root, resolved)), source);
    return source;
  }

  async function expand(filePath, stack = []) {
    const resolved = path.resolve(filePath);
    if (stack.includes(resolved)) {
      throw new Error(`Circular CSS import: ${[...stack, resolved].map((file) => path.relative(root, file)).join(' -> ')}`);
    }

    const source = await read(resolved);
    let output = '';
    let cursor = 0;
    importPattern.lastIndex = 0;
    const matches = [...source.matchAll(importPattern)];
    for (const match of matches) {
      const importedPath = localImportPath(resolved, match[2], root);
      output += source.slice(cursor, match.index);
      output += importedPath
        ? await expand(importedPath, [...stack, resolved])
        : match[0];
      cursor = (match.index ?? 0) + match[0].length;
    }
    return output + source.slice(cursor);
  }

  return {
    css: await expand(entryPath),
    sources,
  };
}

/**
 * @param {string} entryPath
 * @param {{root?: string}} [options]
 */
export async function readCssEntry(entryPath, options = {}) {
  return (await loadCssEntry(entryPath, options)).css;
}
