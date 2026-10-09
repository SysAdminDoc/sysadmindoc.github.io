// Reads a Caddyfile the way Caddy's lexer splits it (caddyconfig/caddyfile/
// lexer.go): whitespace between tokens; "double quotes", where a backslash
// escapes the next character and is kept unless that's a quote or a newline;
// `backticks` taken raw; a backslash before a newline outside quotes, which
// continues the line; <<MARKER heredocs; and # as a comment only where a token
// would start. Environment placeholders, which Caddy replaces before it lexes,
// are expanded by expandEnvDefaults. Lines and { } blocks then form a tree,
// split into lines the way Caddy's dispenser does. It knows no directives.
// That's enough for the trust tests to find every header a config touches
// however it's written, which pattern-matching the raw text couldn't (eighth
// drain review), and which the first version of this lexer couldn't for \\
// before a quote, a continued line or a heredoc (eleventh).
//
// Heredocs follow what `caddy adapt` 2.11.4 does, not what its docs suggest
// (twenty-fourth review rerun). One ends the moment the text read so far ends
// with its marker, mid-line or glued to more text too; the text before the
// marker on that last line is stripped from the front of every body line, and
// a body line that doesn't start with it is refused. The dispenser counts a
// heredoc as its body's lines plus two, so a heredoc that ends on its first
// body line pulls the next line's tokens onto its own.

/**
 * @typedef {{ text: string, line: number, quoted: boolean, breaks: number }} CaddyToken
 * `line` is where the token starts and `breaks` the line breaks Caddy's
 * dispenser counts inside it (caddyfile/dispenser.go, numLineBreaks).
 * @typedef {{ tokens: string[], line: number, children: CaddyNode[] | null }} CaddyNode
 */

const lineBreaks = (value) => value.split('\n').length - 1;

/**
 * A heredoc's body as Caddy's finalizeHeredoc leaves it.
 * @param {string} body everything between the opening line and the marker
 * @param {string} marker
 * @param {number} line the line the heredoc opens on
 */
function finalizeHeredoc(body, marker, line) {
  const lastNewline = body.lastIndexOf('\n');
  const padding = body.slice(lastNewline + 1);
  const lines = body.slice(0, lastNewline + 1).split('\n').slice(0, -1);
  let value = '';
  lines.forEach((text, offset) => {
    if (text === '') {
      value += '\n';
      return;
    }
    if (!text.startsWith(padding)) {
      throw new Error(`line ${line + offset + 1} of the <<${marker} heredoc doesn't start with the text before its closing marker, which Caddy refuses`);
    }
    value += `${text.slice(padding.length)}\n`;
  });
  return value.endsWith('\n') ? value.slice(0, -1) : value;
}

/**
 * @param {string} source
 * @returns {CaddyToken[]}
 */
export function lexCaddyfile(source) {
  const text = String(source).replace(/\r\n?/g, '\n');
  /** @type {CaddyToken[]} */
  const tokens = [];
  // `line` is the logical line tokens belong to; a continued line keeps it
  // while `physical` moves on.
  let line = 1;
  let physical = 1;
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\' && text[index + 1] === '\n') {
      physical += 1;
      index += 2;
      continue;
    }
    if (char === '\n') {
      physical += 1;
      line = physical;
      index += 1;
      continue;
    }
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === '#') {
      while (index < text.length && text[index] !== '\n') index += 1;
      continue;
    }
    const start = line;
    if (char === '"') {
      let value = '';
      index += 1;
      for (;;) {
        if (index >= text.length) throw new Error(`a quote on line ${start} is never closed`);
        const next = text[index];
        if (next === '\\' && index + 1 < text.length) {
          const escaped = text[index + 1];
          if (escaped === '\n') {
            physical += 1;
            line = physical;
          }
          value += escaped === '"' || escaped === '\n' ? escaped : `\\${escaped}`;
          index += 2;
          continue;
        }
        if (next === '"') {
          index += 1;
          break;
        }
        // A newline inside quotes brings the logical line up to date, as in Caddy.
        if (next === '\n') {
          physical += 1;
          line = physical;
        }
        value += next;
        index += 1;
      }
      tokens.push({ text: value, line: start, quoted: true, breaks: lineBreaks(value) });
      continue;
    }
    // A heredoc opens only where a token starts, as <<MARKER and a newline; a
    // space after the marker leaves a plain token.
    const heredoc = /^<<([A-Za-z0-9_-]+)\n/.exec(text.slice(index));
    if (heredoc) {
      const [opening, marker] = heredoc;
      const bodyStart = index + opening.length;
      const close = text.indexOf(marker, bodyStart);
      if (close < 0) throw new Error(`a heredoc on line ${start} is never closed`);
      const value = finalizeHeredoc(text.slice(bodyStart, close), marker, start);
      physical += lineBreaks(text.slice(index, close));
      line = physical;
      tokens.push({ text: value, line: start, quoted: true, breaks: lineBreaks(value) + 2 });
      index = close + marker.length;
      continue;
    }
    if (char === '`') {
      const end = text.indexOf('`', index + 1);
      if (end < 0) throw new Error(`a backtick on line ${start} is never closed`);
      const value = text.slice(index + 1, end);
      const newlines = lineBreaks(value);
      if (newlines > 0) {
        physical += newlines;
        line = physical;
      }
      tokens.push({ text: value, line: start, quoted: true, breaks: newlines });
      index = end + 1;
      continue;
    }
    let value = '';
    while (index < text.length && !/\s/.test(text[index])) {
      // Outside quotes a backslash keeps itself, except before a newline,
      // where it continues the line (handled above).
      if (text[index] === '\\' && text[index + 1] === '\n') break;
      value += text[index];
      index += 1;
    }
    tokens.push({ text: value, line: start, quoted: false, breaks: 0 });
  }
  return tokens;
}

