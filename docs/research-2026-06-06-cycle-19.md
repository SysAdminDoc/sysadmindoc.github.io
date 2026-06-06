# Research Cycle 19 - T142 style-block CSP feasibility

Date: 2026-06-06
Scope: `sysadmindoc.github.io` critical CSS hashes, Astro stylesheet inlining, built style-block count, and T142 implementation sequencing.

## Orientation

Cycle 18 made T141 implementation-ready. Cycle 19 inspected whether T142 should primarily hash known inline blocks, migrate Astro style blocks, or change Astro build output behavior.

## Files and output inspected

- `astro.config.mjs`
- `src/layouts/Base.astro`
- `src/styles/critical.css`
- existing built `dist/index.html`
- existing built `dist/projects/project-nomad-desktop/index.html`
- existing built `dist/_assets/*.css`

## Current build behavior

`astro.config.mjs` uses:

```js
build: {
  inlineStylesheets: 'auto',
  assets: '_assets',
  concurrency: 1,
}
```

Astro's current styling docs say production CSS is chunked; with the default/auto behavior, chunks above 4kB are linked as stylesheets while smaller chunks are inlined as `<style type="text/css">`. The docs also state `inlineStylesheets: 'never'` keeps project styles external.

Source: https://docs.astro.build/en/guides/styling/

Existing `dist/_assets` CSS files show larger chunks are external:

```text
global.BIB7mC1A.css   119365
_slug_.BGkoF_7y.css     9333
index.Cs2xcRX4.css      8769
_slug_.BO3b03aN.css     5512
archive.BZ2f3pQs.css    5271
timeline.BEm-sFQH.css   4400
```

The existing built homepage and project page each have two `<style>` blocks:

- The first-viewport critical CSS from `src/layouts/Base.astro:113`.
- The no-JS reveal fallback inside `<noscript>` from `src/layouts/Base.astro:134`.

Only six built routes have more than those two style blocks:

```text
dist/resume/index.html        3
dist/search/index.html        3
dist/uses/index.html          3
dist/healthcare-it/index.html 3
dist/now/index.html           3
dist/releases/index.html      3
```

This means the 394 rendered style blocks are mostly:

- 194 pages x critical CSS block = 194.
- 194 pages x no-JS fallback block = 194.
- Six route-specific auto-inlined CSS chunks = 6.

## Hash feasibility

The current raw critical CSS hash is stable for the existing source:

```text
sha256-IgolL9OcCAAkbJBdeHMz7R8+koltdJ8QZkkoG6h27v4=
```

The no-JS fallback block hash is:

```text
sha256-fhXEzLRL2WG8EuNEefYBMuJw0UHROgxh4zJA9nteUUA=
```

Those hashes match the built-output candidate blocker hashes observed in Cycle 17/19. This makes a hash-based `style-src-elem` path realistic for the two intentional layout-level inline blocks.

## T142 implementation blueprint

### Preferred staged approach

1. Complete T141 first so the audit can model `style-src-elem` separately from `style-src-attr`.
2. Add a build-time CSP hash helper in `src/layouts/Base.astro` or a shared data/helper module:
   - compute `sha256-${base64(sha256(criticalCss))}`;
   - include the known no-JS fallback hash or compute it from a shared string constant;
   - emit those hashes in `style-src-elem` while keeping `style-src-attr 'unsafe-inline'` staged separately.
3. Run an experiment with `build.inlineStylesheets: 'never'` to eliminate the six route-specific auto-inlined CSS chunks.
4. Compare performance and output:
   - built style blocks should drop from 394 to 388 if only route chunks change;
   - CSS request count may increase by six route-specific CSS files;
   - homepage and project-page LCP must stay within current budgets.
5. If `inlineStylesheets: 'never'` causes no unacceptable regression, keep it and let `style-src-elem 'self' <critical-hash> <noscript-hash>` pass.
6. If `inlineStylesheets: 'never'` regresses performance or output size, keep `auto` and add hash reporting for the six extra route chunks until their source styles are migrated or externalized.

### Policy shape to test after T141

Do not remove all style unsafe-inline in one step. Test a staged policy:

```text
style-src 'self';
style-src-elem 'self' 'sha256-IgolL9OcCAAkbJBdeHMz7R8+koltdJ8QZkkoG6h27v4=' 'sha256-fhXEzLRL2WG8EuNEefYBMuJw0UHROgxh4zJA9nteUUA=';
style-src-attr 'unsafe-inline';
```

This should reduce style-element exposure while leaving T143's attribute work explicit and measurable.

### Verification requirements

- T141 split audit candidate for `style-src-elem` passes against built output after either hashing route inline blocks or setting `inlineStylesheets: 'never'`.
- `node scripts/audit-csp.mjs --dist` reports the expected style-block count and hashes.
- `npm run build` from a normal local checkout/worktree path.
- `npm run audit:perf` verifies no LCP, CLS, bfcache, overflow, console, or event-timing regression.
- `npm run audit:playwright` verifies desktop/mobile visual baselines.
- Browser candidate-policy audit from T144 verifies no `securitypolicyviolation` events on representative routes.

## Roadmap changes

Cycle 19 deepens T142 rather than adding a new TODO ID. The key implementation decision is whether to set `build.inlineStylesheets: 'never'` after measuring performance. The policy should not attempt to remove `style-src-attr 'unsafe-inline'` until T143 is complete.

## Continuation state

### Last completed cycle

Cycle 19: T142 style-block CSP feasibility.

### Current focus

Continue with T141 implementation first, then test the T142 staged policy.

### Important findings so far

- Rendered style blocks are mostly two repeated layout-level blocks per page.
- Only six current built routes have a third auto-inlined style block.
- The critical CSS and no-JS fallback hashes are stable and already visible in the CSP audit output.
- `inlineStylesheets: 'never'` is a plausible experiment for eliminating route-specific built inline chunks, but it needs performance and visual verification.

### Next best actions

1. Implement T141 split audit support.
2. Add T142 audit expectations for critical/no-JS hashes.
3. Experiment with `inlineStylesheets: 'never'` in a non-committed branch/worktree or patch and compare built style-block counts plus performance.
4. Keep `style-src-attr 'unsafe-inline'` until T143 removes static and runtime style-attribute blockers.

### Files still to inspect

- `src/layouts/Base.astro` for CSP string construction cleanup.
- `astro.config.mjs` for the `inlineStylesheets` experiment.
- `scripts/audit-performance.mjs` thresholds before using perf results to accept/reject `inlineStylesheets: 'never'`.

### Searches still to run

- `rg -n "inlineStylesheets|assetsInlineLimit" astro.config.mjs README.md PROJECT_CONTEXT.md`
- `rg -n "<style" dist | measure route-specific built inline chunks after a fresh build`
- `rg -n "criticalCss|Content-Security-Policy" src/layouts/Base.astro scripts test`
