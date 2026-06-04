# TODO — Single Source of Truth

> **This is the consolidated open-work list.** It merges and de-duplicates the v0.18.0 audit (formerly in [ROADMAP.md](ROADMAP.md)) and the net-new research opportunities (formerly in [RESEARCH_FEATURE_PLAN.md](RESEARCH_FEATURE_PLAN.md)). Those two files are retained as **evidence/rationale archives** — full "Why/Evidence/Verify" detail lives there, keyed by the IDs below (`R…` = roadmap item, `NF-…` = research-plan item).
>
> Completed work moves to [COMPLETED.md](COMPLETED.md) and is summarized in [CHANGELOG.md](CHANGELOG.md). Do not re-add shipped items here.
>
> Last consolidated: 2026-06-01 · Baseline: `npm run check` green (37 files, 0 errors).

Legend: `[ ]` open · `[x]` done this cycle · S/M/L complexity · sources in parentheses.

---

## Already shipped (verified during consolidation — see COMPLETED.md)
- [x] robots.txt with sitemap reference (R/NF) — `public/robots.txt` exists.
- [x] Divider infinite-animation / `will-change` perf (R) — `a534de0`, now `animation-play-state` gated on `.dv.vis`.
- [x] Catalog view slices for New / Recently updated / Has download (SysAdminDoc profile ROADMAP NF6) — shipped v0.18.2 with URL-backed `view=` state and browser verification.

---

## P0 — Trust & correctness (do first)
- [x] **T1** Fix contribution-streak algorithm (NF-1, S) — strict consecutive-day walk from latest push; 0 when latest push >1 day old. Accept: unit test passes; `_stats.json` recomputed.
- [x] **T2** `forced-colors` / Windows High Contrast support (NF-28, M) — `@media (forced-colors: active)` block: outline focus, bordered controls, hidden decoration. Accept: controls visible under emulated forced-colors.
- [x] **T3** Automated a11y gate — axe-core WCAG 2.2 AA (NF-33, M) — `scripts/audit-a11y.mjs` + `a11y:audit` script; advisory in CI. Accept: `npm run a11y:audit` runs, exit-codes on violations.

## P1 — High-value features, SEO/AEO, resilience, CI
### Features / content
- [x] **T4** Contact/hire funnel — email + LinkedIn in Connect + footer (NF-8 + R LinkedIn, S). Accept: working mailto/LinkedIn surfaced; hero pill scrolls to #connect.
- [x] **T5** Render dead `featured` content (NF-2, M) — surface authored desc/tags beyond hero reel, or prune. Accept: no orphaned authored data.
- [x] **T6** Build-time language-donut fallback (NF-6, M) — bake language mix from `_meta.json`; JS enhances. Accept: donut renders with JS disabled.
- [x] **T7** Data-layer test runner — `node:test` (NF-12, M) — cover streak/cosine/release-trim/getUtcDayKey; wire `npm test`. Accept: `npm test` green; CI step.
### SEO / AEO
- [x] **T8** `/llms.txt` build endpoint (NF-27, S) — curated markdown index from projects data; reference in robots.txt.
- [x] **T9** BreadcrumbList JSON-LD on project/lang/interior pages (R, M).
- [x] **T10** Connected `@graph`: ProfilePage + CollectionPage/ItemList + Person `@id` linking (R + NF-29, M); CollectionPage on lang lanes.
- [x] **T11** Enrich project `SoftwareSourceCode` JSON-LD: image/dateModified/keywords (NF-24, S).
- [x] **T12** `experimental.clientPrerender` (Speculation Rules) (R + NF-32, S).
- [x] **T13** Sitemap config: lastmod/priority/changefreq + exclude json/og routes (NF, M).
### Performance
- [x] **T14** Extract 44KB inline `__PORTFOLIO_DATA` to external JSON (R, M).
- [x] **T15** Gate film-grain overlay behind capability media query (R, S).
- [ ] **T16** Split / non-block monolithic CSS — defer to CSS pass (R, L) *(coordinate with T2, @layer)*.
### Accessibility
- [x] **T17** Wrap CSS scroll-driven animations in `prefers-reduced-motion` guard (R, S).
- [x] **T18** Accessible labels + aria-live on hero stat counters (R, S).
- [x] **T19** Command-palette listbox ARIA: `<a role=option>` → valid pattern (R, M).
### Nav / content
- [x] **T20** Remove duplicate InteriorNav `/#catalog` link (R, S).
- [x] **T21** Add `/uses/` + `/resume/` to InteriorNav + homepage footer (R, S).
### Build / CI / docs
- [x] **T22** Deduplicate pre-build validation in deploy.yml (R, S).
- [x] **T23** Finish TS-AST helper migration to `scripts/lib/` (R, M).
- [x] **T24** Sync `package-lock.json` version → 0.17.0 (R, S).
- [x] **T25** PR build gate — `ci.yml` on `pull_request` (NF-36, S).
- [x] **T26** Doc/version reconciliation: CHANGELOG v0.17.0, CLAUDE.md Astro 6 + CSS size, version strings (NF, S).
- [ ] **T27** Lighthouse CI advisory budget (NF-34, M).
- [ ] **T28** Migrate `public/` raster art → `astro:assets <Picture>` AVIF/srcset (NF-22, L) *(stage incrementally; may defer)*.

