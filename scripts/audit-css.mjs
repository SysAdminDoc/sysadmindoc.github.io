import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  auditDeadCssSelectors,
  collectSourceSurface,
  readSourceSurfaceTexts,
} from './lib/source-surface-audit.mjs';

const root = process.cwd();
const criticalPath = path.join(root, 'src', 'styles', 'critical.css');
const globalPath = path.join(root, 'src', 'styles', 'global.css');
const selfTest = process.argv.includes('--self-test');

const sharedFirstViewportSelectors = [
  '.hn',
  '.hn .a',
  '.hr',
  '.hd',
  '.hs',
  '.hs-item',
  '.hs-item:not(:last-child)',
  '.hsn',
  '.hsl',
  '.hero-proof-strip',
  '.hero-proof',
  '.hero-proof-label',
  '.hero-proof-value',
  '.hero-proof-copy',
  '.hero-signals',
  '.hero-signal',
  '.hero-signal-label',
  '.hero-signal-value',
];

const sharedMobileSelectors = [
  '.hn',
  '.hr',
  '.hd',
  '.hs',
  '.hero-proof-strip',
  '.hero-proof',
  '.hero-proof-value',
  '.hero-pulse',
  '.hero-pulse .pulse-item',
];

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitSelectorList(value) {
  const selectors = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '(' || char === '[') depth += 1;
    if ((char === ')' || char === ']') && depth > 0) depth -= 1;
    if (char === ',' && depth === 0) {
      selectors.push(value.slice(start, index));
      start = index + 1;
    }
  }
  selectors.push(value.slice(start));
  return selectors;
}

function normalizeSelector(selector) {
  return selector
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, '$1');
}

function extractSelectors(css) {
  const selectors = new Set();
  const cleaned = stripComments(css);
  const rulePattern = /([^{}]+)\{/g;
  let match;
  while ((match = rulePattern.exec(cleaned)) !== null) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('@')) continue;
    if (/^(from|to|\d+(?:\.\d+)?%)$/.test(raw)) continue;
    for (const selector of splitSelectorList(raw)) {
      const normalized = normalizeSelector(selector);
      if (normalized) selectors.add(normalized);
    }
  }
  return selectors;
}

