const rawTextTags = new Set(['script', 'style']);

function isAttributeNameChar(char) {
  return /[:@\w-]/.test(char);
}

function readBalancedExpression(source, start) {
  let depth = 0;
  let quote = '';

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (char === quote && previous !== '\\') quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }

  return source.length;
}

/**
 * Parse HTML/Astro opening-tag attributes without treating words inside an
 * Astro expression as valueless attributes.
 *
 * @param {string} source
 */
export function parseMarkupAttributes(source) {
  /** @type {Record<string, string | true>} */
  const attrs = {};
  let index = 0;

  while (index < source.length) {
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (index >= source.length || source[index] === '/') break;
    if (source[index] === '{') {
      index = readBalancedExpression(source, index);
      continue;
    }

    const nameStart = index;
    while (index < source.length && isAttributeNameChar(source[index])) index += 1;
    if (index === nameStart) {
      index += 1;
      continue;
    }

    const name = source.slice(nameStart, index).toLowerCase();
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source[index] !== '=') {
      attrs[name] = true;
      continue;
    }

    index += 1;
    while (index < source.length && /\s/.test(source[index])) index += 1;
    const valueStart = index;
    const first = source[index];
    if (first === '"' || first === "'" || first === '`') {
      index += 1;
      const contentStart = index;
      while (index < source.length && source[index] !== first) index += 1;
      attrs[name] = source.slice(contentStart, index);
      if (source[index] === first) index += 1;
      continue;
    }
    if (first === '{') {
      index = readBalancedExpression(source, index);
      attrs[name] = source.slice(valueStart, index);
      continue;
    }

    while (index < source.length && !/[\s>]/.test(source[index])) index += 1;
    attrs[name] = source.slice(valueStart, index);
  }

  return attrs;
}

function findOpeningTagEnd(source, start) {
  let quote = '';
  let quoteUsesEscapes = false;
  let braceDepth = 0;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (char === quote && (!quoteUsesEscapes || previous !== '\\')) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      quoteUsesEscapes = braceDepth > 0 || char === '`';
      continue;
    }
    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}' && braceDepth > 0) {
      braceDepth -= 1;
      continue;
    }
    if (char === '>' && braceDepth === 0) return index;
  }

  return -1;
}

/**
 * Scan opening tags while respecting quoted `>` characters, Astro expression
 * braces, HTML comments, and raw script/style text.
 *
 * @param {string} source
 */
export function scanMarkup(source) {
  /** @type {Array<{
   *   tagName: string,
   *   attrText: string,
   *   source: string,
   *   start: number,
   *   end: number,
   *   selfClosing: boolean,
   *   content: string | null,
   * }>} */
  const tags = [];
  let index = 0;

  while (index < source.length) {
    const start = source.indexOf('<', index);
    if (start < 0) break;
    if (source.startsWith('<!--', start)) {
      const commentEnd = source.indexOf('-->', start + 4);
      index = commentEnd < 0 ? source.length : commentEnd + 3;
      continue;
    }

    const nameStart = start + 1;
    if (source[nameStart] === '/' || !/[A-Za-z]/.test(source[nameStart] ?? '')) {
      index = start + 1;
      continue;
    }

    let nameEnd = nameStart + 1;
    while (nameEnd < source.length && /[\w:-]/.test(source[nameEnd])) nameEnd += 1;
    const tagName = source.slice(nameStart, nameEnd).toLowerCase();
    const closeIndex = findOpeningTagEnd(source, nameEnd);
    if (closeIndex < 0) break;

    let attrEnd = closeIndex;
    while (attrEnd > nameEnd && /\s/.test(source[attrEnd - 1])) attrEnd -= 1;
    const selfClosing = source[attrEnd - 1] === '/';
    if (selfClosing) attrEnd -= 1;
    const openingEnd = closeIndex + 1;
    const tag = {
      tagName,
      attrText: source.slice(nameEnd, attrEnd),
      source: source.slice(start, openingEnd),
      start,
      end: openingEnd,
      selfClosing,
      content: null,
    };

    if (rawTextTags.has(tagName) && !selfClosing) {
      const closePattern = new RegExp(`</${tagName}\\s*>`, 'gi');
      closePattern.lastIndex = openingEnd;
      const closeMatch = closePattern.exec(source);
      const contentEnd = closeMatch?.index ?? source.length;
      tag.content = source.slice(openingEnd, contentEnd);
      tag.end = closeMatch ? closePattern.lastIndex : source.length;
    } else if (rawTextTags.has(tagName)) {
      tag.content = '';
    }

    tags.push(tag);
    index = tag.end;
  }

  return tags;
}
