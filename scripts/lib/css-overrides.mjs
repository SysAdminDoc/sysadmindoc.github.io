// Declarations a stylesheet overrides itself. unlayered.css had grown ten
// labelled redesign passes, each restating properties the next one replaced,
// until 340 of its declarations, and 332 in critical.css, never applied. A
// declaration is overridden when a later one sets the same property on the same
// selector list, inside the same at-rules, and is at least as important.
// Nothing about other selectors matters: same selector and context means the
// later one wins for every element the earlier one could reach.
//
// Some kinds are kept as fallbacks: a repeat inside one rule, a regular
// property before a later light-dark() value, which the targets that predate
// light-dark() can't parse, and any pair where either value is vendor-prefixed
// (-webkit-fill-available before stretch), since a browser that can't parse
// one drops it and keeps the other. Custom properties never fall back, so an
// earlier --token is always overridden.
//
// Each anonymous @layer {} block is a layer of its own, and an earlier layer's
// !important beats a later one's, so declarations in two such blocks never
// share a context. Property names are case-insensitive, custom property names
// aren't: --Accent and --accent are two properties.
import postcss from 'postcss';

const anonymousLayers = new WeakMap();
let anonymousCount = 0;

function contextOf(node) {
  const chain = [];
  for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule' && parent.name.toLowerCase() === 'layer' && !parent.params.trim()) {
      if (!anonymousLayers.has(parent)) anonymousLayers.set(parent, (anonymousCount += 1));
      chain.unshift(`@layer (anonymous ${anonymousLayers.get(parent)})`);
    } else if (parent.type === 'atrule') chain.unshift(`@${parent.name} ${parent.params}`.replace(/\s+/g, ' ').trim());
    if (parent.type === 'rule') chain.unshift(`rule:${parent.selector.replace(/\s+/g, ' ')}`);
  }
  return chain.join(' > ');
}

const propertyKey = (prop) => (prop.startsWith('--') ? prop : prop.toLowerCase());
const vendorPrefixed = (value) => /(?:^|[\s,(/])-(?:webkit|moz|ms|o)-/i.test(value);

const selectorKey = (selector) =>
  selector
    .split(',')
    .map((part) => part.trim().replace(/\s+/g, ' '))
    .sort()
    .join(',');

/**
 * @param {string} css
 * @returns {{ node: import('postcss').Declaration, selector: string, prop: string, line: number, overriddenAt: number }[]}
 */
export function overriddenDeclarations(css) {
  const root = postcss.parse(css);
  const decls = [];
  root.walkDecls((decl) => {
    if (decl.parent?.type !== 'rule') return;
    decls.push({ decl, key: `${contextOf(decl.parent)} || ${selectorKey(decl.parent.selector)} || ${propertyKey(decl.prop)}` });
  });
  const winners = new Map();
  // Keys where a later declaration is vendor-prefixed: everything before it in
  // the chain can be what a browser falls back to.
  const prefixedLater = new Set();
  const overridden = [];
  for (let index = decls.length - 1; index >= 0; index -= 1) {
    const { decl, key } = decls[index];
    const winner = winners.get(key);
    const fallbackChain = prefixedLater.has(key);
    if (vendorPrefixed(decl.value)) prefixedLater.add(key);
    if (!winner || (!winner.important && decl.important)) {
      winners.set(key, decl);
      continue;
    }
    if (winner.parent === decl.parent) continue;
    if (!decl.prop.startsWith('--') && /light-dark\(/i.test(winner.value)) continue;
    if (!decl.prop.startsWith('--') && (fallbackChain || vendorPrefixed(decl.value))) continue;
    overridden.push({
      node: decl,
      selector: decl.parent.selector.replace(/\s+/g, ' '),
      prop: decl.prop,
      line: decl.source?.start?.line ?? 0,
      overriddenAt: winner.source?.start?.line ?? 0,
    });
  }
  return overridden.reverse();
}
