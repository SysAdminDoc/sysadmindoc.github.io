// The site's writing rule, applied to the names a browser tab, a search result
// or a feed reader shows: no em dash, en dash or other dash, and no hyphen or
// dash lookalike standing in for one between spaces. Titles join their parts
// with " | ".

const chars = (codes) => codes.map((code) => String.fromCharCode(code));
// Hyphens join words, which is fine: hyphen-minus, hyphen, non-breaking hyphen.
const HYPHENS = new Set(chars([0x2d, 0x2010, 0x2011]));
// Marks that aren't dash punctuation but read as a dash standing alone between
// spaces: minus signs, the hyphen bullet, the modifier minus and box-drawing
// and bracket horizontals (eighteenth drain review).
const LOOKALIKES = new Set(chars([0x2212, 0x2796, 0x2043, 0x02d7, 0x2500, 0x2501, 0x2574, 0x2576, 0x2578, 0x257a, 0x23af]));
const NAMED = { mdash: 0x2014, ndash: 0x2013, horbar: 0x2015, dash: 0x2010, hyphen: 0x2010, minus: 0x2212, nbsp: 0xa0 };
const hex = (character) => `U+${(character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`;
const escaped = [...HYPHENS, ...LOOKALIKES].map((character) => `\\u${(character.codePointAt(0) ?? 0).toString(16).padStart(4, '0')}`).join('');
const STANDING_ALONE = new RegExp(`(?:^|\\s)([${escaped}]+)(?=\\s|$)`, 'u');

/** A title with its character references read, as XML and JSON feeds carry them. */
export function decodeReferences(text) {
  return String(text).replace(/&(?:#x([0-9a-f]+)|#(\d+)|(mdash|ndash|horbar|dash|hyphen|minus|nbsp));/gi, (match, hexDigits, decimal, name) => {
    const code = hexDigits ? Number.parseInt(hexDigits, 16) : decimal ? Number.parseInt(decimal, 10) : NAMED[name.toLowerCase()];
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
    return `a dash (${hex(character)})`;
  }
  const run = STANDING_ALONE.exec(text)?.[1];
  if (run === undefined) return null;
  if (run.length === 1 && HYPHENS.has(run)) return 'a hyphen between spaces';
  return `a dash lookalike between spaces (${[...run].map(hex).join(' ')})`;
}
