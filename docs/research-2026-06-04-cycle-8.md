# Project Research and Feature Plan

Cycle: 8
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

Cycle 8 picked up the latest deploy evidence after the Cycle 7 push. The Cycle 7 deploy succeeded, and the earlier rendered-schema deploy logs now give fresh proof that T111 is still real on Astro 6.4.4: `fix-html-structure` repaired 194 built HTML files. The same logs exposed a separate search-quality gap: Pagefind is indexing from every `<body>` because no route declares `data-pagefind-body`.

Top opportunities:

1. **Sharpen T111** - The Astro 6.4.4 build still needs the HTML fixer; keep the root-cause/compressHTML investigation open.
2. **T132 P2** - Scope Pagefind indexing to intentional page content instead of every body.

## Evidence Reviewed

Current repo state:

- Current head: `af8bbb7 docs: add cycle 7 research queue`.
- Deploy run `26961030858` for `af8bbb7` completed successfully.
- Deploy run `26960045875` for `9070d4d` completed successfully and included the relevant build logs.
- The worktree still contains implementer-owned source edits for T124 ranking-rationale UI; those edits were not staged.
- Untracked local `AGENTS.md` remains untracked and should not be staged.

Files and logs inspected:

- `scripts/fix-html-structure.mjs`
- `astro.config.mjs`
- `package.json`
- `src/layouts/Base.astro`
- `src/pages/search.astro`
- `src/pages/projects/[slug].astro`
- `TODO.md`
- `docs/research-2026-06-04-cycle-6.md`
- GitHub Actions deploy log for run `26960045875`

External source reviewed:

- Pagefind indexing docs: https://pagefind.app/docs/indexing/

## Current Product Map Delta

Search is now a first-class route using Pagefind web components and the generated static index. T35 added Category facets, and T125 will audit facet/index contracts. The search route copy promises rendered project pages, README excerpts, release history, timeline entries, and archive decisions.

The build log shows Pagefind is currently indexing every page body:

- `Did not find a data-pagefind-body element on the site.`
- `Indexed 194 pages`
- `Indexed 21262 words`
- `Indexed 1 filter`

That means the index is functional, but broad. `Base.astro` renders global command-palette dialog copy on every page after the slot, and Pagefind's docs only list built-in skipping for organizational/programmatic elements such as `nav`, `footer`, `script`, and `form`; the global `dialog` is not an obvious skipped element.

## Existing Feature Improvements

### T111 - Astro HTML structure fixer remains active

- Status: Still open.
- Fresh evidence: Deploy run `26960045875` on Astro 6.4.4 logged `fix-html-structure: repaired 194 file(s); script order OK`.
- Interpretation: The Astro 6.4.4 upgrade did not remove the malformed `</html>` emission under the current config. The next implementer pass should still bisect `compressHTML`, head/body JSON-LD placement, and related Astro output behavior instead of converting the fixer to assert-only.

### T132 - Intentional Pagefind body scoping

- Priority: P2.
- Why now: T125 will audit facets, but it does not solve what content Pagefind indexes. Whole-body fallback can dilute results with repeated layout/UI text.
- Impact: 3/5 because search quality is a user-facing discovery surface, and the current index likely includes global dialog/help text on every page.
- Effort: 2/5 if the implementer annotates shared content wrappers and adds a small search-audit assertion.
- Risk: Medium because Pagefind excludes any page without `data-pagefind-body` once at least one page uses it. The implementation must annotate every route intended to stay searchable.

Recommended implementation shape:

- Add `data-pagefind-body` to the meaningful content container for homepage, project detail, language lanes, search, releases, timeline, archive, now, uses, resume, healthcare IT, and 404 if it should remain searchable.
- Keep project-page `data-pagefind-filter` and metadata outside/inside the body according to Pagefind's documented behavior; filters outside the body can still be used.
- Exclude repeated global UI, especially the command-palette dialog in `Base.astro`, from indexing with body scoping or `data-pagefind-ignore="all"`.
- Extend T125's future `search:audit` to assert the build no longer emits the "Did not find a data-pagefind-body" fallback and still indexes intended routes/categories.

## Prioritized Roadmap

### Now

- [ ] P2 - Scope Pagefind indexing to intentional content.
  - Evidence: Run `26960045875` logged whole-body fallback and indexed 194 pages; Pagefind docs recommend `data-pagefind-body` for narrowing indexed sections.
  - Verify: `npm run build && npm run search:index`; no whole-body fallback in logs; expected pages/categories remain indexed.

### Next

- [ ] P2 - Continue T111 root-cause work with Astro 6.4.4 evidence.
  - Evidence: `fix-html-structure` still repaired 194 files in deploy run `26960045875`.
  - Verify: Build with targeted config variants; identify whether `compressHTML`, head-injected scripts, or another Astro behavior causes the misplaced closing tag.

## Quick Wins

- Add a Pagefind log assertion to the future T125 `search:audit`.
- Add `data-pagefind-ignore="all"` to the global command-palette dialog if body scoping is staged gradually.

## Explicit Non-Goals

- Do not remove Pagefind facets; T132 is about indexed content scope, not filter UI.
- Do not mark T111 done. The latest deploy proves the fixer still mutates output.
- Do not edit T124 in-progress source from the research lane.

## Appendix - Sources

Repository and workflow sources:

- `scripts/fix-html-structure.mjs` - current mutating HTML repair and script-order guard.
- `package.json` - `build:ci` runs Astro build, HTML repair, SW stamp, Pagefind indexing, and schema audit.
- `src/layouts/Base.astro` - global command-palette dialog and quick-link data render on every page.
- `src/pages/search.astro` - Pagefind route and component setup.
- `src/pages/projects/[slug].astro` - current Category filter metadata.
- GitHub Actions deploy run `26960045875` - `fix-html-structure: repaired 194 file(s); script order OK`; Pagefind whole-body fallback; 194 pages indexed; 21,262 words; 1 filter.
- GitHub Actions deploy run `26961030858` - Cycle 7 docs deploy completed successfully.

External sources:

- Pagefind indexing docs for default body indexing, `data-pagefind-body`, and `data-pagefind-ignore`: https://pagefind.app/docs/indexing/
