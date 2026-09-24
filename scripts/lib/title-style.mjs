// The site's writing rule, applied to the names a browser tab, a search result
// or a feed reader shows: no em dash, en dash or other dash, and no hyphen
// standing in for one between spaces. Titles join their parts with " | ".

// Hyphens join words, which is fine: hyphen-minus, hyphen, non-breaking hyphen.
const HYPHENS = new Set(['-', String.fromCharCode(0x2010), String.fromCharCode(0x2011)]);
const NAMED = { mdash: 0x2014, ndash: 0x2013, horbar: 0x2015, dash: 0x2010, hyphen: 0x2010 };

/** A title with its character references read, as XML and JSON feeds carry them. */
export function decodeReferences(text) {
  return String(text).replace(/&(?:#x([0-9a-f]+)|#(\d+)|(mdash|ndash|horbar|dash|hyphen));/gi, (match, hex, decimal, name) => {
    const code = hex ? Number.parseInt(hex, 16) : decimal ? Number.parseInt(decimal, 10) : NAMED[name.toLowerCase()];
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

/**
 * What in a title breaks the rule, in words, or null.
 * @param {string} title
 * @returns {string | null}
 */
export function titleStyleProblem(title) {
  const text = decodeReferences(title);
  for (const character of text) {
    if (!/\p{Pd}/u.test(character) || HYPHENS.has(character)) continue;
    const code = character.codePointAt(0) ?? 0;
    if (code === 0x2014) return 'an em dash';
    if (code === 0x2013) return 'an en dash';
    return `a dash (U+${code.toString(16).toUpperCase().padStart(4, '0')})`;
  }
  const hyphenated = [...text].map((character) => (HYPHENS.has(character) ? '-' : character)).join('');
  if (/(?:^|\s)-(?:\s|$)/u.test(hyphenated)) return 'a hyphen between spaces';
  return null;
}
