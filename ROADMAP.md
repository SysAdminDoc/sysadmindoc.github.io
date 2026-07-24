# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.24
Last normalized: 2026-06-29

## Research-Driven Additions

### P0

### P1

- [ ] P1 — Make resume exports schema-valid and reading-order tested
  Why: The JSON claims JSON Resume compatibility but omits structured work dates, while the generated PDF has no machine-readable order check.
  Evidence: `src/pages/resume.json.ts`, `src/data/career.ts`, `scripts/generate-resume-pdf.mjs`; JSON Resume schema; WCAG PDF3.
  Touches: `src/data/career.ts`, resume HTML/JSON/PDF generators, schema validation and PDF text-extraction tests.
  Acceptance: Work and education records expose ISO `startDate`/`endDate`; the JSON validates against the documented JSON Resume version; HTML/JSON/PDF share the same career source; extracted PDF text contains headings and roles in logical order.
  Complexity: M

- [ ] P1 — Guarantee first-install offline access to the public route set
  Why: Only home, search, releases, and now are deterministic shell routes; other key pages work offline only after a prior online visit.
  Evidence: `scripts/stamp-sw.mjs:64-81`, `tests/playwright/sw-lifecycle.spec.mjs`; web.dev service-worker lifecycle/offline guidance.
  Touches: route inventory, `scripts/stamp-sw.mjs`, `public/sw.js`, service-worker unit and Playwright tests, cache-size audit.
  Acceptance: A fresh service-worker install can open resume, status, timeline, screenshots, healthcare, archive, 404/offline, and one representative language lane while offline; the route list is generated from reviewed public routes and stays within an explicit cache budget.
  Complexity: M

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

- [ ] P2 — Remove the redundant screenshots filter
  Why: The gallery currently offers “All” and “Web” with the same 23 items, so it adds controls without a meaningful choice and its empty state is unreachable.
  Evidence: `src/pages/screenshots.astro:27-90`, current screenshot manifest.
  Touches: `src/pages/screenshots.astro`, screenshot metadata, filter script/styles, interaction tests.
  Acceptance: The page exposes no facet until at least two non-identical reviewed categories exist, or uses documented product dimensions with distinct counts; empty/reset behavior is reachable and tested.
  Complexity: S

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

