# Cycle 26 Research - Generated style CSP hashes

Date: 2026-06-06
Focus: T148 generated `style-src-elem` hashes

## Orientation

Cycles 24 and 25 made the rendered CSP path strict: `build:ci` now verifies that rendered style blocks and stylesheet links are allowed by the active `style-src-elem` policy, and that every built HTML file carries one consistent CSP meta policy.

The remaining source-side maintenance gap was that `Base.astro` still stored the critical CSS and no-JS fallback hashes as literal strings.

## Implementation

`Base.astro` now:

- imports `node:crypto`;
- keeps the no-JS reveal fallback in a `noJsRevealCss` source constant;
- computes `sha256Csp(criticalCss)` from the raw imported critical stylesheet;
- computes `sha256Csp(noJsRevealCss)` from the same string rendered in `<noscript>`;
- assembles `contentSecurityPolicy` with the computed `style-src-elem` tokens.

`scripts/audit-csp.mjs` now resolves the generated `contentSecurityPolicy` expression in source mode for this layout. That keeps the source inventory output useful while the rendered dist audit remains the final output proof.

## Verification

Commands run:

```text
node --check scripts/audit-csp.mjs
node --test test/csp-audit.test.mjs
node scripts/audit-csp.mjs
npm run build:ci
npm test
npm run check
git diff --check
```

The source CSP audit still reports the resolved active policy with generated hashes. The rendered build-output audit still reports:

```text
built HTML files scanned: 194
CSP meta tags: 194
files with one CSP meta: 194/194
unique CSP policies: 1
inline style blocks: 388
stylesheet/preload links: 776
PASS - active policy allows all current style element/link surfaces.
```

## Follow-up

T149 should add a focused rendered interaction smoke under the final generated style CSP policy. Keep it limited to interactions, console errors, and horizontal overflow; screenshot baselines remain covered by the existing Playwright audit.
