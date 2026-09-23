// Reads a Caddyfile the way Caddy's lexer splits it: whitespace between tokens,
// "double quotes" with \" as the only escape, `backticks` taken raw, and # as a
// comment only where a token would start. Lines and { } blocks then form a
// tree. It knows no directives. That's enough for the trust tests to find
// every header a config touches however it's quoted, which pattern-matching
// the raw text couldn't (eighth drain review).

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
  let line = 1;
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (char === '\n') {
      line += 1;
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
        if (next === '\\' && (text[index + 1] === '"' || text[index + 1] === '\n')) {
          if (text[index + 1] === '\n') line += 1;
          value += text[index + 1];
          index += 2;
          continue;
        }
        if (next === '"') {
          index += 1;
          break;
        }
        if (next === '\n') line += 1;
        value += next;
        index += 1;
      }
      tokens.push({ text: value, line: start, quoted: true });
      continue;
    }
    if (char === '`') {
      const end = text.indexOf('`', index + 1);
      if (end < 0) throw new Error(`a backtick on line ${start} is never closed`);
      const value = text.slice(index + 1, end);
      line += value.split('\n').length - 1;
      tokens.push({ text: value, line: start, quoted: true });
      index = end + 1;
      continue;
    }
    let value = '';
    while (index < text.length && !/\s/.test(text[index])) {
      value += text[index];
      index += 1;
    }
    tokens.push({ text: value, line: start, quoted: false });
  }
  return tokens;
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

const HEADER_DIRECTIVES = new Set(['header', 'header_up', 'header_down', 'request_header']);

/** A matcher token in front of a header field: a named matcher, a path, or all. */
const isMatcher = (token) => token.startsWith('@') || token.startsWith('/') || token === '*';

/**
 * Every place a header directive names a client-address header, in line or in
 * a block, with any +, -, ? or > operator in front and in any case.
 * @param {CaddyNode[]} nodes
 * @returns {string[]}
 */
export function clientAddressHeaderWrites(nodes) {
  const found = [];
  for (const node of caddyfileLines(nodes)) {
    const [name, ...args] = node.tokens;
    if (!HEADER_DIRECTIVES.has(name)) continue;
    const fields = [];
    const inline = name === 'header_up' || name === 'header_down' ? args[0] : args.find((token) => !isMatcher(token));
    if (inline) fields.push(inline);
    for (const child of node.children ?? []) if (child.tokens[0]) fields.push(child.tokens[0]);
    for (const field of fields) {
      if (CLIENT_ADDRESS_HEADERS.includes(field.replace(/^[+\-?>]/, '').toLowerCase())) found.push(`${name} ${field} (line ${node.line})`);
    }
  }
  return found;
}
