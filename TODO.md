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
- [x] Profile feed-backed catalog rendering (SysAdminDoc profile ROADMAP P1) — shipped v0.18.3 with raw GitHub feed sync, suppressed-row exclusion, local fallback/overlays, and browser verification.

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
- [x] **T16** Split / non-block monolithic CSS (R, L) — `Base.astro` now inlines first-viewport `critical.css`, preloads the hashed `global.css` asset, loads it through a print-media swap, and keeps a `noscript` stylesheet fallback.
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
- [x] **T27** Lighthouse CI advisory budget (NF-34, M) — `lighthouserc.cjs` samples homepage and project-detail routes, applies advisory Lighthouse/category/resource budgets, stores filesystem reports, and PR CI uploads them without blocking the job.
- [x] **T28** Migrate `public/` raster art → `astro:assets <Picture>` AVIF/srcset (NF-22, L) — Live Apps card thumbnails now have tracked `src/assets/screenshots/thumbs/` inputs rendered through Astro `<Picture>` with AVIF/WebP/srcset and JPEG fallback; public screenshot/thumb URLs remain for API/project-detail compatibility.

## P2 — Depth, polish, hardening
### Features
- [x] **T29** Live Apps overview + status a11y text (NF-5, M).
- [x] **T30** Case-study teasers on homepage Greatest Hits (NF-3, S).
- [x] **T31** Resolve "music/Slunder" broken promise — static cards or remove copy (NF-4, M) *(privacy decision)*.
- [x] **T32** Terminal history + Tab completion (NF-16, S).
- [x] **T33** Conditional GitHub requests (ETag→304) (NF-18, M).
- [x] **T34** SW stale-while-revalidate navigation (NF-20, M).
- [x] **T35** Pagefind facets/metadata (NF-26, M) — `/search/` now runs Pagefind in faceted mode and renders the official `<pagefind-filter-pane>` with an open Category filter, preserving static Pagefind results and README excerpt search.
- [x] **T36** Build-time project ranking signal (NF-13, M) — default catalog order now uses a deterministic build-time blend of stars, 180-day freshness decay, and release-download activity; project-page related links use the same rank map, with explicit star/name/recent sorts preserved.
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
- [x] **T102** P1 — critical-CSS inline for hero (the real mobile-LCP lever, NOT @layer) + re-baseline stale PERFORMANCE_AUDIT.md (v0.16.12). Done with T16; 2026-06-04 audit shows mobile homepage LCP 668ms.
- [ ] **T103** P1 — forced-colors gap: SVG data-viz (heatmap/donut/skill rings) unreadable in WHCM.
- [ ] **T104** P2 — CI gate stubs empty data; commit src/data/_fixtures and render real shapes pre-merge.
- [ ] **T105** P2 — promote a11y audit to blocking --strict subset; mirror test + a11y into deploy.yml.
- [ ] **T106** P2 — axe-core/Playwright a11y job + Playwright visual-regression baselines for future visual-regression-sensitive CSS/image changes.
- [ ] **T107** P2 — README TOC + reading-time on project pages (heading IDs already generated, orphaned) (NF-A4).
- [ ] **T108** P2 — homepage SectionJumpNav (reuse existing component + cmdkSections) (NF-A5).
- [ ] **T109** P2 — iOS PWA install path (NF-A6) + WebSite SearchAction (NF-A7) + prefers-contrast block.
- [ ] **T110** P2 — language-donut population parity (build vs JS flicker) (IMP-2) + skill rings vs real distribution (IMP-3).
- [ ] **T111** P2 — root-cause Astro 6 </html> emission (compressHTML bisect); convert fix-html-structure to assert-or-noop on a fixed Astro version.
- [ ] **T112** P3 — cluster: terminal contact/uses/theme cmds; /atom.xml; catalog no-JS <form>; minify public JS; llms.txt completeness; Beyond Code enrich + CLAUDE.md sync; CSP theme-init hash (partial T95); catalog DOM-size budget gate.

---

## 🔬 Researcher Queue (Cycle 1 — 2026-06-04) — see [docs/research-2026-06-04-cycle-1.md](docs/research-2026-06-04-cycle-1.md)

