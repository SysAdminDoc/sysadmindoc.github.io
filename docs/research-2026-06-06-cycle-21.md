# Research Cycle 21 - T142 staged style-element CSP implementation

Date: 2026-06-06
Scope: `sysadmindoc.github.io` style-element CSP policy, Astro stylesheet inlining, built-output CSP audit, performance verification, and Playwright harness compatibility.

## Orientation

Cycle 20 completed T141, so this cycle tested and implemented the T142 staged policy:

```text
style-src 'self';
style-src-elem 'self' <critical CSS hash> <no-JS fallback hash>;
style-src-attr 'unsafe-inline';
```

The goal was to remove style-element `unsafe-inline` without touching T143's inline style-attribute work yet.

## Implemented

### Astro stylesheet output

`astro.config.mjs` now sets:

```js
build: {
  inlineStylesheets: 'never',
  assets: '_assets',
  concurrency: 1,
}
```

The installed Astro config types document `inlineStylesheets` as `'always' | 'auto' | 'never'`. They also document `auto` as inlining project stylesheets smaller than Vite's asset inline limit, which matched Cycle 19's six small route chunks.

### Active CSP

`src/layouts/Base.astro` now emits:

```text
style-src 'self';
style-src-elem 'self' 'sha256-IgolL9OcCAAkbJBdeHMz7R8+koltdJ8QZkkoG6h27v4=' 'sha256-fhXEzLRL2WG8EuNEefYBMuJw0UHROgxh4zJA9nteUUA=';
style-src-attr 'unsafe-inline';
```

The two hashes cover:

- `src/styles/critical.css`
- the literal no-JS reveal fallback in `src/layouts/Base.astro`

`test/csp-audit.test.mjs` now verifies those hashes against the current source strings and verifies that `inlineStylesheets` remains `never`.

### Playwright harness compatibility

The existing Playwright audit injected a stability stylesheet with `page.addStyleTag({ content })`, which correctly violates the new `style-src-elem` policy. The harness now fulfills a same-origin `__playwright-stability.css` route and loads it with `page.addStyleTag({ url })`, which is allowed by `style-src-elem 'self'`.

`playwright.audits.config.mjs` also blocks service workers so cached assets do not interfere with deterministic built-output visual and axe checks.

## Measured output

Baseline from Cycle 19/20 under `inlineStylesheets: 'auto'`:

- Full rendered HTML files: 194.
- Inline style blocks: 394.
- Stylesheet/preload links: 770.
- Routes with more than two style blocks: 6.
- Staged `style-src-elem` candidate blocked those six auto-inlined route chunks.

After T142 in a normal local build:

- Full rendered HTML files: 194.
- Inline style blocks: 388.
- Stylesheet/preload links: 776.
- Routes with more than two style blocks: 0.
- CSS assets: 12, including the six formerly inlined route chunks.
- Strict staged `style-src-elem` candidate: PASS.

A fixture/dist check after generated fixtures showed the same shape at smaller scale:

- Fixture rendered HTML files: 33.
- Inline style blocks: 66.
- Stylesheet/preload links: 132.
- Routes with more than two style blocks: 0.
- Strict staged `style-src-elem` candidate: PASS.

## Verification

Completed from the raw shared-folder checkout with direct Node commands:

```text
node --check scripts/audit-csp.mjs
node --test test/csp-audit.test.mjs
node scripts/audit-csp.mjs --candidate-style-src-elem "'self' 'sha256-IgolL9OcCAAkbJBdeHMz7R8+koltdJ8QZkkoG6h27v4=' 'sha256-fhXEzLRL2WG8EuNEefYBMuJw0UHROgxh4zJA9nteUUA='"
node scripts/audit-csp.mjs --candidate-style-src-attr "'unsafe-inline'" --strict
```

Completed from a normal local throwaway copy:

```text
npm ci
npm test
npm run build
node scripts/audit-csp.mjs --dist <local-dist> --candidate-style-src-elem "<staged tokens>" --strict
npm run audit:perf -- --base <local-preview> --strict --lcp 60000 --event 500 --out .tmp/perf-t142.json
npx playwright test --config=playwright.audits.config.mjs -g "axe accessibility audit"
```

Results:

- `npm test`: 67 passed.
- `npm run build`: passed full validation/build/audit chain.
- Strict built staged `style-src-elem`: passed.
- Performance/bfcache audit: PASS, zero issues. Home mobile LCP was 272ms in the local sample, CLS 0, bfcache restored on all sampled routes, no horizontal overflow.
- Playwright axe subset: 6 passed under the stricter CSP.

## Remaining verification gap

Full `npm run audit:playwright` still fails the eight screenshot comparisons. The actual screenshots are coherent and styled; differences are broad data/focus/baseline drift rather than missing CSS or blank pages. Examples observed:

- current live profile-feed ordering changed the desktop hero's Signature Builds list versus the checked-in baseline;
- mobile baseline focus state differs from the current run;
- both live and fixture attempts still show screenshot deltas after the harness became CSP-compatible.

A deterministic fixture `build:ci` attempt also exposed an existing endpoint-audit threshold mismatch: `llms.txt` useful links were 44 while the audit expects at least 50. That should be handled before treating fixture visual baselines as authoritative.

This became T145 instead of blocking the style-element CSP change.

## Roadmap changes

- Marked T142 complete in `TODO.md`.
- Added T145 for Playwright visual-baseline stabilization.
- Updated `ROADMAP.md`, `PROJECT_CONTEXT.md`, and `AUTONOMOUS-LOOP-STATE.md`.

## Continuation state

### Last completed cycle

Cycle 21: T142 staged style-element CSP implementation.

### Current focus

Continue with T143 and T144/T145 follow-up verification.

### Important findings so far

- Style-element CSP can now run without `unsafe-inline` in built output.
- `style-src-attr 'unsafe-inline'` remains required for 16 static source attributes and six runtime `style.cssText` writes.
- Playwright axe is compatible with the stricter policy after moving stability CSS to a same-origin route.
- Playwright screenshot baselines are stale or insufficiently deterministic and should be stabilized before they are used to approve final CSP removal.

### Next best actions

1. Classify T143 static `style=""` attributes by migration type.
2. Classify the six runtime `style.cssText` writes in `public/scripts/main.js` and `public/scripts/cmdk.js`.
3. Add a T144 candidate-policy browser audit that records `securitypolicyviolation` events.
4. Work T145 so the visual baseline gate becomes deterministic again.
