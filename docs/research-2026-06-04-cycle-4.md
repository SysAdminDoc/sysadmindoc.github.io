# Project Research and Feature Plan

Cycle: 4
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

The latest pushed implementation added the build-time `Recommended` catalog ranking signal and deployed successfully. A separate in-progress working-tree change is finishing visible Pagefind Category facets on `/search/`; those source and release-note edits are not part of this research commit and must remain unstaged by the research lane.

Cycle 4 focuses on contract gaps introduced by those discovery features. The site now has two richer browse paths, but the maintainability signals lag the product surface: ranking behavior is tested only with small fixtures, the ranking rationale is mostly hidden in data attributes, and the Pagefind facet index has no automated contract audit.

Top opportunities:

1. **T123 P1** - Add a generated ranking report and drift guard for the `Recommended` catalog order.
2. **T124 P2** - Surface the `Recommended` ranking rationale accessibly in catalog and related-link UI.
3. **T125 P2** - Add a Pagefind facet/index contract audit after static search generation.

## Evidence Reviewed

Current repo state:

- `main` and `origin/main` were aligned at `92036b3 feat: add catalog ranking signal`.
- Deploy run `26954690302` for `92036b3` completed successfully.
- The working tree contained uncommitted T35/Pagefind facet implementation edits in `src/pages/search.astro` plus tracking/release-note docs. Those were treated as implementer-owned and left unstaged.
- Untracked local `AGENTS.md` points to `CLAUDE.md`; `CLAUDE.md` documents the normal local-worktree build path and warns against running npm/Astro directly from the VMware shared-folder path.

Files inspected:

- `src/data/project-ranking.mjs`
- `test/project-ranking.test.mjs`
- `src/components/CatalogEntry.astro`
- `src/pages/index.astro`
- `src/pages/projects/[slug].astro`
- `public/scripts/main.js`
- `scripts/summarize-generated-data.mjs`
- `scripts/validate-project-data.mjs`
- `scripts/audit-performance.mjs`
- `package.json`
- `TODO.md`
- `PROJECT_CONTEXT.md`
- `CLAUDE.md`

External sources reviewed:

- Pagefind filter pane docs: https://pagefind.app/docs/components/filter-pane/
- Pagefind config/faceted mode docs: https://pagefind.app/docs/components/config/
- Pagefind filtering docs: https://pagefind.app/docs/filtering/
- Pagefind metadata docs: https://pagefind.app/docs/metadata/

## Current Product Map Delta

The catalog now defaults to a deterministic rank computed at build time:

- `src/data/project-ranking.mjs` blends log-normalized stars, a 180-day recency half-life, and release-download activity.
- `src/pages/index.astro` passes `rank`, `rankScore`, and `rankLabel` into every `CatalogEntry`.
- `public/scripts/main.js` keeps explicit sort overrides while restoring `Recommended` from the data rank.
- `src/pages/projects/[slug].astro` reuses the same rank map for same-lane related links.

The search surface is also moving from plain full-text search to faceted browsing:

- Project pages already tag indexed content with `data-pagefind-filter="Category:..."` and `data-pagefind-meta="Type:..."`.
- The in-progress `/search/` change enables Pagefind faceted mode and renders `<pagefind-filter-pane>`, matching Pagefind's documented component path.
- Existing automated scripts do not assert that the generated Pagefind index contains the expected Category values or that empty-term faceted browsing returns the built pages.

## Feature Inventory Delta

| Feature | Current state | Gap |
| --- | --- | --- |
| Catalog ranking | Pure helper, fixture tests, homepage default order, related-link reuse | No full-dataset ranking summary, no operational artifact, and no drift/no-NaN guard over the generated 177-project catalog. |
| Ranking explanation | `formatProjectRankingLabel()` builds useful per-project rationale strings | `CatalogEntry.astro` stores the label as `data-rank-label`, but `aria-label`, visible copy, and related-link cards do not expose it. |
| Pagefind facets | Project pages tag Category filters; T35 working tree enables faceted component UI | No automated build artifact audit proves the generated Pagefind index exposes Category values and faceted results after `search:index`. |

## Highest-Value New Work

### T123 - Add a generated ranking report and drift guard

- Priority: P1
- Why now: The default homepage order and related-link selection now depend on an algorithm whose behavior is otherwise visible only by inspecting rendered card order.
- Impact: 4/5 because silent ranking drift can change what visitors see first without any failing test.
- Effort: 2/5 if implemented as a data-summary section or small `ranking:audit` script.
- Risk: Low if the audit reports and validates shape rather than pinning a brittle full ordering snapshot.

Recommended implementation shape:

