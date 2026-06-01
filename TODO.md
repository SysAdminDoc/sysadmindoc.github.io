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

---

## P0 — Trust & correctness (do first)
- [x] **T1** Fix contribution-streak algorithm (NF-1, S) — strict consecutive-day walk from latest push; 0 when latest push >1 day old. Accept: unit test passes; `_stats.json` recomputed.
- [x] **T2** `forced-colors` / Windows High Contrast support (NF-28, M) — `@media (forced-colors: active)` block: outline focus, bordered controls, hidden decoration. Accept: controls visible under emulated forced-colors.
- [x] **T3** Automated a11y gate — axe-core WCAG 2.2 AA (NF-33, M) — `scripts/audit-a11y.mjs` + `a11y:audit` script; advisory in CI. Accept: `npm run a11y:audit` runs, exit-codes on violations.

## P1 — High-value features, SEO/AEO, resilience, CI
### Features / content
- [ ] **T4** Contact/hire funnel — email + LinkedIn in Connect + footer (NF-8 + R LinkedIn, S). Accept: working mailto/LinkedIn surfaced; hero pill scrolls to #connect.
- [ ] **T5** Render dead `featured` content (NF-2, M) — surface authored desc/tags beyond hero reel, or prune. Accept: no orphaned authored data.
- [ ] **T6** Build-time language-donut fallback (NF-6, M) — bake language mix from `_meta.json`; JS enhances. Accept: donut renders with JS disabled.
- [x] **T7** Data-layer test runner — `node:test` (NF-12, M) — cover streak/cosine/release-trim/getUtcDayKey; wire `npm test`. Accept: `npm test` green; CI step.
### SEO / AEO
- [ ] **T8** `/llms.txt` build endpoint (NF-27, S) — curated markdown index from projects data; reference in robots.txt.
- [ ] **T9** BreadcrumbList JSON-LD on project/lang/interior pages (R, M).
- [ ] **T10** Connected `@graph`: ProfilePage + CollectionPage/ItemList + Person `@id` linking (R + NF-29, M); CollectionPage on lang lanes.
- [ ] **T11** Enrich project `SoftwareSourceCode` JSON-LD: image/dateModified/keywords (NF-24, S).
- [ ] **T12** `experimental.clientPrerender` (Speculation Rules) (R + NF-32, S).
- [ ] **T13** Sitemap config: lastmod/priority/changefreq + exclude json/og routes (NF, M).
### Performance
- [ ] **T14** Extract 44KB inline `__PORTFOLIO_DATA` to external JSON (R, M).
- [x] **T15** Gate film-grain overlay behind capability media query (R, S).
- [ ] **T16** Split / non-block monolithic CSS — defer to CSS pass (R, L) *(coordinate with T2, @layer)*.
### Accessibility
- [x] **T17** Wrap CSS scroll-driven animations in `prefers-reduced-motion` guard (R, S).
- [ ] **T18** Accessible labels + aria-live on hero stat counters (R, S).
- [ ] **T19** Command-palette listbox ARIA: `<a role=option>` → valid pattern (R, M).
### Nav / content
- [ ] **T20** Remove duplicate InteriorNav `/#catalog` link (R, S).
- [ ] **T21** Add `/uses/` + `/resume/` to InteriorNav + homepage footer (R, S).
### Build / CI / docs
- [x] **T22** Deduplicate pre-build validation in deploy.yml (R, S).
- [ ] **T23** Finish TS-AST helper migration to `scripts/lib/` (R, M).
- [x] **T24** Sync `package-lock.json` version → 0.17.0 (R, S).
- [x] **T25** PR build gate — `ci.yml` on `pull_request` (NF-36, S).
- [ ] **T26** Doc/version reconciliation: CHANGELOG v0.17.0, CLAUDE.md Astro 6 + CSS size, version strings (NF, S).
- [ ] **T27** Lighthouse CI advisory budget (NF-34, M).
- [ ] **T28** Migrate `public/` raster art → `astro:assets <Picture>` AVIF/srcset (NF-22, L) *(stage incrementally; may defer)*.