- [x] **T113** 🤖 P0 — Restore v0.18.3 deploy by generating the profile-feed cache before Astro type checks.
  - Why: `main` currently contains v0.18.3 source, but the latest GitHub Pages deploy failed before build, leaving the public site on v0.18.2 artifacts.
  - Evidence: Deploy run `26941334995` failed at `npx astro check` with `src/data/portfolio.ts:60:28 Cannot find module './_profile-projects.json'`; `.github/workflows/deploy.yml:35-57` runs `data:validate`, `fetch-stars`, then `npx astro check`/`build:ci`, while `package.json:12-15` only runs `profile-feed:sync` in local `build`/`check`; live `https://sysadmindoc.github.io/sw.js` still says `portfolio-v0.18.2` and live `projects.json` has `profileFeedUrl: null`.
  - Touches: `.github/workflows/deploy.yml`; possibly `src/data/generated.d.ts`, a committed fixture, or a CI-only cache-generation/stub policy.
  - Done: `deploy.yml` now runs `npm run profile-feed:sync` after `fetch-stars` and before `npx astro check`, matching the local `npm run check` setup path.
  - Verify: `npm run check`; post-push `Deploy portfolio` run on `main`; `Invoke-WebRequest https://sysadmindoc.github.io/sw.js`; `Invoke-RestMethod https://sysadmindoc.github.io/projects.json`.

- [x] **T114** 🤖 P1 — Make `npm test` explicit and current-working-directory safe.
  - Why: The bare `node --test` script can silently test the wrong directory when npm is invoked from an unsafe Windows UNC context, producing a false green build signal.
  - Evidence: `package.json:18` is `"test": "node --test"`; Node's test runner discovers files from its active working directory when no explicit glob is supplied; on this machine, running npm directly from `\\vmware-host\Shared Folders\...` fell back to `C:\Windows` and executed unrelated Windows tests, while `cmd /c pushd "\\vmware-host\Shared Folders\repos\sysadmindoc.github.io" && npm test` ran the 12 repo tests correctly.
  - Touches: `package.json`; optionally a small `scripts/ensure-project-cwd.mjs` guard or an explicit `node --test "test/**/*.test.mjs"` pattern.
  - Done: `npm test` now runs `scripts/ensure-project-cwd.mjs` before an explicit `node --test "test/**/*.test.mjs"` target.
  - Verify: Valid repo run still reports 12 tests; `node C:\Users\--\repos\sysadmindoc.github.io\scripts\ensure-project-cwd.mjs` from `C:\Windows` fails fast instead of allowing ambient discovery.

- [x] **T115** 🤖 P2 — Document or guard the Windows/VMware shared-folder build workflow.
  - Why: The repository can be edited from the VMware shared folder, but local npm/Astro execution from that path is unreliable enough to confuse validation and build triage.
  - Evidence: Direct npm execution from the raw UNC path produced the Windows UNC current-directory fallback; temporary `cmd pushd` mapping fixed smaller scripts, but `npm run build` from the mapped shared-folder path failed in Vite/Astro with a corrupted path like `Z:\repos\sysadmindoc.github.io\ Folders\repos\sysadmindoc.github.io\src\pages\404.astro`.
  - Touches: `README.md`, `CLAUDE.md`, or `PROJECT_CONTEXT.md`; optionally a non-invasive script guard that warns when `process.cwd()` is a VMware shared-folder/mapped-drive path.
  - Done: `README.md` and `PROJECT_CONTEXT.md` now document the safe local-build workflow: edit through a shared folder if needed, but run npm/Astro validation from a normal local clone/worktree path.
  - Verify: Follow the documented local path workflow and run `npm test`, `npm run check`, and `npm run build`; the T114 cwd guard documents/fails the raw UNC fallback mode.

- [x] **T116** 🤖 P2 — Resolve the dev-only `yaml` advisory in the Astro check dependency chain.
  - Why: Production dependency audit is clean, but the full dev audit still reports five moderate vulnerabilities through the type-checking stack, which will keep audit-driven workflows noisy.
  - Evidence: `npm audit --omit=dev --audit-level=high` returned 0 vulnerabilities; `npm audit --audit-level=moderate` reported `GHSA-48c2-rrv3-qjmp` because `@astrojs/check@0.9.9 -> @astrojs/language-server@2.16.8 -> volar-service-yaml@0.0.70 -> yaml-language-server@1.20.0 -> yaml@2.7.1`; GitHub Advisory says `yaml` is patched at `2.8.3`; `yaml-language-server@1.23.0` depends on `yaml@2.8.3`, but current `volar-service-yaml` pins `~1.20.0`.
  - Touches: `package.json`, `package-lock.json`; possibly an npm override or a wait-for-upstream note if the override conflicts with Astro language-server behavior.
  - Done: Added an npm override so `yaml-language-server` resolves nested `yaml` to patched `2.8.3` without downgrading `@astrojs/check`.
  - Verify: `npm run check`; `npm audit --audit-level=moderate`; `npm ls yaml @astrojs/check @astrojs/language-server yaml-language-server volar-service-yaml`.