- Reuse `computeProjectRankings()` after `profile-feed:sync`/`fetch-stars`.
- Emit top-N rows with repo, rank, score, score parts, stars, days since update, and release downloads into `data-refresh-summary/summary.md` and `summary.json`.
- Assert weights normalize, scores are finite, ranks are unique, and the top-N rows have usable names/repos.
- Keep any ordering snapshot advisory/artifact-only unless a future maintainer chooses stricter product expectations.

### T124 - Surface the Recommended ranking rationale accessibly

- Priority: P2
- Why now: `Recommended` is now the default sort, but the UI mostly tells users that projects are ranked without explaining why a specific card is high in the list.
- Impact: 3/5 because this improves trust in the default order and helps keyboard/screen-reader users understand the discovery model.
- Effort: 2/5 for compact copy in the sort/status area plus per-card accessible detail using the existing `rankLabel`.
- Risk: Medium only for layout clutter; the acceptance should require desktop/mobile overflow checks.

Recommended implementation shape:

- Reuse the existing `formatProjectRankingLabel()` output instead of introducing a second explanation path.
- Add the ranking label to accessible card context when `Recommended` is active, or expose it through a compact disclosure/control near the sort selector.
- Make related-link cards either reuse `CatalogEntry` or expose comparable rank context, since they now use the same ranking map.

### T125 - Add a Pagefind facet/index contract audit

- Priority: P2
- Why now: Visible facets depend on generated index metadata, not just Astro source. A source-only check can pass even if Pagefind output stops exposing Category filters.
- Impact: 3/5 because search remains a key static discovery route and Pagefind output is generated after Astro build.
- Effort: 2/5 for a post-build script using Pagefind output/API or generated index metadata.
- Risk: Low if it runs after `npm run build` and keeps browser screenshots under T106 rather than duplicating visual baselines.

Recommended implementation shape:

- Add `npm run search:audit` after `search:index` or as a CI follow-up.
- Assert the Category facet exists, has expected category labels, and faceted empty-term search returns public project pages.
- Compare index facet counts against the rendered project/catalog category counts with a small tolerance for non-project pages if needed.
- Keep it separate from T106 visual regression work: this item validates the search/index contract, not screenshots.

## Prioritized Roadmap

### Now

- [ ] P1 - Add generated ranking report/drift guard.
  - Evidence: Ranking affects default homepage and related links; fixture tests do not cover the generated catalog distribution.
  - Verify: `npm run profile-feed:sync && npm run fetch-stars && npm run data:summary -- --out .tmp/data-refresh --max-age-hours 48 --fail-on-stale` prints a ranking section with finite scores and top-N explanation.

### Next

- [ ] P2 - Surface Recommended rationale accessibly.
  - Evidence: `CatalogEntry.astro` writes `data-rank-label` but does not include it in `aria-label` or visible card copy.
  - Verify: Browser check at desktop and 390px mobile confirms no overflow; a11y audit sees useful rank context without duplicate noisy announcements.

- [ ] P2 - Add Pagefind facet/index contract audit.
  - Evidence: Pagefind docs say filters populate from indexed `data-pagefind-filter` content; current scripts do not assert generated Category facets after `search:index`.
  - Verify: `npm run build && npm run search:audit` proves Category facets and empty-term faceted results work from `dist/pagefind`.

## Non-goals

- Do not change ranking weights from this research lane.
- Do not replace Pagefind with a custom search stack.
- Do not stage the current T35 implementation worktree changes; they belong to the implementer lane.
- Do not add a visual-regression duplicate of T106. T125 should validate index/search data contracts.

## Appendix - Sources

Repository sources:

- `src/data/project-ranking.mjs:3-133` - rank weights, score parts, sorting, and label formatting.
- `test/project-ranking.test.mjs:11-66` - fixture-level ranking tests.
- `src/components/CatalogEntry.astro:65-99` - card aria/data attributes, including hidden `data-rank-label`.
- `src/pages/index.astro:62-68` and `573-584` - homepage rank computation and card props.
- `public/scripts/main.js:548-564` - client sort restores `Recommended` from `data-rank`.
- `src/pages/projects/[slug].astro:256-270` and `560-586` - same ranking map powers related links.
- `scripts/summarize-generated-data.mjs:59-151` - generated-data summary omits ranking distribution.
- `package.json:10-33` - build/search scripts and available audit commands.
- `scripts/audit-performance.mjs:17-21` - `/search/` is sampled for performance, not facet contract behavior.

External sources:

- Pagefind filter pane docs: https://pagefind.app/docs/components/filter-pane/
- Pagefind config and faceted mode docs: https://pagefind.app/docs/components/config/
- Pagefind filtering docs: https://pagefind.app/docs/filtering/
- Pagefind metadata docs: https://pagefind.app/docs/metadata/