- [ ] P3 — Provenance trust-tier pills render with no tone differentiation
  Category: visual
  Where: `src/pages/status.astro:164` (applies `status-provenance-pill-${row.tone}`), tone computed at `src/pages/status.astro:92-98` (green/blue/amber); no CSS rule for `status-provenance-pill-green|blue|amber` exists anywhere.
  Problem: The `/status/` release-provenance panel intends to color-code trust tiers (Attested/Checksum/Unsigned/No assets/Unknown), but the per-tone class it emits is never styled, so all pills render visually identical and the at-a-glance trust signal is lost. Separately, the base rule carries a dead `background:rgba(255,255,255,.03)` literal (`status.astro:218`) that is fully shadowed by the route-interior override `body.route-interior .status-provenance-pill{background:transparent}` (`src/styles/global.css:4573`).
  Evidence: Grep for `status-provenance-pill-` returns only the template usage at `status.astro:164`, no CSS. Confirmed the base pill is route-interior-overridden to transparent (global.css:4573), so the rgba literal never renders.
  Fix: Add tone rules mirroring the release-provenance treatment at `src/pages/releases.astro:219-221` (use `--grn`/`--blue`/`--yel` derived accents on the pill's border-bottom or a small dot, keeping the quiet-layer transparent background), and remove the dead `rgba(255,255,255,.03)` literal at `status.astro:218`. A11y is already fine (each pill has a text label), so pair color with the existing label, not color alone.
  Acceptance: On `/status/`, the five provenance pills show distinct tone accents; `git grep "rgba(255,255,255,.03)"` no longer matches `status.astro`.
  Confidence: Verified
  Effort: S

- [ ] P3 — Footer backlink copy is inconsistent across interior pages
  Category: ux
  Where: With arrow "← Back to portfolio": `src/pages/404.astro:30`, `ai.astro:179`, `healthcare-it.astro:153`, `lang/[slug].astro:220`, `now.astro:157`, `releases.astro:187`, `timeline.astro:376`. Without arrow "Back to portfolio": `archive.astro:180`, `resume.astro:104`, `search.astro:155`, `uses.astro:92`.
  Problem: The same `a.footer-backlink` element pointing at `/` uses two different labels across 11 pages (7 with a leading `←`, 4 without), an avoidable inconsistency on a portfolio whose whole value proposition is craftsmanship.
  Evidence: `grep -rn "Back to portfolio" src/pages/` — 7 arrow / 4 no-arrow split confirmed above. (`resume.astro:47` is a separate top `.btn` and is out of scope.)
  Fix: Standardize on the majority form "← Back to portfolio" in the four outliers (`archive.astro:180`, `resume.astro:104`, `search.astro:155`, `uses.astro:92`). Consider extracting the backlink into a shared snippet/component so it cannot drift again.
  Acceptance: All 11 `.footer-backlink` instances render identical text; a grep asserts a single label form.
  Confidence: Verified
  Effort: S

- [ ] P3 — Dead "Recently Viewed" command-palette group (removed-feature residue)
  Category: maintainability
  Where: `public/scripts/cmdk.js:158-169` (`getRecentlyViewed` reads `localStorage['recently_viewed']`), consumed by `getDefaultResults` at `cmdk.js:171-173`.
  Problem: `recently_viewed` is read but written nowhere in the repo, so the "Recently Viewed" cmdk group can never populate. The writer lived on the local project-detail pages that were deleted in commit `1aa68e1` ("Remove local project pages"); the reader is now orphaned dead code. It is correctly guarded (`cmdk.js:161` returns `[]` on empty/invalid), so there is no visible bug — only stale, misleading code.
  Evidence: Repo-wide grep for `recently_viewed` returns exactly one hit — the read at `cmdk.js:160`. No `setItem('recently_viewed', ...)` exists. Git history shows local project pages (the plausible writer) were removed.
  Fix: Decide the feature's fate. Either (a) remove `getRecentlyViewed` and its call in `getDefaultResults`, or (b) if desired, add a writer — a small `document_start`/click hook that pushes the current project slug into `recently_viewed` (capped, deduped) from catalog card clicks — and cover it with a cmdk unit test.
  Acceptance: Either `getRecentlyViewed` is gone and `getDefaultResults` no longer references it, or a writer populates `recently_viewed` and a test asserts the group appears; no orphaned reader remains.
  Confidence: Verified
  Effort: S

- [ ] P3 — Live-app thumbnail hydration will throw on a future thumbless non-anchor card
  Category: reliability
  Where: `public/scripts/home-media.js:88-90` (the `else` branch when `existingThumb` is falsy): `const url=card.href; const repo=safeRepo((url.split('sysadmindoc.github.io/')[1]||'')...)`.
  Problem: This branch reads `card.href` and calls `.split` on it without guarding that `card` is an anchor. Today every `#live .lc2` is rendered as an `<a>` with an `.lc2-thumb` (`src/components/LiveCard.astro`), so the branch is unreachable and there is no live bug. But it is a latent footgun: any future live card rendered without a static thumb, or as a non-anchor element, makes `card.href` `undefined`, `undefined.split(...)` throws, and the uncaught error aborts thumbnail hydration for every subsequent card in the loop.
  Evidence: Traced `LiveCard.astro` — all `.lc2` are same-origin anchors with `.lc2-thumb`, confirming current unreachability; the throw path is real if that invariant changes.
  Fix: Guard the branch: `if (!(card instanceof HTMLAnchorElement) || !card.href) return;` before the `.split`, and/or wrap the per-card body so one failure cannot abort the loop.
  Acceptance: With a synthetic thumbless non-anchor `.lc2` in the DOM, thumbnail hydration continues for the remaining cards without a console error.
  Confidence: Needs-repro
  Effort: S

- [ ] P3 — Unaudited: live-browser interaction of secondary flows
  Category: testing
  Where: dev server + Playwright interaction of `/search/` (Pagefind runtime empty/error/no-result states), `/screenshots/` filtering, cmdk open/keyboard/empty-query, service-worker offline navigation, and update-toast flow.
  Problem: This audit pass traced these paths in source and relied on the existing test suite (144 green) but did not drive them in a running browser, so runtime-only regressions (Pagefind load failure UI, focus return after cmdk close, offline navigation fallback) are not confirmed clean this pass.
  Evidence: N/A — scope declaration for the next pass, not a defect.
  Fix: Run `npm run dev` (or serve `dist/`) and exercise each flow with Playwright, asserting empty/error/offline states and focus management; fold any real regressions into new findings.
  Acceptance: Each secondary flow has an observed pass (or a filed finding); no un-exercised runtime state remains.
  Confidence: Needs-repro
  Effort: M