## P2 — Depth, polish, hardening
### Features
- [x] **T29** Live Apps overview + status a11y text (NF-5, M).
- [x] **T30** Case-study teasers on homepage Greatest Hits (NF-3, S).
- [x] **T31** Resolve "music/Slunder" broken promise — static cards or remove copy (NF-4, M) *(privacy decision)*.
- [x] **T32** Terminal history + Tab completion (NF-16, S).
- [x] **T33** Conditional GitHub requests (ETag→304) (NF-18, M).
- [x] **T34** SW stale-while-revalidate navigation (NF-20, M).
- [◑] **T35** Pagefind facets/metadata (NF-26, M) — faceted index shipped (Category filter + Type meta on project pages); visible filter UI deferred (modular-ui component, needs browser verification).
- [ ] **T36** Build-time project ranking signal (NF-13, M).
### Data / scripts
- [x] **T37** fetch-stars atomic writes + integrity checks + release-body fallback (R + NF-11, M).
- [x] **T38** `@astrojs/rss` migration + content:encoded (NF-25, M).
- [x] **T39** Content-drift + featured⊆catalog validator extensions (NF-14/15, S).
### SEO/feeds
- [x] **T40** Dedicated releases feed `/releases.xml` (NF-9, S).
- [ ] **T41** README code syntax highlighting (Shiki) (NF-23, M).
- [ ] **T42** OG images for interior pages (R, M).
- [ ] **T43** Last-updated timestamps on /uses, /resume, /healthcare-it (R, S).
### Security / privacy
- [x] **T44** Remove dns-prefetch for www.youtube.com (R, S).
- [x] **T45** Escape star count innerHTML in catalog badge (R, S).
- [x] **T46** Verify/clean i.scdn.co preconnect (R, S).
- [x] **T47** Strip Google Fonts/analytics from docs/archive/legacy.html (R, S).
- [x] **T48** Cross-origin SW cache TTL (R, M).
- [x] **T49** `.well-known/security.txt` + `humans.txt` (NF, S).
### Accessibility (P2 cluster)
- [x] **T50** Section `aria-labelledby` on homepage (R, S).
- [x] **T51** Heatmap zero/future cells aria-hidden + enrich streak/peak (R + NF-7, S).
- [x] **T52** Journey cards whole-card link / remove dead focus CSS (R + improvement, S).
- [x] **T53** Interior footer `div`→`nav` landmark (R, S).
- [x] **T54** Remove duplicate catalog aria-live (R, S).
- [x] **T55** Visible labels for catalog form controls (R, S).
- [x] **T56** Mobile-nav focus-trap tab order (R, S).
- [x] **T57** Terminal a11y: role=log, keystroke gating, copy keyboard, video close (R + NF-17, M).
- [x] **T58** Theme toggle respects prefers-color-scheme first visit + fix misleading comment (R, S).
### Nav / content (P2 cluster)
- [x] **T59** 404 page footer (R, S).
- [x] **T60** Healthcare-IT empty-state (R, S).
- [x] **T61** Expand homepage footer nav (R, S).
- [x] **T62** Extract shared career data (R, M) *(prereq for JSON Resume)*.
- [x] **T63** InteriorNav active state for /uses, /resume, /healthcare-it (R, S).
- [x] **T64** Clarify ThinkTV/Maven date overlap (R, S) — added "Concurrent with the start of the Maven Imaging role." note to ThinkTV (career card + resume).
- [x] **T65** Resume contact info (R, S) *(folds into T4 data)*.
- [x] **T66** SectionJumpNav on releases + Timeline cross-link (R, S).
- [x] **T67** Verify TagCloud quick-pick filter activation (R, S).
### Build/CI (P2 cluster)
- [x] **T68** `sw:stamp` → ESM script (R, S).
- [x] **T69** `.nvmrc` + engines field (R, S).
- [x] **T70** Add `.claude/` to .gitignore (R, S).
- [x] **T71** `semantic:audit` in quality-gates.yml (R, S).
- [x] **T72** README layout-tree refresh (R, S) *(folds into T26)*.
### Perf (P2 cluster)
- [x] **T73** shared.js in SW precache (R, S).
- [x] **T74** Gate JS scroll-reveal observer vs CSS (R + improvement, S).
- [x] **T75** GitHub API cache TTL increase / metered skip (R, S).
- [x] **T76** Bound non-essential infinite CSS animations (R, S).
- [x] **T77** font-display:optional for JetBrains Mono (R, S).
- [x] **T78** Remove duplicate `.skip-link` CSS (R, S).
- [ ] **T79** content-visibility:auto below-fold (R, M).
- [x] **T80** INP hygiene on cmdk keystroke filter (NF-30, M).
- [x] **T81** accent-color token (NF-31, S).
- [x] **T82** Cache-shape contract types `generated.d.ts` (NF, S).

