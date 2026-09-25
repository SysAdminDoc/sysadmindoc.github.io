// A CSS tokenizer after CSS Syntax Level 3, section 4: enough of it to tell
// strings, url() and comments apart the way browsers do. The audits read
// built CSS for what it loads and what a minifier broke, and regexes over raw
// text kept being fooled: an escaped `\/*`, a `/*` or `url(` inside a string,
// an escaped CRLF, `url(` with a long run of spaces (seventeenth, nineteenth
// and twenty-third drain reviews). Numbers, hashes and the like come out as
// delims and idents, which no audit here needs to tell apart.

/**
 * @typedef {'ident' | 'function' | 'at-keyword' | 'string' | 'bad-string' | 'url' | 'bad-url' | 'whitespace' | 'delim' | '(' | ')' | '{' | '}' | '[' | ']' | ';' | ':' | ','} CssTokenType
 * @typedef {{ type: CssTokenType, value: string }} CssToken
 */

const REPLACEMENT = String.fromCharCode(0xfffd);

/** CSS preprocessing: CRLF, CR and form feed become LF, and NUL becomes U+FFFD. */
export function preprocessCss(css) {
  return String(css).replace(/\r\n?|\f/g, '\n').replace(/\0/g, REPLACEMENT);
}

const isHex = (c) => c !== undefined && /^[0-9a-fA-F]$/.test(c);
const isNameStart = (c) => c !== undefined && (/^[A-Za-z_]$/.test(c) || c.charCodeAt(0) >= 0x80);
const isName = (c) => isNameStart(c) || (c !== undefined && /^[0-9-]$/.test(c));
const isWhitespace = (c) => c === ' ' || c === '\t' || c === '\n';
const isValidEscape = (a, b) => a === '\\' && b !== '\n' && b !== undefined;
const startsIdent = (a, b, c) => {
  if (a === '-') return isNameStart(b) || b === '-' || isValidEscape(b, c);
  return isNameStart(a) || isValidEscape(a, b);
};
// Characters that make an unquoted url() a bad-url: quotes, a paren and the
// non-printables (section 4.3.6).
const BREAKS_URL = /^["'(\x00-\x08\x0b\x0e-\x1f\x7f]$/;

/**
 * The tokens of a stylesheet, or of a style attribute's declarations.
 * Comments produce none, and whitespace runs come out as one token.
 * @param {string} css
 * @returns {CssToken[]}
 */
export function cssTokens(css) {
  const text = preprocessCss(css);
  /** @type {CssToken[]} */
  const tokens = [];
  let i = 0;

  // i is just past the backslash.
  const consumeEscape = () => {
    const c = text[i];
    if (c === undefined) return REPLACEMENT;
    if (isHex(c)) {
      let hex = '';
      while (hex.length < 6 && isHex(text[i])) hex += text[i++];
      if (isWhitespace(text[i])) i += 1;
      const code = Number.parseInt(hex, 16);
      return code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff) ? REPLACEMENT : String.fromCodePoint(code);
    }
    i += 1;
    return c;
  };

  const consumeName = () => {
    let name = '';
    for (;;) {
      const c = text[i];
      if (isName(c)) {
        name += c;
        i += 1;
      } else if (isValidEscape(c, text[i + 1])) {
        i += 1;
        name += consumeEscape();
      } else {
        return name;
      }
    }
  };

  // i is just past the opening quote.
  /** @returns {CssToken} */
  const consumeString = (quote) => {
    let value = '';
    for (;;) {
      const c = text[i];
      if (c === undefined) return { type: 'string', value };
      if (c === quote) {
        i += 1;
        return { type: 'string', value };
      }
      // An unescaped newline ends the string as a bad one, and stays.
      if (c === '\n') return { type: 'bad-string', value };
      if (c === '\\') {
        const next = text[i + 1];
        if (next === undefined) {
          i += 1;
        } else if (next === '\n') {
          i += 2;
        } else {
          i += 1;
          value += consumeEscape();
        }
        continue;
      }
      value += c;
      i += 1;
    }
  };

  const consumeBadUrlRemnants = () => {
    while (i < text.length) {
      const c = text[i];
      if (c === ')') {
        i += 1;
        return;
      }
      if (isValidEscape(c, text[i + 1])) {
        i += 1;
        consumeEscape();
      } else {
        i += 1;
      }
    }
  };

  // i is just past `url(`, and what follows isn't a quote.
  /** @returns {CssToken} */
  const consumeUrl = () => {
    let value = '';
    while (isWhitespace(text[i])) i += 1;
    for (;;) {
      const c = text[i];
      if (c === undefined) return { type: 'url', value };
      if (c === ')') {
        i += 1;
        return { type: 'url', value };
      }
      if (isWhitespace(c)) {
        while (isWhitespace(text[i])) i += 1;
        if (text[i] === undefined) return { type: 'url', value };
        if (text[i] === ')') {
          i += 1;
          return { type: 'url', value };
        }
        consumeBadUrlRemnants();
        return { type: 'bad-url', value: '' };
      }
      if (BREAKS_URL.test(c) || (c === '\\' && !isValidEscape(c, text[i + 1]))) {
        consumeBadUrlRemnants();
        return { type: 'bad-url', value: '' };
      }
      if (c === '\\') {
        i += 1;
        value += consumeEscape();
        continue;
      }
      value += c;
      i += 1;
    }
  };

  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    if (isWhitespace(c)) {
      while (isWhitespace(text[i])) i += 1;
      tokens.push({ type: 'whitespace', value: ' ' });
      continue;
    }
    if (c === '"' || c === "'") {
      i += 1;
      tokens.push(consumeString(c));
      continue;
    }
    if (c === '@' && startsIdent(text[i + 1], text[i + 2], text[i + 3])) {
      i += 1;
      tokens.push({ type: 'at-keyword', value: consumeName() });
      continue;
    }
    if (startsIdent(c, text[i + 1], text[i + 2])) {
      const name = consumeName();
      if (text[i] !== '(') {
        tokens.push({ type: 'ident', value: name });
        continue;
      }
      i += 1;
      if (name.toLowerCase() === 'url') {
        let next = i;
        while (isWhitespace(text[next])) next += 1;
        // url( then a quote is a plain function whose argument is a string.
        if (text[next] !== '"' && text[next] !== "'") {
          tokens.push(consumeUrl());
          continue;
        }
      }
      tokens.push({ type: 'function', value: name });
      continue;
    }
    if ('(){}[];:,'.includes(c)) {
      tokens.push({ type: /** @type {CssTokenType} */ (c), value: c });
      i += 1;
      continue;
    }
    tokens.push({ type: 'delim', value: c });
    i += 1;
  }
  return tokens;
}