---

## 🔬 Researcher Queue (Cycle 2 — 2026-06-04) — see [docs/research-2026-06-04-cycle-2.md](docs/research-2026-06-04-cycle-2.md)

- [ ] **T117** 🤖 P1 — Make the scheduled GitHub data health check exercise the profile-feed path.
  - Why: v0.18.3 moved the catalog to the external profile feed, but the daily data-health workflow still only refreshes GitHub stars/metadata, so it no longer exercises the full production data path it claims to cover.
  - Evidence: `.github/workflows/deploy.yml:42-45` now runs `fetch-stars` and `profile-feed:sync`; `.github/workflows/data-refresh.yml:8-13` says the scheduled job exercises the exact production data path, but `.github/workflows/data-refresh.yml:39-43` runs only `fetch-stars` before `data:summary`; live `/projects.json` now reports `source.profileFeedUrl = https://raw.githubusercontent.com/SysAdminDoc/SysAdminDoc/main/projects.json`.
  - Touches: `.github/workflows/data-refresh.yml`, `scripts/summarize-generated-data.mjs`, possibly `scripts/sync-profile-feed.mjs` output/schema.
  - Acceptance: The scheduled/manual data-health workflow runs `npm run profile-feed:sync`; the generated summary reports profile-feed active/source/generated/cached status; `--fail-on-stale` can fail when profile-feed data is missing or stale.
  - Verify: `gh workflow run data-refresh.yml --repo SysAdminDoc/sysadmindoc.github.io`; inspect the run summary/artifact for profile-feed fields and a passing conclusion.

- [ ] **T118** 🤖 P2 — Add README-cache refresh quality signals to the generated data summary.
  - Why: Project detail pages and semantic search depend on cached README text, but the health summary only checks that the README cache is non-empty; stale preserved entries, miss spikes, or rate-limit fallback can pass silently.
  - Evidence: `scripts/fetch-stars.mjs:288-338` preserves existing README cache entries when no token, read misses, or rate-limit fallback occur; `scripts/summarize-generated-data.mjs:71-95` only checks `readmeEntries > 0`; project detail pages import `_readmes.json` at `src/pages/projects/[slug].astro:65-71`, and semantic indexing weights cached README text at `scripts/audit-semantic-index.mjs:108-115`.
  - Touches: `scripts/fetch-stars.mjs`, `scripts/summarize-generated-data.mjs`, `src/data/generated.d.ts`; possibly `PROJECT_CONTEXT.md` for the generated-data contract.
  - Acceptance: The generated summary records README refresh attempts, successes, misses, preserved-cache count, and rate-limit status; deploy/data-health summaries make stale or degraded README refresh visible instead of only reporting total entries.
  - Verify: Run `npm run fetch-stars` with and without `GITHUB_TOKEN`, then `npm run data:summary -- --out data-refresh-summary --max-age-hours 36 --fail-on-stale`; inspect `summary.md`/`summary.json` for README refresh quality fields.

- [ ] **T119** 🤖 P2 — Add a post-deploy live artifact smoke check.
  - Why: The v0.18.3 deploy failure was caught before publish, but release confidence still depends on manual checks that live `sw.js` and `projects.json` reflect the just-built source after Pages deployment.
  - Evidence: `.github/workflows/deploy.yml:65-74` ends after `actions/deploy-pages`; this research cycle manually verified `https://sysadmindoc.github.io/sw.js` changed to `portfolio-v0.18.3` and live `/projects.json` became profile-feed backed with 177 projects after T113/T114 landed; GitHub's Pages deploy action exposes the deployed `page_url` for follow-up checks.
  - Touches: `.github/workflows/deploy.yml`; optionally `scripts/smoke-live-site.mjs`.
  - Acceptance: A post-deploy job fetches the deployed Pages URL and asserts the service worker cache version matches `package.json`, `/projects.json` has `source.profileFeedUrl` when profile-feed mode is active, and project count is non-zero/within the expected profile-feed range.
  - Verify: `gh run view <deploy-run> --repo SysAdminDoc/sysadmindoc.github.io --json conclusion,url`; inspect the post-deploy smoke step logs for SW/version/projects assertions.