## P3 — Nice-to-have
- [x] **T83** JSON Resume export `/resume.json` + optional PDF (NF-10, M).
- [x] **T84** Custom PWA install prompt (NF-19, M).
- [x] **T85** localStorage resilience / in-memory fallback (NF-21, S).
- [x] **T86** manifest launch_handler/id/scope (NF, S).
- [x] **T87** JSON Feed `/feed.json` (NF, S).
- [x] **T88** client-local "recently viewed" (NF, M).
- [x] **T89** Pin GitHub Actions to SHAs (NF-36, S).
- [x] **T90** Resolve unused `cpp` category (R, S).
- [x] **T91** Dependabot labels (R, S).
- [x] **T92** deploy.yml cancel-in-progress:true (R, S).
- [x] **T93** Document Playwright optional dep (R, S).
- [x] **T94** data-refresh.yml lightweight health probe (R, S).
- [ ] **T95** Migrate inline scripts off CSP `unsafe-inline` (R, L) *(largest; may defer with rationale)*.

---

## Post-v0.18.0 research (2026-06-02) — see [RESEARCH_2026-06-02.md](RESEARCH_2026-06-02.md) for full evidence

- [x] **T96** P0 — homepage interactivity dead (main.js ran before shared.js → ReferenceError). Fixed v0.18.1: main.js homepage-only after shared.js + build guard + SW cache bump. **Verified live.**
- [ ] **T97** P1 — above-the-fold proof strip of quantified outcomes from proof.ts (NF-A1).
- [ ] **T98** P1 — page-level JSON-LD on the 8 interior routes (ProfilePage on /resume etc.) (NF-A2).
- [ ] **T99** P1 — SoftwareApplication node + license/datePublished for live-app project pages (NF-A3).
- [ ] **T100** P1 — Greatest Hits case-study coverage 3/8 → parity + validator (IMP-4).
- [ ] **T101** P1 — reconcile hero "176+" vs catalog "181" headline count (IMP-1).
- [ ] **T102** P1 — critical-CSS inline for hero (the real mobile-LCP lever, NOT @layer) + re-baseline stale PERFORMANCE_AUDIT.md (v0.16.12).
- [ ] **T103** P1 — forced-colors gap: SVG data-viz (heatmap/donut/skill rings) unreadable in WHCM.
- [ ] **T104** P2 — CI gate stubs empty data; commit src/data/_fixtures and render real shapes pre-merge.
- [ ] **T105** P2 — promote a11y audit to blocking --strict subset; mirror test + a11y into deploy.yml.
- [ ] **T106** P2 — axe-core/Playwright a11y job + Playwright visual-regression baselines (unblocks T16/T28).
- [ ] **T107** P2 — README TOC + reading-time on project pages (heading IDs already generated, orphaned) (NF-A4).
- [ ] **T108** P2 — homepage SectionJumpNav (reuse existing component + cmdkSections) (NF-A5).
- [ ] **T109** P2 — iOS PWA install path (NF-A6) + WebSite SearchAction (NF-A7) + prefers-contrast block.
- [ ] **T110** P2 — language-donut population parity (build vs JS flicker) (IMP-2) + skill rings vs real distribution (IMP-3).
- [ ] **T111** P2 — root-cause Astro 6 </html> emission (compressHTML bisect); convert fix-html-structure to assert-or-noop on a fixed Astro version.
- [ ] **T112** P3 — cluster: terminal contact/uses/theme cmds; /atom.xml; catalog no-JS <form>; minify public JS; llms.txt completeness; Beyond Code enrich + CLAUDE.md sync; CSP theme-init hash (partial T95); catalog DOM-size budget gate.

