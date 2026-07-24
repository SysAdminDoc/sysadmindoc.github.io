# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.26.0
Last normalized: 2026-07-24

## Research-Driven Additions

### P0

### P1

### P2

## Research-Driven Additions (2026-07-24 pass)

### P2

- [ ] P3 — Custom Pagefind result UI for matched-field badges / plain excerpts (only if UX demands it)
  Why: Nice-to-have result-quality polish — a "matched: title/tag" badge and unhighlighted snippets in contexts where `<mark>` is noisy.
  Correction (2026-07-24): The relevance concern this item was raised for is ALREADY resolved — the shipped `tests/playwright/search-corpus.spec.mjs` verifies every representative query returns the correct top result with distinct, useful excerpts, and Pagefind 1.5 already auto-weights headings/metadata above body text (the corpus confirms metadata-aware ranking). The remaining `matchedMetaFields` and `plain_excerpt` features are NOT exposed by the Pagefind component-ui template bundle (`dist/pagefind/pagefind-component-ui.js` interpolates `sub_results` but not `matchedMetaFields`/`plain_excerpt`), so they require abandoning the accessible, offline-capable component-ui for a full custom `pagefind.search()` UI rewrite. Not justified against a working, corpus-gated search; downgraded to P3.
  Touches: a from-scratch search UI on the low-level Pagefind JS API (input, filtering, summary, results, sub-results, a11y, offline) replacing `<pagefind-*>` in `src/pages/search.astro`.
  Acceptance: If pursued, a custom result renderer shows a matched-metadata badge and uses `plain_excerpt` where marks are undesirable, WITHOUT regressing the relevance corpus, the a11y/axe checks, or offline search parity.
  Complexity: L

