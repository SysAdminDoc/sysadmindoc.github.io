# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.24
Last normalized: 2026-06-29

## Research-Driven Additions

### P0

### P1

### P2

- [ ] P2 — Reduce homepage catalog DOM cost without losing static access
  Why: The built homepage carries about 400 KB and 2,254 catalog nodes, increasing parse, style, memory, and interaction cost as the portfolio grows.
  Evidence: built `dist/index.html`, `scripts/audit-dom-size.mjs`, Chrome/web.dev excessive-DOM guidance.
  Touches: homepage/catalog route architecture, `CatalogEntry.astro`, catalog URL state, Pagefind indexing, sitemap/feed links, DOM/bundle/interaction tests.
  Acceptance: The homepage stays below a measured <=1,400-node budget; all reviewed projects remain reachable with JavaScript disabled and indexable through static pagination or an equivalent static boundary; direct GitHub links and filter/search URL semantics remain intact.
  Note (2026-07-24): The homepage already PASSES every current DOM budget (`npm run dom:audit`: 2254/2750 nodes, 178/220 cards, 401/500 KB). The proposed 1,400-node target is aspirational, not a current failure, and is only reachable by restructuring the catalog into static pagination (or an equivalent boundary) — a large architectural change that touches no-JS access, filter/sort/view URL state, Pagefind indexing, and SEO on a working, gated homepage. High risk for marginal gain; keep as a deliberate future bet, not a routine drain item.
  Complexity: L

## Research-Driven Additions (2026-07-24 pass)

### P2

- [ ] P3 — Custom Pagefind result UI for matched-field badges / plain excerpts (only if UX demands it)
  Why: Nice-to-have result-quality polish — a "matched: title/tag" badge and unhighlighted snippets in contexts where `<mark>` is noisy.
  Correction (2026-07-24): The relevance concern this item was raised for is ALREADY resolved — the shipped `tests/playwright/search-corpus.spec.mjs` verifies every representative query returns the correct top result with distinct, useful excerpts, and Pagefind 1.5 already auto-weights headings/metadata above body text (the corpus confirms metadata-aware ranking). The remaining `matchedMetaFields` and `plain_excerpt` features are NOT exposed by the Pagefind component-ui template bundle (`dist/pagefind/pagefind-component-ui.js` interpolates `sub_results` but not `matchedMetaFields`/`plain_excerpt`), so they require abandoning the accessible, offline-capable component-ui for a full custom `pagefind.search()` UI rewrite. Not justified against a working, corpus-gated search; downgraded to P3.
  Touches: a from-scratch search UI on the low-level Pagefind JS API (input, filtering, summary, results, sub-results, a11y, offline) replacing `<pagefind-*>` in `src/pages/search.astro`.
  Acceptance: If pursued, a custom result renderer shows a matched-metadata badge and uses `plain_excerpt` where marks are undesirable, WITHOUT regressing the relevance corpus, the a11y/axe checks, or offline search parity.
  Complexity: L

