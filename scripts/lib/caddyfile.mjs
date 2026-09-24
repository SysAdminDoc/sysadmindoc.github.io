// Reads a Caddyfile the way Caddy's lexer splits it (caddyconfig/caddyfile/
// lexer.go): whitespace between tokens; "double quotes", where a backslash
// escapes the next character and is kept unless that's a quote or a newline;
// `backticks` taken raw; a backslash before a newline outside quotes, which
// continues the line; <<MARKER heredocs; and # as a comment only where a token
// would start. Environment placeholders, which Caddy replaces before it lexes,
// are expanded by expandEnvDefaults. Lines and { } blocks then form a tree. It
// knows no directives. That's enough for the trust tests to find every header
// a config touches however it's written, which pattern-matching the raw text
// couldn't (eighth drain review), and which the first version of this lexer
// couldn't for \\ before a quote, a continued line or a heredoc (eleventh).

/**
 * @typedef {{ text: string, line: number, quoted: boolean }} CaddyToken
 * @typedef {{ tokens: string[], line: number, children: CaddyNode[] | null }} CaddyNode
 */

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
      tokens.push({ text: value, line: start, quoted: true });
      continue;
    }
    const heredoc = /^<<([A-Za-z0-9_-]+)\n/.exec(text.slice(index));
    if (heredoc) {
      const bodyStart = index + heredoc[0].length;
      const close = new RegExp(`^[ \\t]*${heredoc[1]}(?=[\\s]|$)`, 'm');
      const rest = text.slice(bodyStart);
      const end = close.exec(rest);
      if (!end) throw new Error(`a heredoc on line ${start} is never closed`);
      const value = rest.slice(0, end.index).replace(/\n$/, '');
      physical += text.slice(index, bodyStart + end.index + end[0].length).split('\n').length - 1;
      line = physical;
      tokens.push({ text: value, line: start, quoted: true });
      index = bodyStart + end.index + end[0].length;
      continue;
    }
    if (char === '`') {
      const end = text.indexOf('`', index + 1);
      if (end < 0) throw new Error(`a backtick on line ${start} is never closed`);
      const value = text.slice(index + 1, end);
      const newlines = value.split('\n').length - 1;
      if (newlines > 0) {
        physical += newlines;
        line = physical;
      }
      tokens.push({ text: value, line: start, quoted: true });
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
    tokens.push({ text: value, line: start, quoted: false });
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
  return String(source).replace(/\{\$([A-Za-z0-9_]+):([^}]*)\}/g, (_, name, fallback) => fallback);
}

/**
 * The file's lines as a tree: each line's tokens, and the block it opens, if any.
 * A `{` alone on a line opens a block with no tokens of its own, which is how
 * the global options block reads.
 * @param {string} source
 * @returns {CaddyNode[]}
 */
export function parseCaddyfile(source) {
  /** @type {CaddyNode} */
  const root = { tokens: [], line: 0, children: [] };
  const stack = [root];
  /** @type {CaddyNode | null} */
  let current = null;
  for (const token of lexCaddyfile(source)) {
    const parent = stack[stack.length - 1];
    if (!token.quoted && token.text === '}') {
      if (stack.length === 1) throw new Error(`a } on line ${token.line} closes nothing`);
      stack.pop();
      current = null;
      continue;
    }
    if (!token.quoted && token.text === '{') {
      let owner = current && current.line === token.line && current.children === null ? current : null;
      if (!owner) {
        owner = { tokens: [], line: token.line, children: null };
        parent.children?.push(owner);
      }
      owner.children = [];
      stack.push(owner);
      current = null;
      continue;
    }
    if (!current || current.line !== token.line) {
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
      if (CLIENT_ADDRESS_HEADERS.includes(header.toLowerCase()) || header.includes('{')) found.push(`${name} ${field} (line ${node.line})`);
    }
  }
  return found;
}