---

## Remaining open — deferred with rationale (need design decision, heavy deps, or input)

These survived the v0.18.0 drain because they need a judgment call I shouldn't make unilaterally, a dependency/CI surface I can't fully verify headlessly, or your input. Each is scoped and ready to pick up.

- **T16** Split / non-block the monolithic ~4000-line CSS — needs critical-CSS extraction + `@layer` restructure; best done as one coordinated pass with a visual-regression net (which itself needs Playwright baselines in CI). Large, design-gated.
- **T95** Remove CSP `unsafe-inline` for scripts — requires externalizing the theme-init (FOUC risk), the remaining `define:vars` (now just page sections, much smaller after T14), and Pagefind init, plus nonce/hashing. Largest, highest-regression-risk.
- **T28** Migrate `public/` raster art → `astro:assets <Picture>` (AVIF/srcset) — large; needs per-image migration out of `public/` into `src/` imports and CLS verification across cards. Biggest standards win, but a focused pass with visual checks.
- **T27** Lighthouse CI advisory budget — adds `@lhci/cli` + a CI job I can't exercise headlessly here; `audit-a11y.mjs` + the PR gate already cover the gap partially. Needs a CI run to tune thresholds.
- **T41** README code syntax highlighting (Shiki) — build-time highlighter would emit inline `style`/CSS-var spans that the README `sanitize-html` allowlist strips; allowing `style` on README-derived content needs a security review. Dep + security-gated.
- **T42** OG images for interior pages — satori template work whose visual output can't be verified headlessly; the `og/[slug].png.ts` scaffold can be generalized once someone can eyeball the cards.
- **T35** Pagefind facets/metadata — **faceted index shipped** (Category filter + Type meta on project pages; verified 198 pages / 1 filter). Remaining: wire the visible filter pill into the custom `<pagefind-*>` modular-ui search page — needs a browser check of that component's filter API.
- **T36** Build-time project ranking — marginal value: the catalog already offers "Most stars" and "Recently updated" sorts that cover the same signal; revisit only if a blended default sort is actually wanted.
- **T43** Last-updated timestamps on /uses, /resume, /healthcare-it — deferred: hardcoded dates go stale and become a maintenance burden / misleading freshness signal. /now already carries a real date. Revisit if a data-driven `lastReviewed` field is added.

## Parked / rejected (carry-forward — see ROADMAP.md "Rejected or Parked")
Hosted backend search; analytics/visitor tracking; private-repo listing; auto GitHub visibility changes; Notes/TIL feed (NOTES_FEED_POLICY gates unmet); full CSS redesign; client-side embeddings; dependency-graph viz; project comparison tables; CSP data: URI in img-src (accepted); Spotify cookie-setting iframe (privacy — T31 uses static cards only).