function extractMediaBlocks(css, conditionPattern) {
  const blocks = [];
  const pattern = /@media\s*([^{]+)\{/g;
  let match;
  while ((match = pattern.exec(css)) !== null) {
    const condition = match[1].trim();
    if (!conditionPattern.test(condition)) continue;

    const openIndex = css.indexOf('{', match.index);
    let depth = 0;
    for (let index = openIndex; index < css.length; index += 1) {
      const char = css[index];
      if (char === '{') depth += 1;
      if (char === '}') depth -= 1;
      if (depth === 0) {
        blocks.push(css.slice(openIndex + 1, index));
        pattern.lastIndex = index + 1;
        break;
      }
    }
  }
  return blocks;
}

function removeSingleSelectorBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escaped}\\s*\\{`);
  const match = pattern.exec(css);
  if (!match) return css;

  const openIndex = css.indexOf('{', match.index);
  let depth = 0;
  for (let index = openIndex; index < css.length; index += 1) {
    const char = css[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return `${css.slice(0, match.index)}${css.slice(index + 1)}`;
    }
  }
  return css;
}

function removeSelectorBlock(css, selector) {
  let current = css;
  while (true) {
    const next = removeSingleSelectorBlock(current, selector);
    if (next === current) return current;
    current = next;
  }
}

function auditCss({ criticalCss, globalCss }) {
  const errors = [];
  const criticalSelectors = extractSelectors(criticalCss);
  const globalSelectors = extractSelectors(globalCss);
  const criticalMobileSelectors = extractSelectors(extractMediaBlocks(criticalCss, /max-width\s*:\s*640px/).join('\n'));
  const globalMobileSelectors = extractSelectors(extractMediaBlocks(globalCss, /max-width\s*:\s*640px/).join('\n'));

  for (const selector of sharedFirstViewportSelectors) {
    if (!criticalSelectors.has(selector)) errors.push(`Missing shared first-viewport selector in critical.css: ${selector}`);
    if (!globalSelectors.has(selector)) errors.push(`Missing shared first-viewport selector in global.css: ${selector}`);
  }

  for (const selector of sharedMobileSelectors) {
    if (!criticalMobileSelectors.has(selector)) errors.push(`Missing shared mobile selector in critical.css @media(max-width:640px): ${selector}`);
    if (!globalMobileSelectors.has(selector)) errors.push(`Missing shared mobile selector in global.css @media(max-width:640px): ${selector}`);
  }

  return {
    errors,
    counts: {
      criticalSelectors: criticalSelectors.size,
      globalSelectors: globalSelectors.size,
      criticalMobileSelectors: criticalMobileSelectors.size,
      globalMobileSelectors: globalMobileSelectors.size,
      sharedFirstViewportSelectors: sharedFirstViewportSelectors.length,
      sharedMobileSelectors: sharedMobileSelectors.length,
    },
  };
}

function report(result, deadSelectorResult, label = 'CSS first-viewport parity audit') {
  console.log(label);
  console.log(`  critical selectors: ${result.counts.criticalSelectors}`);
  console.log(`  global selectors: ${result.counts.globalSelectors}`);
  console.log(`  critical mobile selectors: ${result.counts.criticalMobileSelectors}`);
  console.log(`  global mobile selectors: ${result.counts.globalMobileSelectors}`);
  console.log(`  shared first-viewport selectors checked: ${result.counts.sharedFirstViewportSelectors}`);
  console.log(`  shared mobile selectors checked: ${result.counts.sharedMobileSelectors}`);
  if (deadSelectorResult) {
    console.log('');
    console.log('CSS dead-selector audit');
    console.log(`  CSS files checked: ${deadSelectorResult.counts.cssFiles}`);
    console.log(`  selectors checked: ${deadSelectorResult.counts.selectors}`);
    console.log(`  selector atoms checked: ${deadSelectorResult.counts.selectorAtoms}`);
    console.log(`  known source classes: ${deadSelectorResult.counts.knownClasses}`);
    console.log(`  known source ids: ${deadSelectorResult.counts.knownIds}`);
    console.log(`  known source data attributes: ${deadSelectorResult.counts.knownDataAttrs}`);
  }
}

const [criticalCss, globalCss] = await Promise.all([
  fs.readFile(criticalPath, 'utf8'),
  fs.readFile(globalPath, 'utf8'),
]);
const surfaceTexts = await readSourceSurfaceTexts(root);
const surface = collectSourceSurface(surfaceTexts);

if (selfTest) {
  const mutated = auditCss({
    criticalCss: removeSelectorBlock(criticalCss, '.hero-proof-strip'),
    globalCss,
  });
  const expectedFailure = mutated.errors.some((error) => error.includes('critical.css') && error.includes('.hero-proof-strip'));
  if (!expectedFailure) {
    report(mutated, null, 'CSS first-viewport parity self-test');
    console.error('');
    console.error('CSS first-viewport parity self-test failed: removed .hero-proof-strip was not reported.');
    process.exit(1);
  }
  console.log('CSS first-viewport parity self-test passed.');

  const deadSelectorMutation = auditDeadCssSelectors(
    new Map([['src/styles/global.css', `${globalCss}\n.ghost-panel .ghost-child{color:red}`]]),
    surface,
  );
  const expectedDeadSelectorFailure = deadSelectorMutation.findings.some(
    (finding) => finding.name === 'ghost-panel' || finding.name === 'ghost-child',
  );
  if (!expectedDeadSelectorFailure) {
    report(mutated, deadSelectorMutation, 'CSS dead-selector self-test');
    console.error('');
    console.error('CSS dead-selector self-test failed: synthetic ghost selectors were not reported.');
    process.exit(1);
  }
  console.log('CSS dead-selector self-test passed.');
}

const result = auditCss({ criticalCss, globalCss });
const deadSelectorResult = auditDeadCssSelectors(
  new Map([
    ['src/styles/critical.css', criticalCss],
    ['src/styles/global.css', globalCss],
  ]),
  surface,
);
report(result, deadSelectorResult);

if (result.errors.length > 0) {
  console.error('');
  console.error('CSS first-viewport parity audit failed:');
  for (const error of result.errors) console.error(`  - ${error}`);
  process.exit(1);
}

if (deadSelectorResult.findings.length > 0) {
  console.error('');
  console.error('CSS dead-selector audit failed:');
  for (const finding of deadSelectorResult.findings) {
    console.error(`  - ${finding.file}:${finding.line} selector "${finding.selector}" references missing ${finding.kind} "${finding.name}".`);
  }
  process.exit(1);
}

console.log('CSS first-viewport parity audit passed.');
console.log('CSS dead-selector audit passed.');
