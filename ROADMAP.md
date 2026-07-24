# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.24
Last normalized: 2026-06-29

## Research-Driven Additions

### P0

### P1

### P2

- [ ] P2 — Cover complete routes and high-risk interaction states visually
  Why: First-viewport snapshots miss most long-page content and no baseline combines visual and axe checks for 404/offline, open navigation, empty/error, update, recovery, or print states.
  Evidence: `tests/playwright/portfolio-audits.spec.mjs:5-96,442-462`, `tests/playwright/interaction-smoke.spec.mjs`; competitor responsive/ARIA issue queues.
  Touches: Playwright route/state matrix, deterministic mocks, visual baselines, audit documentation.
  Acceptance: Both themes cover full pages or named section slices for every public route family at desktop/mobile; state fixtures include open navigation, catalog no-results/sort/view, command empty/error, timeline empty, SW update, offline recovery, 404, and print; each applicable state runs axe and overflow checks.
  Complexity: L

- [ ] P2 — Reduce homepage catalog DOM cost without losing static access
  Why: The built homepage carries about 400 KB and 2,254 catalog nodes, increasing parse, style, memory, and interaction cost as the portfolio grows.
  Evidence: built `dist/index.html`, `scripts/audit-dom-size.mjs`, Chrome/web.dev excessive-DOM guidance.
  Touches: homepage/catalog route architecture, `CatalogEntry.astro`, catalog URL state, Pagefind indexing, sitemap/feed links, DOM/bundle/interaction tests.
  Acceptance: The homepage stays below a measured <=1,400-node budget; all reviewed projects remain reachable with JavaScript disabled and indexable through static pagination or an equivalent static boundary; direct GitHub links and filter/search URL semantics remain intact.
  Complexity: L

- [ ] P2 — Add a deterministic Pagefind relevance corpus
  Why: Broad language queries currently produce repetitive keyword-heavy excerpts, but tuning without expected results would trade one opaque ranking for another.
  Evidence: `src/pages/search.astro:37-149`, current Python visual baseline; Pagefind filtering and sub-result documentation.
  Touches: searchable-page metadata/body boundaries, Pagefind configuration, search audit fixtures, search UI.
  Acceptance: A versioned corpus of representative role, platform, project, release, and healthcare queries asserts expected first-page results, unique useful excerpts, facets, direct links, and offline parity before any weighting/sub-result changes are accepted.
  Complexity: M

## Research-Driven Additions (2026-07-24 pass)

### P2

- [ ] P2 — Enable Trusted Types via meta CSP
  Why: Trusted Types reached cross-browser Baseline (Firefox Feb 2026), the runtime already reports zero HTML sinks (`SafeDOM`, `csp:audit`: `runtime HTML sink writes: 0`), and `require-trusted-types-for 'script'` is deliverable through `<meta http-equiv>` on GitHub Pages — so the original blocker (17 innerHTML rewrites, header-only) no longer applies.
  Evidence: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for ; https://www.uriports.com/blog/csp-trusted-types/ ; CLAUDE.md "Trusted Types Readiness"; Astro 7.1.0 `script-src-elem`/`style-src-attr` directives. Supersedes the stale "Add Trusted Types CSP directive" item in `Roadmap_Blocked.md`.
  Touches: `src/layouts/Base.astro` (CSP meta), `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`, `tests/playwright/portfolio-audits.spec.mjs`.
  Acceptance: Built pages ship `require-trusted-types-for 'script'` (plus a named default policy only if any sink reappears); the browser audit confirms zero Trusted Types violations across public routes; `csp:audit:dist` stays green; a test fails if a raw HTML sink is reintroduced.
  Complexity: M

- [ ] P2 — Adopt Pagefind 1.5 metadata weighting for skill/tag-aware ranking
  Why: Broad language/skill queries currently return repetitive keyword excerpts; Pagefind 1.5 searches metadata by default with configurable per-field weights, exposes `matchedMetaFields` for faceted result badges, and adds `plain_excerpt` for clean unhighlighted snippets — directly improving result relevance and card quality.
  Evidence: https://github.com/CloudCannon/pagefind/releases (v1.5.0, 2026-04-06); `src/pages/search.astro`, existing "deterministic Pagefind relevance corpus" item (its corpus is the prerequisite gate for accepting any weighting change).
  Touches: searchable-page `data-pagefind-meta`/weight annotations, Pagefind config, `src/pages/search.astro` result rendering, `scripts/audit-search-index.mjs`, search fixtures.
  Acceptance: Skill/tag/role metadata is weighted above body text and verified against the frozen relevance corpus; `matchedMetaFields` drives at least one result-badge facet; excerpts use `plain_excerpt` where highlight markup is undesirable; offline search parity and direct GitHub links remain intact.
  Complexity: M
  Depends on: the existing P2 "Add a deterministic Pagefind relevance corpus" item.

### P3

- [ ] P3 — Add an honest "how I work with AI" transparency statement
  Why: 2026 hiring/consulting signal consistently rates explicit AI-usage transparency (what was scaffolded vs. what judgment was applied) as a maturity marker, not a weakness — and it directly reinforces the new `/ai/` fractional-implementation pitch.
  Evidence: https://developia.substack.com/p/the-ai-hiring-revolution-why-resumes ; https://dev.to/devraj_singh7/the-portfolio-projects-that-actually-get-you-hired-in-2026-1l0e ; `src/pages/ai.astro`, `src/data/curated.ts` (manifesto/philosophy surfaces).
  Touches: `src/pages/ai.astro` or `src/data/curated.ts` (short prose block), page-freshness registration, Pagefind/OG if a new section.
  Acceptance: A concise, specific statement of how AI is used in the maintainer's build process (and the human review/judgment applied) appears on `/ai/` or the philosophy surface, single-sourced with other prose facts, and passes the a11y/link/freshness gates.
  Complexity: S

## Audit Findings — 2026-07-24

Deep audit-only pass (baseline: `npm test` = 144 pass / 0 fail; build gates not re-run this pass). This repo is heavily hardened — the JS runtime (escapeHTML/SafeDOM, guarded localStorage/JSON.parse, aborted fetches, self-disconnecting observers), the data/feed layer (escapeXml/sanitize-html on every feed and `set:html` sink, atomic tmp+rename cache writes, path-traversal containment), and a11y (icon-button aria-labels, live regions, heading order, landmarks, skip links) were all traced and confirmed clean. Findings below are the residual low-severity items; several suspected issues were investigated and rejected as false positives (sitemap endpoint leak — @astrojs/sitemap emits HTML pages only; provenance-pill white background — shadowed by a route-interior override; card-hover border tints — 1px sub-quarter-alpha, not a real defect).

### P3

- [ ] P3 — Unaudited: live-browser interaction of secondary flows
  Category: testing
  Where: dev server + Playwright interaction of `/search/` (Pagefind runtime empty/error/no-result states), `/screenshots/` filtering, cmdk open/keyboard/empty-query, service-worker offline navigation, and update-toast flow.
  Problem: This audit pass traced these paths in source and relied on the existing test suite (144 green) but did not drive them in a running browser, so runtime-only regressions (Pagefind load failure UI, focus return after cmdk close, offline navigation fallback) are not confirmed clean this pass.
  Evidence: N/A — scope declaration for the next pass, not a defect.
  Fix: Run `npm run dev` (or serve `dist/`) and exercise each flow with Playwright, asserting empty/error/offline states and focus management; fold any real regressions into new findings.
  Acceptance: Each secondary flow has an observed pass (or a filed finding); no un-exercised runtime state remains.
  Confidence: Needs-repro
  Effort: M