## P2 — Depth, polish, hardening
### Features
- [ ] **T29** Live Apps overview + status a11y text (NF-5, M).
- [ ] **T30** Case-study teasers on homepage Greatest Hits (NF-3, S).
- [ ] **T31** Resolve "music/Slunder" broken promise — static cards or remove copy (NF-4, M) *(privacy decision)*.
- [ ] **T32** Terminal history + Tab completion (NF-16, S).
- [ ] **T33** Conditional GitHub requests (ETag→304) (NF-18, M).
- [ ] **T34** SW stale-while-revalidate navigation (NF-20, M).
- [ ] **T35** Pagefind facets/metadata (NF-26, M).
- [ ] **T36** Build-time project ranking signal (NF-13, M).
### Data / scripts
- [ ] **T37** fetch-stars atomic writes + integrity checks + release-body fallback (R + NF-11, M).
- [ ] **T38** `@astrojs/rss` migration + content:encoded (NF-25, M).
- [ ] **T39** Content-drift + featured⊆catalog validator extensions (NF-14/15, S).
### SEO/feeds
- [ ] **T40** Dedicated releases feed `/releases.xml` (NF-9, S).
- [ ] **T41** README code syntax highlighting (Shiki) (NF-23, M).
- [ ] **T42** OG images for interior pages (R, M).
- [ ] **T43** Last-updated timestamps on /uses, /resume, /healthcare-it (R, S).
### Security / privacy
- [ ] **T44** Remove dns-prefetch for www.youtube.com (R, S).
- [ ] **T45** Escape star count innerHTML in catalog badge (R, S).
- [ ] **T46** Verify/clean i.scdn.co preconnect (R, S).
- [ ] **T47** Strip Google Fonts/analytics from docs/archive/legacy.html (R, S).
- [ ] **T48** Cross-origin SW cache TTL (R, M).
- [ ] **T49** `.well-known/security.txt` + `humans.txt` (NF, S).
### Accessibility (P2 cluster)
- [ ] **T50** Section `aria-labelledby` on homepage (R, S).
- [ ] **T51** Heatmap zero/future cells aria-hidden + enrich streak/peak (R + NF-7, S).
- [ ] **T52** Journey cards whole-card link / remove dead focus CSS (R + improvement, S).
- [ ] **T53** Interior footer `div`→`nav` landmark (R, S).
- [ ] **T54** Remove duplicate catalog aria-live (R, S).
- [ ] **T55** Visible labels for catalog form controls (R, S).
- [ ] **T56** Mobile-nav focus-trap tab order (R, S).
- [ ] **T57** Terminal a11y: role=log, keystroke gating, copy keyboard, video close (R + NF-17, M).
- [ ] **T58** Theme toggle respects prefers-color-scheme first visit + fix misleading comment (R, S).
### Nav / content (P2 cluster)
- [ ] **T59** 404 page footer (R, S).
- [ ] **T60** Healthcare-IT empty-state (R, S).
- [ ] **T61** Expand homepage footer nav (R, S).
- [ ] **T62** Extract shared career data (R, M) *(prereq for JSON Resume)*.
- [ ] **T63** InteriorNav active state for /uses, /resume, /healthcare-it (R, S).
- [ ] **T64** Clarify ThinkTV/Maven date overlap (R, S).
- [ ] **T65** Resume contact info (R, S) *(folds into T4 data)*.
- [ ] **T66** SectionJumpNav on releases + Timeline cross-link (R, S).
- [ ] **T67** Verify TagCloud quick-pick filter activation (R, S).
### Build/CI (P2 cluster)
- [x] **T68** `sw:stamp` → ESM script (R, S).
- [x] **T69** `.nvmrc` + engines field (R, S).
- [x] **T70** Add `.claude/` to .gitignore (R, S).
- [x] **T71** `semantic:audit` in quality-gates.yml (R, S).
- [ ] **T72** README layout-tree refresh (R, S) *(folds into T26)*.
### Perf (P2 cluster)
- [ ] **T73** shared.js in SW precache (R, S).
- [ ] **T74** Gate JS scroll-reveal observer vs CSS (R + improvement, S).
- [ ] **T75** GitHub API cache TTL increase / metered skip (R, S).
- [ ] **T76** Bound non-essential infinite CSS animations (R, S).
- [x] **T77** font-display:optional for JetBrains Mono (R, S).
- [ ] **T78** Remove duplicate `.skip-link` CSS (R, S).
- [ ] **T79** content-visibility:auto below-fold (R, M).
- [ ] **T80** INP hygiene on cmdk keystroke filter (NF-30, M).
- [x] **T81** accent-color token (NF-31, S).
- [ ] **T82** Cache-shape contract types `generated.d.ts` (NF, S).

## P3 — Nice-to-have
- [ ] **T83** JSON Resume export `/resume.json` + optional PDF (NF-10, M).
- [ ] **T84** Custom PWA install prompt (NF-19, M).
- [ ] **T85** localStorage resilience / in-memory fallback (NF-21, S).
- [ ] **T86** manifest launch_handler/id/scope (NF, S).
- [ ] **T87** JSON Feed `/feed.json` (NF, S).
- [ ] **T88** client-local "recently viewed" (NF, M).
- [ ] **T89** Pin GitHub Actions to SHAs (NF-36, S).
- [ ] **T90** Resolve unused `cpp` category (R, S).
- [x] **T91** Dependabot labels (R, S).
- [x] **T92** deploy.yml cancel-in-progress:true (R, S).
- [ ] **T93** Document Playwright optional dep (R, S).
- [x] **T94** data-refresh.yml lightweight health probe (R, S).
- [ ] **T95** Migrate inline scripts off CSP `unsafe-inline` (R, L) *(largest; may defer with rationale)*.

---

## Parked / rejected (carry-forward — see ROADMAP.md "Rejected or Parked")
Hosted backend search; analytics/visitor tracking; private-repo listing; auto GitHub visibility changes; Notes/TIL feed (NOTES_FEED_POLICY gates unmet); full CSS redesign; client-side embeddings; dependency-graph viz; project comparison tables; CSP data: URI in img-src (accepted); Spotify cookie-setting iframe (privacy — T31 uses static cards only).
