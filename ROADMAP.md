# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.27.0
Last normalized: 2026-07-24

## Research-Driven Additions

### P2

- [ ] P2 — Adopt Astro 7's agent-oriented dev tooling
  Why: This repo is driven almost entirely by coding agents, and Astro 7 shipped a background dev-server mode with automatic agent detection, structured JSON logging, and a `/_astro/status` health endpoint — none of which are used, so agents currently poll a foreground server and parse human-formatted logs.
  Evidence: Astro 7.0 release notes (see RESEARCH.md); `package.json` `dev` script is a bare `astro dev`; installed Astro is 7.1.3.
  Touches: `package.json` scripts, `CLAUDE.md` build/run section, `README.md` Develop section.
  Acceptance: A documented `dev:agent` script runs `astro dev --background`, the health endpoint is reachable, and the working notes explain when to prefer it over `npm run dev`.
  Complexity: S

- [ ] P2 — Make skipped Playwright specs visible in the preflight summary
  Why: `tests/playwright/interaction-smoke.spec.mjs` silently `test.skip`s the screenshots-gallery facet whenever live-app data has a single category — the current state — so a suite reporting "44 passed, 2 skipped" can hide a permanently dormant path.
  Evidence: `tests/playwright/interaction-smoke.spec.mjs:798-801`; the v0.27.0 audit found a real `[hidden]` defect on exactly that skipped path, caught only by a unit test.
  Touches: `playwright.interactions.config.mjs` (reporter), or a preflight step that fails when the skip count exceeds a pinned expected set.
  Acceptance: `npm run audit:interactions` surfaces which specs skipped and why; an unexpected new skip fails the run rather than passing quietly.
  Complexity: S

- [ ] P2 — Correct the tracked-markdown claim in `AGENTS.md`
  Why: `AGENTS.md` states README.md is "the ONLY .md tracked in git", which is false and has already caused a session to treat RESEARCH.md and ROADMAP.md as gitignored deliverables.
  Evidence: `git ls-files | grep '\.md$'` returns CHANGELOG.md, README.md, RESEARCH.md, ROADMAP.md, archive/screenshots/README.md. `CLAUDE.md` and `AGENTS.md` are the gitignored pair.
  Touches: `AGENTS.md`.
  Acceptance: The allowed-root-level-.md section names exactly which files are tracked and which are gitignored, matching `git ls-files`.
  Complexity: S

### P3

- [ ] P3 — Scaffold script for new interior routes
  Why: Adding an interior route requires ~12 coordinated registration edits; the enumeration lives only in prose, making partial registration the most likely future defect class.
  Evidence: `CLAUDE.md` Gotchas enumerates the registration points (interior-og-pages, page-freshness + pinned test array, audit-schema representativeRoutes, audit-image-pipeline requiredInteriorOgSlugs, InteriorNav ActiveRoute, cmdk quick link, Base cmdk section, Playwright routes, csp-audit pinned counts).
  Touches: new `scripts/scaffold-route.mjs`, `package.json`, `CLAUDE.md`.
  Acceptance: `node scripts/scaffold-route.mjs <slug>` creates the page stub and patches every registration point, or fails loudly listing the ones it could not patch; a dry-run mode reports the diff without writing.
  Complexity: M

## Deep audit follow-ups (2026-07-25 pass)

### P2

- [ ] P2 — Give the homepage catalog preview a filter handoff to `/catalog/`
  Why: The preview renders the top 84 of 178 projects, so a category filter there
  silently searches a subset. Zero-count chips are no longer rendered (v0.27.0),
  but a category with 3 preview matches and 27 archive matches still shows 3 with
  no signal that more exist. The no-results state offers "Browse all 178 projects";
  a filtered-but-partial state offers nothing equivalent.
  Where: `src/components/CatalogSection.astro`, `public/scripts/home-catalog.js`,
  `src/data/catalog-render.ts`.
  Acceptance: When a filter/search on the preview surface matches fewer entries
  than the full archive holds for that filter, the status line links to
  `/catalog/?cat=…` carrying the active filter/search/sort state.

### P3

- [ ] P3 — Refresh `_releases.json` to clear inherited mid-word truncations
  Why: `bodyFirst` values cached before v0.27.0 were hard-cut at 220 characters,
  so a handful of `/releases/` summaries still end on a partial word ("…Settings
  sear"). Markdown is now stripped at render time, but the lost characters cannot
  be recovered from the cache. The generator produces word-boundary summaries with
  an ellipsis, so this clears on the next token-backed data refresh.
  Where: `src/data/_releases.json` (generated, gitignored), `npm run fetch-stars`.
  Acceptance: After a refresh, no `/releases/` summary ends mid-word.

### Not audited in the 2026-07-25 pass

These areas were not exercised and may still hold defects:

- Playwright visual-regression baselines — they are Linux-generated and cannot be
  compared on this Windows worktree (see the P2 entries in `Roadmap_Blocked.md`).
- `scripts/audit-csp.mjs` (~34 KB) and `scripts/audit-public-endpoints.mjs`
  (~30 KB) internals — both were run and pass, but their logic was not reviewed.
- `src/pages/og/[slug].png.ts` satori/resvg rendering — output was not visually
  inspected (a redesign of it is already tracked as P0 in `Roadmap_Blocked.md`).
- `scripts/publish-pages.mjs` and the live deploy path — not executed.
- The `/resume/` print stylesheet — not verified in a print preview.
- Pagefind result relevance — already covered by the shipped search corpus spec.

## Research-Driven Additions (2026-07-24 pass)

### P2

- [ ] P3 — Custom Pagefind result UI for matched-field badges / plain excerpts (only if UX demands it)
  Why: Nice-to-have result-quality polish — a "matched: title/tag" badge and unhighlighted snippets in contexts where `<mark>` is noisy.
  Correction (2026-07-24): The relevance concern this item was raised for is ALREADY resolved — the shipped `tests/playwright/search-corpus.spec.mjs` verifies every representative query returns the correct top result with distinct, useful excerpts, and Pagefind 1.5 already auto-weights headings/metadata above body text (the corpus confirms metadata-aware ranking). The remaining `matchedMetaFields` and `plain_excerpt` features are NOT exposed by the Pagefind component-ui template bundle (`dist/pagefind/pagefind-component-ui.js` interpolates `sub_results` but not `matchedMetaFields`/`plain_excerpt`), so they require abandoning the accessible, offline-capable component-ui for a full custom `pagefind.search()` UI rewrite. Not justified against a working, corpus-gated search; downgraded to P3.
  Touches: a from-scratch search UI on the low-level Pagefind JS API (input, filtering, summary, results, sub-results, a11y, offline) replacing `<pagefind-*>` in `src/pages/search.astro`.
  Acceptance: If pursued, a custom result renderer shows a matched-metadata badge and uses `plain_excerpt` where marks are undesirable, WITHOUT regressing the relevance corpus, the a11y/axe checks, or offline search parity.
  Complexity: L

