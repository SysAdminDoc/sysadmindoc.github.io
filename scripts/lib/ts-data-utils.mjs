/**
 * Shared TypeScript AST parsing helpers used by portfolio build scripts.
 *
 * Centralises property-name extraction, string-property lookups,
 * source-file creation, and the live-slug collector so each audit
 * script does not carry its own copy.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

/**
 * Return the text of an identifier, string-literal, or numeric-literal
 * property name, or `null` for computed / unsupported names.
 */
export function propertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

/**
 * Look up a string-valued property inside a TS object-literal AST node.
 * Returns the string value or `null` when the key is missing or non-string.
 */
export function stringProperty(objectLiteral, key) {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (propertyName(property.name) !== key) continue;
    const value = property.initializer;
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  }
  return null;
}

/**
 * Create a TypeScript source-file AST from raw text.
 */
export function sourceFile(filePath, sourceText) {
  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/**
 * Read `src/data/projects.ts` and return the `slug` values from the
 * `liveApps` array.  Calls `fail` for structural problems so the
 * caller's error list stays consistent.
 *
 * @param {string} projectsPath  Absolute path to `projects.ts`.
 * @param {(msg: string) => void} fail  Error-collector callback.
 * @returns {Promise<string[]>}
 */
export async function collectLiveSlugs(projectsPath, fail) {
  const sourceText = await fs.readFile(projectsPath, 'utf8');
  const source = ts.createSourceFile(projectsPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const slugs = [];

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'liveApps') continue;
      if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
        fail('Expected liveApps to be an array literal in src/data/projects.ts.');
        return slugs;
      }
      for (const element of declaration.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        const slug = stringProperty(element, 'slug');
        if (slug) slugs.push(slug);
      }
    }
  }

  if (slugs.length === 0) fail('No live app slugs found in src/data/projects.ts.');
  return slugs;
}

/**
 * Read `src/data/projects.ts` and return a Map of repo/slug -> [section, ...]
 * covering `featured`, `liveApps`, and `catalog`.
 *
 * @param {string} projectsPath  Absolute path to `projects.ts`.
 * @param {string} sourceText  Already-read source text of `projects.ts`.
 * @returns {Map<string, string[]>}
 */
export function collectPortfolioRepos(projectsPath, sourceText) {
  const source = ts.createSourceFile(projectsPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const targetArrays = new Set(['featured', 'liveApps', 'catalog']);
  const refs = new Map();

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const section = declaration.name.text;
      if (!targetArrays.has(section)) continue;
      if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) continue;

      for (const element of declaration.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        const repo = stringProperty(element, section === 'liveApps' ? 'slug' : 'repo');
        if (!repo) continue;
        const existing = refs.get(repo) ?? [];
        existing.push(section);
        refs.set(repo, existing);
      }
    }
  }

  return refs;
}
