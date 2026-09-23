// Declarations a stylesheet overrides itself. unlayered.css had grown ten
// labelled redesign passes, each restating properties the next one replaced,
// until 340 of its declarations, and 332 in critical.css, never applied. A
// declaration is overridden when a later one sets the same property on the same
// selector list, inside the same at-rules, and is at least as important.
// Nothing about other selectors matters: same selector and context means the
// later one wins for every element the earlier one could reach.
//
// Two kinds are kept as fallbacks: a repeat inside one rule, and a regular
// property before a later light-dark() value, which the targets that predate
// light-dark() can't parse. Custom properties never fall back, so an earlier
// --token is always overridden.
import postcss from 'postcss';

function contextOf(node) {
  const chain = [];
  for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule') chain.unshift(`@${parent.name} ${parent.params}`.replace(/\s+/g, ' ').trim());
    if (parent.type === 'rule') chain.unshift(`rule:${parent.selector.replace(/\s+/g, ' ')}`);
  }
  return chain.join(' > ');
}

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
    decls.push({ decl, key: `${contextOf(decl.parent)} || ${selectorKey(decl.parent.selector)} || ${decl.prop.toLowerCase()}` });
  });
  const winners = new Map();
  const overridden = [];
  for (let index = decls.length - 1; index >= 0; index -= 1) {
    const { decl, key } = decls[index];
    const winner = winners.get(key);
    if (!winner || (!winner.important && decl.important)) {
      winners.set(key, decl);
      continue;
    }
    if (winner.parent === decl.parent) continue;
    if (!decl.prop.startsWith('--') && /light-dark\(/i.test(winner.value)) continue;
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
