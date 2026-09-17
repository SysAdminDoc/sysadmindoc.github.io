# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Research-Driven Additions

Added 2026-09-04 from the research pass recorded in RESEARCH.md. The 2026-08-20 additions under this heading were all completed and have been removed per the ROADMAP hygiene rule.

### P0

### P1

- [ ] P1 — Smoke script fetch timeout
  Why: `scripts/smoke-live-site.mjs` has no `AbortController` timeout on any `fetch()` call. A hung VPS could stall the deploy pipeline for 16+ minutes (8 retries * OS socket timeout). `fetch-stars.mjs` already uses `fetchWithTimeout()`.
  Where: `scripts/smoke-live-site.mjs`

- [ ] P1 — Focus ring color consistency in light mode
  Why: Cards and palette items use `var(--grn)` (olive in light theme) while controls use `var(--focus-outline)` (blue). Two visual systems for the same interaction. Dark mode already matches.
  Where: `src/styles/layers/audit.css` lines 10, 62, 131

- [ ] P1 — `prefersReducedMotion` is a one-time snapshot
  Why: `shared.js` evaluates `matchMedia('(prefers-reduced-motion: reduce)').matches` once at load. Users who toggle the OS setting mid-session keep the stale value. The fix is `matchMedia(...).addEventListener('change', ...)`.
  Where: `public/scripts/shared.js` lines 68-69, `public/scripts/section-jump-nav.js` line 9

### P2

- [ ] P2 — Bundle-size audit `collectFiles` is non-recursive
  Why: The function scans only immediate children. JS files in `dist/_assets/chunks/` or subdirectories bypass the budget.
  Where: `scripts/audit-bundle-size.mjs` lines 43-59

- [ ] P2 — A11y audit misses tabindex-based focusable elements
  Why: The `no-aria-hidden-focusable` rule only matches five intrinsic focusable elements. A `<div tabindex="0" aria-hidden="true">` would be an invisible keyboard trap but passes undetected.
  Where: `scripts/audit-a11y.mjs` lines 72-83

- [ ] P2 — Content-visibility print test regex crosses CSS block boundaries
  Why: `[\s\S]*` in the `@media print` regex matches across `}` delimiters and could match declarations outside the print block.
  Where: `test/content-visibility.test.mjs` line 38

- [ ] P2 — `forced-colors:active` border fixes are cascade-dead
  Why: The fixes sit inside CSS layers but the v0.33 design system is unlayered, so `border:0` on `.theme-toggle` etc. wins. Windows High Contrast Mode users may lose visual boundaries.
  Where: `src/styles/layers/polish.css` lines 590-605

- [ ] P2 — /now page updated date is 2026-07-23
  Why: Nearly two months stale. The `validate-project-data.mjs` freshness guard should catch it.
  Where: `src/data/curated.ts` line 83

### P3

- [ ] P3 — Cross-origin SW handler has no behavioral test coverage
  Why: `putTimestamped` and `freshCachedOrOffline` in `sw.js` are verified only by source-pattern regex. A bug in the TTL boundary or header-copy path would pass all existing tests.
  Where: `test/offline-fallback.test.mjs`, `public/sw.js` lines 35-53, 148-159

- [ ] P3 — Dead CSS from iterative redesigns (~40KB)
  Why: At least 6 design iterations progressively redefine tokens and styles. v0.33 is unlayered so every layered property it touches is dead code. Increases load time.
  Where: All layer CSS files