---

## 🔬 Researcher Queue (Cycle 3 — 2026-06-04) — see [docs/research-2026-06-04-cycle-3.md](docs/research-2026-06-04-cycle-3.md)

- [ ] **T120** 🤖 P2 — Publish Lighthouse CI warning summaries in PR/job output, not only artifacts.
  - Why: T27 added an advisory LHCI budget, but the current CI job is `continue-on-error` and uploads filesystem reports without surfacing the warning list in the GitHub job summary, so regressions can be missed unless someone downloads the artifact.
  - Evidence: `.github/workflows/ci.yml:46-55` runs `npm run lhci:audit` with `continue-on-error: true` and uploads `.tmp/lhci`; `lighthouserc.cjs:17-34` uses warning assertions plus `target: 'filesystem'`; `PROJECT_CONTEXT.md:75` records real warnings from run `26952960465` (homepage performance score 0.7, TBT 1988.5ms, third-party count 3) that are not visible in the workflow summary.
  - Touches: `.github/workflows/ci.yml`, `scripts/run-lhci.mjs` or a small `scripts/summarize-lhci.mjs`.
  - Acceptance: PR/manual CI job summaries list each LHCI warning with route, audit id, observed value, and threshold while preserving the advisory/non-blocking behavior.
  - Verify: Trigger `ci.yml` manually or on a PR; inspect the job summary without downloading artifacts and confirm LHCI warnings are visible.

- [ ] **T121** 🤖 P2 — Include semantic-audit status in weekly quality summaries and issues.
  - Why: `semantic:audit` is intentionally advisory, but the weekly workflow currently runs it and then hides the result from the summary, issue body, and fail-condition logic.
  - Evidence: `.github/workflows/quality-gates.yml:51-63` captures `semantic_audit.exit_code`; `.github/workflows/quality-gates.yml:68-87` summarizes production/catalog/local checks only; `.github/workflows/quality-gates.yml:92-139` opens issues only for production/catalog drift; `.github/workflows/quality-gates.yml:140-141` ignores the semantic result in the fail gate; `PROJECT_CONTEXT.md:144` says semantic audit is advisory catalog-maintenance signal.
  - Touches: `.github/workflows/quality-gates.yml`; optionally `scripts/audit-semantic-index.mjs` if a compact machine-readable summary is useful.
  - Acceptance: Weekly quality summaries show semantic-audit PASS/ATTENTION, artifacts remain uploaded, and any quality-gate issue body includes semantic candidates when present without turning advisory catalog-maintenance hints into automatic failures.
  - Verify: Run `quality-gates.yml` manually; inspect the job summary and uploaded issue/update body when semantic output is present.

- [ ] **T122** 🤖 P1 — Triage stale Dependabot PRs against current `main` before merge.
  - Why: One open Dependabot PR is based on an old v0.17.0 package surface and failing checks; blindly merging it can revert newer scripts, overrides, or version metadata.
  - Evidence: PR #9 (`dependabot/npm_and_yarn/content-safety-1c56996e79`) is open, last updated 2026-06-01, and its branch `package.json` says `"version": "0.17.0"` while `main` is `0.18.3`; PR #9 check `verify` failed in run `26789217704`; PR #12 (Astro 6.4.4) and PR #13 (GitHub Actions group) are current/mergeable with passing checks.
  - Touches: GitHub PR triage, Dependabot config only if stale branch recreation needs policy changes; no source edits unless the build machine chooses to merge/update a verified PR.
  - Acceptance: PR #9 is closed/recreated or rebased from current `main` before consideration; PR #12/#13 are either merged after full validation or intentionally deferred with notes; no dependency PR is merged from a branch that would regress `package.json` version/scripts/overrides.
  - Verify: `gh pr view 9 --json statusCheckRollup,updatedAt,url`; inspect the candidate branch `package.json`; after triage, confirm no open Dependabot PR has stale version/scripts relative to `main`.

---

## 🔬 Researcher Queue (Cycle 4 — 2026-06-04) — see [docs/research-2026-06-04-cycle-4.md](docs/research-2026-06-04-cycle-4.md)