/**
 * Replace each `{$NAME:default}` with its default, as Caddy does before it
 * lexes when NAME isn't set. A `{$NAME}` with no default is left as written,
 * since its value lives on the server; callers treat it as unknown.
 * @param {string} source
 */
export function expandEnvDefaults(source) {
  // As Caddy's replaceEnvVars (caddyconfig/caddyfile/parse.go) scans: from
  // each {$ to the next }, whatever lies between, name and default split at
  // the first colon. A name can hold any character, a quote included, which a
  // pattern for word characters missed (fourteenth drain review).
  let text = String(source);
  let offset = 0;
  for (;;) {
    const begin = text.indexOf('{$', offset);
    if (begin < 0) break;
    const end = text.indexOf('}', begin + 2);
    if (end < 0) break;
    const inner = text.slice(begin + 2, end);
    const colon = inner.indexOf(':');
    if (inner.length === 0 || colon < 0) {
      offset = end + 1;
      continue;
    }
    const fallback = inner.slice(colon + 1);
    text = `${text.slice(0, begin)}${fallback}${text.slice(end + 1)}`;
    offset = begin + fallback.length;
  }
  return text;
}

/**
 * The file's lines as a tree: each line's tokens, and the block it opens, if any.
 * A `{` alone on a line opens a block with no tokens of its own, which is how
 * the global options block reads. A token starts a new line, as in Caddy's
 * dispenser (isNewLine), only when it starts past the line the previous token
 * started on plus the line breaks counted inside that token.
 * @param {string} source
 * @returns {CaddyNode[]}
 */
export function parseCaddyfile(source) {
  /** @type {CaddyNode} */
  const root = { tokens: [], line: 0, children: [] };
  const stack = [root];
  /** @type {CaddyNode | null} */
  let current = null;
  /** @type {CaddyToken | null} */
  let previous = null;
  for (const token of lexCaddyfile(source)) {
    const parent = stack[stack.length - 1];
    const sameLine = previous !== null && previous.line + previous.breaks >= token.line;
    previous = token;
    if (!token.quoted && token.text === '}') {
      if (stack.length === 1) throw new Error(`a } on line ${token.line} closes nothing`);
      stack.pop();
      current = null;
      continue;
    }
    if (!token.quoted && token.text === '{') {
      let owner = current && sameLine && current.children === null ? current : null;
      if (!owner) {
        owner = { tokens: [], line: token.line, children: null };
        parent.children?.push(owner);
      }
      owner.children = [];
      stack.push(owner);
      current = null;
      continue;
    }
    if (!current || !sameLine) {
      current = { tokens: [], line: token.line, children: null };
      parent.children?.push(current);
    }
    current.tokens.push(token.text);
  }
  if (stack.length !== 1) throw new Error('a { is never closed');
  return root.children ?? [];
}

/**
 * Every line in the tree, depth first.
 * @param {CaddyNode[]} nodes
 * @returns {Generator<CaddyNode>}
 */
export function* caddyfileLines(nodes) {
  for (const node of nodes) {
    yield node;
    if (node.children) yield* caddyfileLines(node.children);
  }
}

// Headers that carry a client's address. The inner Caddy and ntfy read the
// visitor's address from X-Forwarded-For alone, so a config may not set,
// copy, append or delete any of these on the way.
export const CLIENT_ADDRESS_HEADERS = Object.freeze([
  'x-forwarded-for',
  'x-real-ip',
  'forwarded',
  'true-client-ip',
  'x-client-ip',
  'cf-connecting-ip',
  'x-cluster-client-ip',
  'fastly-client-ip',
]);

// Directives that change the headers a request carries on to an upstream.
// `header` and `header_down` change only responses, so they can't hand an
// upstream a forged address (the eleventh drain review: a header block
// deleting Forwarded from responses had been counted as a forgery).
const REQUEST_HEADER_DIRECTIVES = new Set(['header_up', 'request_header']);

/** A matcher token in front of a header field: a named matcher, a path, or all. */
const isMatcher = (token) => token.startsWith('@') || token.startsWith('/') || token === '*';

/**
 * Every place a request header directive names a client-address header, in
 * line or in a block, with any +, -, ? or > operator in front and in any case,
 * or names a header through a placeholder, which could be one.
 * @param {CaddyNode[]} nodes
 * @returns {string[]}
 */
export function clientAddressHeaderWrites(nodes) {
  const found = [];
  for (const node of caddyfileLines(nodes)) {
    const [name, ...args] = node.tokens;
    if (!REQUEST_HEADER_DIRECTIVES.has(name)) continue;
    const fields = [];
    const inline = name === 'header_up' ? args[0] : args.find((token) => !isMatcher(token));
    if (inline) fields.push(inline);
    for (const child of node.children ?? []) if (child.tokens[0]) fields.push(child.tokens[0]);
    for (const field of fields) {
      const header = field.replace(/^[+\-?>]/, '');
      // A placeholder or a wildcard could name any header, X-Forwarded-For
      // included (fourteenth and fifteenth drain reviews).
      if (CLIENT_ADDRESS_HEADERS.includes(header.toLowerCase()) || /[{*]/.test(header)) found.push(`${name} ${field} (line ${node.line})`);
    }
  }
  return found;
}
