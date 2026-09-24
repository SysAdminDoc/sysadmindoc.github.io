// Declarations a stylesheet overrides itself. unlayered.css had grown ten
// labelled redesign passes, each restating properties the next one replaced,
// until 340 of its declarations, and 332 in critical.css, never applied. A
// declaration is overridden when a later one sets the same property on the same
// selector list, inside the same at-rules, and is at least as important.
// Nothing about other selectors matters: same selector and context means the
// later one wins for every element the earlier one could reach.
//
// A later declaration only kills an earlier one if every target browser
// parses it; one with a vendor prefix or syntax newer than the targets
// (light-dark(), stretch, text-wrap: pretty, relative colour syntax) is
// dropped where it isn't understood, and the earlier one applies there. A
// repeat inside one rule is left alone as the usual way to write a fallback.
// Custom properties take any value, so an earlier --token is always dead.
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

// Syntax some target browser (Chrome and Edge 111, Firefox 114, Safari 16.4;
// scripts/lib/minify-css.mjs) doesn't parse, so it drops the declaration and
// keeps the one before. Only what this site could plausibly write; a value
// missing here reads as understood everywhere.
const NEWER_THAN_TARGETS = [
  { value: /\blight-dark\(/i }, // Chrome 123, Safari 17.5, Firefox 120
  { value: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*from\s/i }, // relative colour syntax
  { value: /\b(?:round|mod|rem|anchor|anchor-size|calc-size|if|sibling-index|sibling-count)\(/i },
  { prop: /^(?:(?:min-|max-)?(?:width|height|inline-size|block-size))$/i, value: /^\s*stretch\s*$/i },
  { prop: /^text-wrap(?:-style)?$/i, value: /^\s*(?:pretty|balance|stable)\s*$/i },
];

/**
 * Whether every target browser parses this declaration's value. A vendor
 * prefix, outside a quoted string, means some don't.
 */
function understoodEverywhere(decl) {
  if (decl.prop.startsWith('--')) return true;
  const value = decl.value.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  if (/(?:^|[\s,(/])-(?:webkit|moz|ms|o)-/i.test(value)) return false;
  return !NEWER_THAN_TARGETS.some((rule) => (!rule.prop || rule.prop.test(decl.prop)) && rule.value.test(value));
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
    decls.push({ decl, key: `${contextOf(decl.parent)} || ${selectorKey(decl.parent.selector)} || ${propertyKey(decl.prop)}` });
  });
  // A declaration is dead when a later one on the same key, at least as
  // important, is understood by every target browser: then no browser ever
  // falls back to it. The thirteenth drain review found the old rule loose
  // one way (any prefixed value later in a chain spared everything before it,
  // a prefix inside a string counted, and a prefixed value before a plain one
  // was spared) and strict the other (a plain value before stretch,
  // text-wrap: pretty or relative colour syntax was called dead).
  /** @type {Map<string, { any: import('postcss').Declaration | null, important: import('postcss').Declaration | null }>} */
  const later = new Map();
  const overridden = [];
  for (let index = decls.length - 1; index >= 0; index -= 1) {
    const { decl, key } = decls[index];
    const after = later.get(key) ?? { any: null, important: null };
    const over = decl.important ? after.important : after.any;
    // A repeat inside one rule is the usual way to write a fallback, and is
    // left alone.
    if (over && over.parent !== decl.parent) {
      overridden.push({
        node: decl,
        selector: decl.parent.selector.replace(/\s+/g, ' '),
        prop: decl.prop,
        line: decl.source?.start?.line ?? 0,
        overriddenAt: over.source?.start?.line ?? 0,
      });
    }
    if (understoodEverywhere(decl)) {
      after.any ??= decl;
      if (decl.important) after.important ??= decl;
      later.set(key, after);
    }
  }
  return overridden.reverse();
}