- [ ] **T123** 🤖 P1 — Add a generated ranking report and drift guard for the `Recommended` catalog order.
  - Why: The homepage default order and project-page related links now depend on a build-time ranking algorithm whose behavior is otherwise visible only by inspecting rendered card order.
  - Evidence: `src/data/project-ranking.mjs` blends stars, 180-day freshness, and release downloads; `test/project-ranking.test.mjs` covers small fixtures only; `scripts/summarize-generated-data.mjs` does not report ranking distribution over the generated 177-project catalog.
  - Touches: `scripts/summarize-generated-data.mjs` or a small `ranking:audit` script; possibly `package.json` and `PROJECT_CONTEXT.md` for the generated-data contract.
  - Acceptance: The generated data summary or dedicated audit emits top-N rank rows with repo, rank, score parts, stars, days since update, and release downloads; it asserts normalized weights, finite scores, unique ranks, and usable names/repos without pinning a brittle full-order snapshot.
  - Verify: `npm run profile-feed:sync && npm run fetch-stars && npm run data:summary -- --out .tmp/data-refresh --max-age-hours 48 --fail-on-stale` reports finite ranking data and top-N explanation.

- [ ] **T124** 🤖 P2 — Surface the `Recommended` ranking rationale accessibly in catalog and related-link UI.
  - Why: `Recommended` is now the default sort, but the UI does not explain why a specific card is high in the list for keyboard, screen-reader, or trust-oriented browsing.
  - Evidence: `formatProjectRankingLabel()` already builds useful explanations; `CatalogEntry.astro` stores that label as `data-rank-label`; related links in `src/pages/projects/[slug].astro` use the same ranking map but expose no comparable rank context.
  - Touches: `src/components/CatalogEntry.astro`, `src/pages/index.astro`, `src/pages/projects/[slug].astro`, `public/scripts/main.js`, and CSS/docs as needed.
  - Acceptance: The existing rank label is exposed through visible or accessible card context when `Recommended` is active; related-link ranking context is not a silent algorithm; desktop and 390px mobile layouts do not overflow or become noisy.
  - Verify: Browser check desktop/mobile, `npm run a11y:audit`, and `npm run build`.

- [ ] **T125** 🤖 P2 — Add a Pagefind facet/index contract audit after static search generation.
  - Why: Visible facets depend on generated Pagefind index metadata, not only Astro source, so source-only checks can pass even if the built search bundle stops exposing Category filters.
  - Evidence: Project pages tag `data-pagefind-filter="Category:..."`; `/search/` renders the official filter pane; `package.json` has `search:index` but no script asserting `dist/pagefind` exposes the expected Category values or faceted results.
  - Touches: `package.json`, a new or existing script under `scripts/`, and possibly `PROJECT_CONTEXT.md`.
  - Acceptance: A post-build `search:audit` proves the Category facet exists, has expected category labels, and faceted empty-term search returns public project pages; counts are compared against rendered/catalog category data with only intentional tolerance.
  - Verify: `npm run build && npm run search:audit`.

---

## Remaining open — deferred with rationale (need design decision, heavy deps, or input)

These survived the v0.18.0 drain because they need a judgment call I shouldn't make unilaterally, a dependency/CI surface I can't fully verify headlessly, or your input. Each is scoped and ready to pick up.

- **T95** Remove CSP `unsafe-inline` for scripts — requires externalizing the theme-init (FOUC risk), the remaining `define:vars` (now just page sections, much smaller after T14), and Pagefind init, plus nonce/hashing. Largest, highest-regression-risk.
- **T41** README code syntax highlighting (Shiki) — build-time highlighter would emit inline `style`/CSS-var spans that the README `sanitize-html` allowlist strips; allowing `style` on README-derived content needs a security review. Dep + security-gated.
- **T42** OG images for interior pages — satori template work whose visual output can't be verified headlessly; the `og/[slug].png.ts` scaffold can be generalized once someone can eyeball the cards.
- **T43** Last-updated timestamps on /uses, /resume, /healthcare-it — deferred: hardcoded dates go stale and become a maintenance burden / misleading freshness signal. /now already carries a real date. Revisit if a data-driven `lastReviewed` field is added.

## Parked / rejected (carry-forward — see ROADMAP.md "Rejected or Parked")
Hosted backend search; analytics/visitor tracking; private-repo listing; auto GitHub visibility changes; Notes/TIL feed (NOTES_FEED_POLICY gates unmet); full CSS redesign; client-side embeddings; dependency-graph viz; project comparison tables; CSP data: URI in img-src (accepted); Spotify cookie-setting iframe (privacy — T31 uses static cards only).
