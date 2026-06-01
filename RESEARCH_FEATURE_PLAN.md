# Project Research and Feature Plan

> **Companion to [ROADMAP.md](ROADMAP.md), not a replacement.** The existing v0.18.0 roadmap (77 items: SEO, perf, security, a11y, nav, CI, competitive UX) is the tactical backlog. This document does three things that re-reading that roadmap cannot: **(1)** verifies which roadmap items are now stale/shipped after the 4 post-research "premium polish" commits, **(2)** surfaces **net-new** strategic/product/architecture opportunities the tactical audit missed, and **(3)** grounds both in competitive + standards research. Items already in ROADMAP.md are referenced, never re-litigated.
>
> Research date: 2026-06-01 · Repo: SysAdminDoc/sysadmindoc.github.io · Version: v0.17.0 (package.json) · Astro **6.3.3**
> Confidence labels used throughout: **Verified** (read the code), **Likely** (strong inference), **Assumption** (stated, needs check), **Needs live validation** (only confirmable in a browser/deploy).

---

## Executive Summary

This is a mature, unusually well-engineered static **Astro 6** portfolio for a senior systems administrator / medical-imaging-IT builder, deployed to GitHub Pages with zero runtime framework JS, a build-time GitHub data pipeline, satori OG images, Pagefind search, a service worker, and a strong privacy-first posture (no analytics, no cookies, self-hosted fonts, strict same-origin CSP). Its strongest current shape is **evidence-driven content** (baked star/release/freshness data, AST-validated project catalog) paired with **genuinely good engineering hygiene** (the `validate-project-data.mjs` AST validator and the SW update flow are better than most hand-rolled equivalents). The site does not need a redesign or a pile of new gadgets — the v0.18.0 roadmap already enumerates the tactical polish. The highest-value direction is **closing the gap between the site's craftsmanship and its three structural blind spots: (a) zero automated quality gates, (b) authored content that never reaches the page, and (c) a "live" GitHub pipeline with one outright-wrong computation and several silent-failure modes.**

**Top 10 opportunities, priority order (all net-new vs ROADMAP.md unless noted):**

1. **P0 — Fix the contribution-streak algorithm.** `fetch-stars.mjs:191-196` reports a positive "current streak" even when nothing was pushed today/yesterday. A site whose entire thesis is "evidence over claims" is shipping a wrong number in the hero. **Verified.**
2. **P0 — Add an automated a11y gate (axe-core, WCAG 2.2 AA) to CI.** The project treats a11y as "core product quality" and carries 15+ manual a11y items, but nothing prevents regression. **Verified gap.**
3. **P0 — Add `forced-colors` / Windows High Contrast support.** Zero `forced-colors`/`prefers-contrast` rules exist; the shadow/gradient/glass design collapses in WHCM and icon-only controls can vanish. Standards-mandatory after `-ms-high-contrast` removal (Edge 138, 2025). **Verified gap.**
4. **P1 — Add a test runner (`node:test` or Vitest) for the pure data/script logic.** No test runner exists at all; the streak math, semantic cosine scoring, release-body trimming, and validation invariants are only exercised at deploy time. **Verified gap.**
5. **P1 — Render the authored content that's currently dead.** `featured` entries beyond the first 3 (with hand-written desc/tags), `proof.ts` case studies (homepage-invisible), and the "music/Slunder" promise the Beyond-Code section makes but never delivers. **Verified.**
6. **P1 — Add a real contact/hire funnel.** No email, no LinkedIn, no contact affordance anywhere; "Open for thoughtful collaboration" has no reachable endpoint. (Roadmap covers *LinkedIn-in-footer* only; the conversion path is new.) **Verified.**
7. **P1 — Give the GitHub client layer rate-limit resilience** (conditional ETag requests → free 304s) **and a build-time language-donut fallback** so the Stack section isn't a permanent "Loading…" for no-JS/offline/rate-limited visitors. **Verified.**
8. **P1 — Ship `/llms.txt` + connect the JSON-LD `@graph`** (BreadcrumbList/CollectionPage/ProfilePage via `@id`) — the AEO frontier this site is one step away from owning. (Roadmap has BreadcrumbList/ProfilePage individually; llms.txt and graph-linking are new.) **Verified gap.**
9. **P1 — Reconcile version/stack drift + add a PR build gate.** Astro silently went 5→6; CLAUDE.md still says "Astro 5 / ~1175-line CSS"; deploy has no `pull_request` trigger so Dependabot PRs merge unvalidated. **Verified.**
10. **P2 — Make the terminal hero *real*** (history, tab-completion) and **migrate `public/` raster images to `astro:assets <Picture>`** (AVIF/srcset, deletes bespoke sharp pipeline) — the two biggest "credibility through craft" upgrades. **Verified.**

---

## Evidence Reviewed

### Local files & directories inspected (direct inspection)
- Root planning docs: `CLAUDE.md`, `AGENTS.md`, `ROADMAP.md` (full, 792 lines), `RESEARCH_REPORT.md` (head), `CHANGELOG.md` (head), `package.json`, `astro.config.mjs`, `.gitignore`, `public/manifest.json`, `public/robots.txt`.
- CI: `.github/workflows/{deploy,data-refresh,quality-gates}.yml` (quality-gates read in full).
- Source spot-checks: `src/layouts/Base.astro` (head/JSON-LD/inline-data region), `scripts/fetch-stars.mjs` (streak block, verified), `src/pages/index.astro` (`featured` usage), source-scoped greps for BreadcrumbList/ProfilePage/Speculation Rules/Web Share/popover/@layer/forced-colors (all absent).
- Full source tree + script inventory enumerated (`src/`, `public/scripts/`, `scripts/`).

### Structured deep-dive passes
- 5 code-inventory + roadmap-verification passes: **homepage/components**, **data layer + build scripts**, **client JS + SW + PWA**, **routes/SEO/meta/feeds**, **styles/a11y/CI**.
- 3 competitive/standards passes: **dev-portfolio landscape**, **Astro/SEO/AEO/PWA standards**, **a11y + quality-tooling + maintainability**.

### Git history reviewed
- `12c0e1a..HEAD` — 4 post-research "premium polish" commits (design tokens, card states, motion/divider perf, 404 polish).
- `124e21b` (v0.18.0 research) and the v0.17.0 drain (42 items / 13 commits) for context on what was just shipped.

### External sources (primary, via competitive research)
- Portfolio strategy: Josh Comeau *Effective Dev Portfolio*, Brittany Chiang, uses.tech, nownownow, satnaing/terminal-portfolio, homelab/PACS-admin portfolio examples.
- Standards/docs: llmstxt.org, Google Search Central (BreadcrumbList/sd-policies), schema.org (ProfilePage/CollectionPage), web.dev (INP), Chrome/MDN (Speculation Rules API), Astro docs (prefetch/clientPrerender, astro:assets, @astrojs/rss), WCAG 2.2 (W3C Rec 2024-12-12), Deque @axe-core/cli, pa11y, Lighthouse CI, MDN forced-colors, Edge `-ms-high-contrast` removal blog, MDN cascade layers, Vitest, Playwright visual snapshots, GoatCounter.

### Could not verify (flagged inline)
- Exact `_stats.json` streak value vs pushDays tail (file field-name probe returned empty; the **algorithm** bug is Verified, the live divergence is **Likely** per research observation).
- Anything requiring a running browser (LCP/INP numbers, forced-colors rendering, install-prompt behavior, prerender activation) — labeled **Needs live validation**.
- The competitive "sysadmin homelab metrics" framing assumes the owner *has* sanitizable uptime/scale/compliance numbers — **Assumption**.

---

## Current Product Map

**Type:** Static personal portfolio + project showcase. **Stack:** Astro 6 (static output), TypeScript data layer, vanilla JS for all client interactivity (served verbatim, not bundled), satori+resvg OG images, marked+sanitize-html README rendering, lightningcss, Pagefind, sharp image pipeline. **Distribution:** GitHub Pages via Actions (push deploy + daily data-refresh cron + weekly quality-gates cron).

**Core workflows:**
- *Visitor browse* — hero terminal → Greatest Hits → Live Apps → 150+ repo Catalog (client search/sort/filter, URL-persisted) → Skills donut → About/Career/Philosophy/Journey/Beyond/Connect.
- *Project deep-dive* — `/projects/[slug]` renders README (sanitized), releases, related projects, per-project OG.
- *Interior surfaces* — `/now`, `/uses`, `/resume`, `/healthcare-it`, `/timeline`, `/archive`, `/releases`, `/search`, `/lang/[slug]`, `/404`.
- *Machine surfaces* — `/rss.xml`, `/projects.json`, `/releases.json`, sitemap, OG endpoints, command palette (Ctrl+K).
- *Maintenance* — author edits `src/data/projects.ts` → build runs `data:validate` + `assets:audit` + `images:audit` → Astro build → SW stamp → Pagefind index.

**Personas:** (1) hiring manager / recruiter (skim, credibility, contact), (2) fellow sysadmin/dev (catalog depth, terminal, code), (3) AI/search crawler (structured data, feeds), (4) the owner-as-maintainer (data pipeline, validation).

**Integrations/permissions/data:** GitHub REST (build-time via `fetch-stars.mjs` with token; client-side live fill-in, unauthenticated 60/hr), YouTube-nocookie embeds, Spotify CDN (`i.scdn.co`) preconnect. Storage: 5 gitignored JSON caches (`_stars/_meta/_readmes/_releases/_stats`) + client `localStorage` cache. No backend, no cookies, no analytics.

---

## Feature Inventory

> Maturity ratings are Verified by direct code inspection. "Improvement opps" link to sections below.

| Feature | User value | Entry point | Main code | Maturity | Tests/docs | Improvement opp |
|---|---|---|---|---|---|---|
| **Hero terminal** | Interactive nav, personality, keyboard-first | `#hero` | `main.js` (~590-740) | **Complete but decorative** — no history/tab-complete; global keystroke hijack; output not screen-reader exposed | None / CLAUDE.md | NF-16, NF-17; roadmap terminal-a11y |
| **Hero stat counters** (repos/stars/live) | Live social proof | `#hero` `.hs-item` | `index.astro:380`, `main.js` | Complete; **no aria labels / aria-live** | None | roadmap (a11y) |
| **Commit-streak badge** | "Actively building" signal | hero pulse | `fetch-stars.mjs:191`, `index.astro:387` | **Broken** — wrong algorithm | None | **NF-1 (P0)** |
| **Greatest Hits** (curated flagships) | Primary showcase | `#` GreatestHits | `GreatestHits.astro` | Complete | aria-label only | NF-3 (case-study teasers) |
| **Featured data (9)** | Authored desc/tags | imported | `projects.ts`, `index.astro:64` | **Partial** — only `.slice(0,3)` rendered; rest dead | validate enforces shape | **NF-2 (P1)** |
| **Live Apps (22)** | Working demos + status | `#live` | `LiveCard.astro`, `main.js:269-311` | Complete; flat dump, no summary, status dot not a11y-exposed, same-origin-only probe | None | NF-5 |
| **Catalog (150+)** | Searchable archive | `#catalog` | `index.astro`, `main.js` | **Most mature surface** — search/sort/filter, URL state, aria-live, freshness badges, empty state | None | roadmap (tag facets), NF-13 (ranking) |
| **Skills donut** | Language mix | `#skills` | `index.astro:536`, `main.js:255` | **Partial/risk** — client-API-only; permanent "Loading…" w/o JS/offline/rate-limited | None | **NF-6 (P1)** |
| **Contribution heatmap** | Activity viz (R33) | `#` Heatmap | `Heatmap.astro` | Complete but thin — caps at 3+, no streak/peak context | None | NF-7 |
| **Career timeline** | Experience | `#career` | `index.astro` careerRoles | Complete; **duplicated** in `resume.astro`; date overlap unexplained | None | roadmap (extract shared) |
| **Beyond Code** | Personality (drone + music) | `#beyond` | `index.astro:692` | **Broken promise** — cmdk/copy promises music; only drone clips render | None | **NF-4** |
| **Connect** | Conversion | `#connect` | `index.astro:137` | **Incomplete** — no contact channel | None | **NF-8 (P1)** |
| **Project detail** | README/releases/related | `/projects/[slug]` | `[slug].astro` | Strong — sanitize-html, heading IDs, breadcrumbs, JSON-LD | None / CLAUDE.md | NF-23 (Shiki), NF-24 (richer JSON-LD), roadmap (Web Share, TOC) |
| **Command palette** | Fast nav | Ctrl+K | `cmdk.js`, `Base.astro:260` | Complete; **44KB inline data per page** (roadmap P0); invalid ARIA (roadmap) | None | INP pass (NF-30) |
| **Service worker / PWA** | Offline, installable, update toast | `sw.js`, `manifest.json` | Solid update flow; **no install prompt, thin manifest, plain-text offline, no SWR navigation** | None / CLAUDE.md | NF-18,19,21,22; roadmap (offline.html, shortcuts) |
| **GitHub data pipeline** | Live evidence | `fetch-stars.mjs` | Strong guards; **non-atomic writes, broken streak, lossy release trim** | None | NF-1,11,12 |
| **Data validation** | Integrity | `validate-project-data.mjs` | **Best-protected code** — AST-based, 200+ assertions | self-validating | NF-14,15 (extend) |
| **Search** | Full-text | `/search` Pagefind | Complete; **no facets/metadata** | None | NF-26 |
| **Feeds** | Syndication | `/rss.xml`, `*.json.ts` | RSS + 2 JSON indexes, `rel=alternate` | None | NF-9 (release feed), NF-25 (@astrojs/rss), NF-27 (llms.txt) |
| **OG images** | Social cards | `og/[slug].png.ts` | satori+resvg, per-project | None / IMAGE_PIPELINE.md | roadmap (interior OG) |
| **Theming** | Dark/light | `theme.js`, `global.css` | Complete; **no forced-colors/high-contrast; dark-hardcoded w/ misleading comment** | None | **NF-28 (P0)**, NF-31 |

---

## Competitive and Ecosystem Research

| Source | Notable capabilities | Learn (fits this project) | Avoid (would dilute identity) |
|---|---|---|---|
| **Josh Comeau — Effective Dev Portfolio** | Curation thesis (2-5 deep case studies), tour-guide narrative, optimize for hiring-manager + non-technical recruiter | Give 4-6 flagships real "problem → constraint → automation → measurable outcome" write-ups; push the other ~144 to the fast filterable archive | Front-end-centric live-demo/animation emphasis — a sysadmin proves value with diagrams/metrics/runbooks |
| **Brittany Chiang** | Single-page + separate `/archive`; reverse-chron experience w/ external press links; social-proof counts on flagships | The few-featured + full-archive split (this site already half-does it); footer-lists-the-real-stack as a trust signal; reframe counts as uptime %, hosts, study volume, DICOM nodes | Teal-on-navy "front-end engineer" aesthetic; gimmick easter eggs |
| **uses.tech / nownownow** | `/uses` + `/now` community conventions w/ inbound backlinks | Already shipped both — **PR into uses.tech** for a free backlink; keep `/now` current (it has a date already) | A stale `/now` actively signals dormancy; vanity gear-brag |
| **satnaing/terminal-portfolio + freeCodeCamp guide** | Real command set, history, tab-completion, aliases | Make the terminal *functional* (NF-16): history/Tab/`contact`/`uses` commands that navigate | A decorative terminal reads as gimmick; never gate contact/content behind the CLI (keep GUI + SR fallback) |
| **Plausible/Umami/GoatCounter (the thing NOT used)** | Cookieless analytics as a *values signal* | Make "no cookies, no analytics, no third-party requests, no backend" an explicit footer/`/privacy` statement — credible PHI-handling security judgment | Don't undercut it by adding any third-party script/cookie |
| **Homelab / PACS-admin portfolios** | Infra stories: architecture diagram + constraint + automation + measurable result; DICOM/HIPAA/CIIP credibility | Frame flagship case studies as infrastructure narratives; a **static, sanitized** "what I run" panel | **Never** expose real hostnames/IPs/endpoints/PHI — contradicts the security posture being sold |
| **llmstxt.org + Search Engine Land** | `/llms.txt` curated AI index (proposed, not ratified) | Ship a build-generated llms.txt from existing cmdk data (NF-27) — cheap on-brand AEO hedge | Don't over-invest or claim AI-traffic ROI; schema.org is the load-bearing AEO surface |
| **Google Search Central / schema.org** | BreadcrumbList, ProfilePage, CollectionPage, `@id` graph linking | Connect the `@graph` so the site is one knowledge graph, not a bag of objects (NF-29) | Don't mark up invisible breadcrumbs (sd-policy); don't use Article on non-articles; define Person once via `@id` |
| **Chrome/MDN/Astro — Speculation Rules** | Prerender for instant nav; Astro `experimental.clientPrerender` emits it from existing hover-prefetch | One-line `clientPrerender:true` upgrade (NF-32); GitHub Pages can't send the header so the inline-script/Astro route is the only path | Chrome-only — keep as progressive enhancement, never a dependency |
| **Astro astro:assets `<Picture>`** | Build-time AVIF/WebP + srcset/sizes + CLS-safe dims | Migrate `public/` raster art to `src/` imports (NF-22); deletes bespoke sharp pipeline + `images:audit` | `public/` images are never optimized by Astro; keep satori runtime-OG separate |
| **WCAG 2.2 / axe-core / Lighthouse CI / forced-colors / @layer / Vitest / Playwright** | The standard quality-automation + a11y + maintainability toolchain for static sites | Per-PR axe gate (NF-33), forced-colors block (NF-28), Lighthouse CI budget (NF-34), `@layer` (roadmap), Vitest for data (NF-12), visual regression (NF-35) | One a11y engine in CI is enough (axe ⊆ Lighthouse ⊆ pa11y); don't unit-test the 43KB main.js in jsdom; baseline visual snapshots in CI/Docker only |

**What to intentionally avoid (anti-goals from research):** cloning a front-end-flex aesthetic; client-side analytics of any kind; live infrastructure status links; turning `/uses`/`/now` into vanity pages; chasing AAA or lab-INP numbers that ignore the real cmdk keystroke loop; adding a second a11y/visual-regression tool with overlapping coverage.

---

## Roadmap Verification — what changed since the v0.18.0 audit

> The v0.18.0 ROADMAP.md was written **before** commits `12c0e1a, 1b63461, a534de0, c4c7b8d`. These deltas keep a future implementer from re-doing or mis-locating work. **All cross-checked against current HEAD.**

### Already shipped — mark complete in ROADMAP.md
- ✅ **`robots.txt`** (roadmap P0 "doesn't exist") — `public/robots.txt` exists (84 B, references `/sitemap-index.xml`). Roadmap evidence "grep returns zero" is stale. **Verified.**
- ✅ **Divider infinite/`will-change` perf** (roadmap P1) — `a534de0` reworked it; `global.css:135-136` now uses `animation-play-state:paused` + `.dv.vis::after{…running}` (JS adds `.vis` on intersect); no `will-change:transform` on `.dv::after`. **Verified.**

### Partially done — narrow the remaining scope
- ◑ **Last-updated timestamps** — `now.astro:78` already shows "Updated <time>"; **only** `/uses`, `/resume`, `/healthcare-it` remain, and none emit `dateModified`. **Verified.**
- ◑ **Dependabot grouping** — `dependabot.yml` already has `groups:` (astro, content-safety); only `labels:`/`assignees:`/update-type catch-all remain. **Verified.**
- ◑ **JS scroll-reveal + mobile-nav focus-trap items** — logic **moved from `theme.js` → `shared.js:142-214`**. Issues still valid, but the roadmap's "Touches: theme.js" paths are **stale** — editing theme.js will hit nothing. **Verified.**
- ◑ **`content-visibility`** — the "removed, can cause blank flashes" comment was cleaned in polish commits, but the optimization is still absent. **Verified.**

### Claim drifted (line numbers / framing inaccurate, issue still real)
- ⚠ **Career date overlap** — still a 4-year ThinkTV/Maven overlap, but `careerRoles` is now ~`index.astro:215-264`, not the roadmap's `:219/:237`.
- ⚠ **404 footer** — `c4c7b8d` polished buttons/microcopy but did **not** add a footer; item still open.
- ⚠ **`@layer` surfaced as "new" in competitive research** — it is **already in ROADMAP.md** (P2, Larger Bets). Treat as existing, not net-new.

### Confirmed still-valid (representative; ~40 roadmap items spot-checked accurate)
44KB inline `__PORTFOLIO_DATA` (`Base.astro:260`), BreadcrumbList/ProfilePage absent, dns-prefetch to youtube (`Base.astro:225`), Web Share absent, cmdk `<a role=option>` ARIA, SW `shared.js` precache miss, `sw:stamp` placeholder, PWA shortcuts/offline.html, film-grain gate, hero-stat a11y, `.nvmrc`/`engines`, `.claude/` not gitignored, CI validation triple-run, `semantic:audit` not in CI, `font-display:optional`, `deploy.yml cancel-in-progress:false`, fetch-stars non-atomic writes, unused `cpp` category, Playwright undocumented dep. **Verified.**

---

## Highest-Value New Features

> Numbered **NF-#**. Every item is **absent from ROADMAP.md** (dedup-checked). Complexity S/M/L/XL, Priority P0-P3.

### NF-1 — Fix the contribution-streak algorithm · P0 · S · **Verified**
- **Problem:** The hero "streak" badge can report a positive current streak when nothing was pushed today or yesterday — a wrong number on a site built on "evidence over claims."
- **Evidence:** `scripts/fetch-stars.mjs:191-196` loops `i=0..89` from today: `if (pushDaySet.has(day)) streak+=1; else if (streak>0) break;`. When `i=0` (today) has no push, `streak` is 0 so the `break` never fires; the loop scans backward and **starts counting from the first pushed day it finds**, so it measures "length of the most-recent reachable run" — not a streak ending now. A genuine current streak should be 0 if you didn't push today/yesterday. Live divergence (`_stats.json streak` vs actual consecutive tail) observed during the data-layer pass — **Likely**.
- **Proposed:** Walk strictly backward from the **most recent pushed day**; stop at the first missing UTC day. Document whether "no push today yet" carries yesterday's streak or resets. Emit `streak=0` explicitly when the latest push is >1 day old.
- **Touches:** `scripts/fetch-stars.mjs` (streak block); display `index.astro` hero pulse / `theme.js`.
- **Risks/edges:** timezone (uses UTC already — keep), repo `pushed_at` folded in broadens the set (intended), empty pushDays.
- **Verify:** Unit-test against fixtures (consecutive run / gap / no-push-today / empty); re-run `fetch-stars` and compare `_stats.json`.

### NF-2 — Render the authored `featured` content that's currently dead · P1 · M · **Verified**
- **Problem:** `featured` entries carry hand-written `desc`/`tags`/`langLabel`, but only `featured.slice(0,3)` (hero reel) + a name map consume them (`index.astro:64,316`). The remaining entries and all their authored copy never reach the page — wasted storytelling and a hero reel that under-delivers on "signature builds."
- **Evidence:** `index.astro:10,64,316` are the only `featured` usages; `FeaturedCard.astro` no longer exists. **Verified** (exact unused count is **Likely** — depends on `featured.length`).
- **Proposed:** Restore a compact "Featured builds" strip (reusing existing tags/desc) between hero and Greatest Hits, **or** prune `featured` to exactly what the hero consumes so the dataset isn't misleadingly authored. Restoring is higher-value (reuses written copy, more above-fold storytelling).
- **Touches:** `index.astro` (new strip), `projects.ts` (decide length), optional small component.
- **Verify:** Build; all featured entries (or a deliberate subset) render with desc/tags, no orphaned data.

### NF-3 — Tease `proof.ts` case studies on the homepage · P2 · S · **Verified**
- **Problem:** `proof.ts` holds full case studies (context/decisions/outcomes) — the strongest trust asset — but they only appear two clicks deep on detail pages. Greatest Hits even labels a card "Lead case study" while linking straight past the teaser.
- **Evidence:** 3 `proof.ts` entries have `caseStudy`; only `[slug].astro` consumes them; `GreatestHits.astro:32-33` labels but doesn't tease.
- **Proposed:** On Greatest Hits cards for the 3 repos with `caseStudy`, render a "Case study" badge or first-`outcomes[]` line. Above-fold credibility hook; makes the existing label honest.
- **Touches:** `GreatestHits.astro` (import proof), `proof.ts` (export `slug→firstOutcome` helper).
- **Verify:** Build; the 3 repos show a distinguishing marker, others show the normal label.

### NF-4 — Resolve the "music/Slunder" broken content promise · P2 · M (a) / S (b) · **Verified**
- **Problem:** The Beyond-Code cmdk entry promises "Drone work, **music**, and the rest of the creative output" (`index.astro:332`), and the owner is Slunder on Spotify — but `#beyond` renders only drone clips. Reads as unfinished/stale.
- **Evidence:** `index.astro:692-707` renders only `aerialClips`; grep for spotify/slunder/music returns only the promise string at `:332`; CLAUDE.md notes a removed Spotify embed.
- **Proposed:** (a, stronger) Restore a "Music" subsection with a privacy-respecting Spotify embed or static album cards linking out (needs CSP `frame-src open.spotify.com`; `i.scdn.co` already preconnected). (b) Correct the copy to stop promising music.
- **Touches:** `index.astro` (#beyond + cmdk:332 + connect copy), `curated.ts` (music data), `Base.astro` (CSP).
- **Risks:** Spotify iframe sets third-party cookies — **conflicts with the privacy-first thesis**; prefer static cards + outbound link, or an explicit click-to-load. **Decide vs privacy posture.**
- **Verify:** Load `#beyond`; music renders or the promise is removed; cmdk description matches reality.

### NF-5 — Live Apps overview + accessible status · P2 · M · **Verified**
- **Problem:** 22 LiveCards dumped flat — no count/summary, no filter, and the per-card status dot (`main.js:269-311`) has no text/aria equivalent, so the status-probe work is invisible to AT and skimmers.
- **Evidence:** `index.astro:473-478` maps all 22 with a generic header; `LiveCard.astro:48` badge only; `main.js:287` returns early for cross-origin (latent trap if a custom-domain app is added).
- **Proposed:** Aggregate the HEAD probes main.js already runs into an "N live, all reachable" summary; give the status dot a visually-hidden "reachable/unreachable" label; optional category quick-filter reusing catalog vocabulary.
- **Touches:** `index.astro` (#live header), `LiveCard.astro` (dot a11y text), `main.js:269-311` (write aggregate after probes).
- **Verify:** Summary renders; SR announces status; filter narrows grid if added.

### NF-6 — Build-time language-donut fallback · P1 · M · **Verified**
- **Problem:** The Stack donut is populated **only** client-side from the GitHub API, so no-JS / offline / SW-cached / rate-limited (60/hr) visitors see a permanent "Loading the language mix…" dead-end — despite language data already baked in `_meta.json`.
- **Evidence:** `index.astro:536-552` ships a "Loading…" fallback + aria-hidden ring; real donut injected by `main.js:264` only on fetch success; `scheduleIdle(fetchGitHub,1200)`.
- **Proposed:** Render the donut (or a baked language list) at build time from `_meta.json`; let main.js enhance/refresh. Matches the "evidence over claims / build-time baked" principle.
- **Touches:** `index.astro` (#langDonut build-time compute), `main.js:255-265` (treat as enhancement).
- **Verify:** Disable JS / go offline → donut shows real baked data; with JS it still refreshes.

### NF-7 — Enrich the heatmap (streak, peak, 4th bucket) · P3 · S · **Verified**
- **Problem:** Heatmap caps intensity at 3+ pushes (flattens busy days) and shows only a total; `stats.streak` and per-day data already exist but aren't surfaced — the freshly-added feature reads as decoration.
- **Evidence:** `Heatmap.astro:76-82,89-91`; `stats.streak` used at `index.astro:387` but not passed to Heatmap (`:462-466`).
- **Proposed:** Pass `stats.streak`; add a "busiest day/month" derived stat; add a 4th intensity bucket.
- **Touches:** `Heatmap.astro`, `index.astro:462-465`.
- **Verify:** Header shows streak + peak; high-push days visually distinct.

### NF-8 — Contact/hire funnel · P1 · S · **Verified**
- **Problem:** "Open for thoughtful collaboration" with **no reachable endpoint** — no email, no LinkedIn surfaced, no contact card. Every Connect path routes internally or to the GitHub profile.
- **Evidence:** No `mailto`/email anywhere in `index.astro`+components; `connectPaths:137-198` = search/github/releases/timeline/archive/now; LinkedIn URL exists in `Base.astro:238` `sameAs` but is never surfaced. (Roadmap adds LinkedIn-to-footer; a contact channel + "what happens next" is new.)
- **Proposed:** Add a "Get in touch" Connect card with `mailto:` (or obfuscated email) + the existing LinkedIn URL + a "usually reply within X" line; make the hero collaboration pill scroll to `#connect`. On a static host, contact = mailto/LinkedIn/GitHub (no backend form).
- **Touches:** `index.astro` (connectPaths, hero pill), reuse `Base.astro` LinkedIn.
- **Verify:** Connect shows a working direct-contact channel.

### NF-9 — Dedicated releases feed (RSS/Atom + JSON) · P3 · S · **Verified gap**
- **Problem:** `rss.xml` is a *project* feed (one item per repo by push date). There's no subscribable **release-events** stream — the most valuable feed for a maintainer — even though `_releases.json` and `/releases/` exist.
- **Evidence:** Only `rss.xml.ts` exists; its items are projects (`:28-60`); R36 shipped the project feed, no release feed; v0.18.0 has zero feed items.
- **Proposed:** `src/pages/releases.xml.ts` from `_releases.json` sorted by `publishedAt`; `rel=alternate` in Base; subscribe link on `/releases/`.
- **Touches:** `releases.xml.ts` (new), `Base.astro`, `releases.astro`.
- **Verify:** Curl `/releases.xml`, validate via W3C Feed Validator.

### NF-10 — JSON Resume export + static PDF · P3 · M · **Verified gap**
- **Problem:** `/resume` only offers `window.print()`. No machine-readable jsonresume.org export for ATS/parsers, no pre-built PDF. (Roadmap resume items are only "add contact info" + "extract shared career data" — export is new.)
- **Evidence:** `resume.astro:132-136` prints only; `careerRoles`/skills are already structured arrays.
- **Proposed:** `src/pages/resume.json.ts` (jsonresume schema from shared career data — pairs with the roadmap's career-extraction item); visible "Download JSON Resume"; optional build-time `resume.pdf` via the existing Playwright pipeline.
- **Touches:** `resume.json.ts` (new), shared `career.ts`, `resume.astro`.
- **Verify:** Curl `/resume.json`, validate against jsonresume schema.

### NF-11 — Harden the GitHub data pipeline (atomicity + integrity) · P2 · S-M · **Verified**
- **Problem:** Five scattered `writeFileSync` calls (`fetch-stars.mjs:217/218/232/286/297`) mean a crash mid-README-fetch leaves stars/meta/releases fresh but readmes stale, undetected; `summarize-generated-data.mjs:76-101` only checks `stars==totalRepos`/`meta==totalRepos`, never that `_readmes` keys ⊆ `_meta` or that releases reference known repos; release-body trim (`:265-272`) can yield an empty summary with no fallback.
- **Evidence:** as cited. (Roadmap has the *atomicity* item; the **cross-file integrity checks**, **release-body fallback**, and **skip-on-missing-tag** guards are new.)
- **Proposed:** Temp-file-then-rename batched write; add `summarize` checks (readmes⊆meta, releases.repo∈meta, optional mtime-divergence warn) into the `--fail-on-stale` array; release fallback to `name`/`Release <tag>` and skip records missing `tag_name`/`html_url`.
- **Touches:** `fetch-stars.mjs`, `summarize-generated-data.mjs`.
- **Verify:** Fixture where `_readmes` has a repo absent from `_meta` → non-zero exit; badges-only release body → non-empty fallback.

### NF-12 — Add a test runner for pure data/script logic · P1 · M · **Verified gap**
- **Problem:** **No test runner exists** (no `test` script, no vitest/jest). The richest pure logic — streak math, `getUtcDayKey`, semantic `tokenize/normalizeToken/cosine`, release trim, 200+ validation invariants — is only exercised at deploy time, so regressions surface in production data.
- **Evidence:** `package.json` has no `test`; no `*.test.*`/config files. (Note: CLAUDE.md says "No tests unless explicitly requested" — **this proposal is the explicit request to reconsider for the data layer only**, not UI.)
- **Proposed:** Add `node:test` (zero deps) or Vitest (near-zero config on Vite/Astro, and Astro-recommended). Extract pure helpers into importable functions; cover with fixtures; wire `npm test` into `quality-gates.yml` (advisory → blocking). Aim at data/content, **not** the 43KB main.js in jsdom.
- **Touches:** `test/` (new), `package.json`, refactor pure helpers out of `fetch-stars.mjs`/`audit-semantic-index.mjs`, `quality-gates.yml`.
- **Verify:** `npm test` passes; break the streak fixture → suite fails.

### NF-13 — Build-time project ranking signal · P2 · M · **Likely**
- **Problem:** Catalog and "related" ordering are hand-position + advisory cosine; stars/recency/release-downloads already exist in caches but are never combined into a rank to surface strongest work first.
- **Evidence:** `_stats/_meta/_releases.json` hold stars, `pushedAt`, per-release `download_count` (`fetch-stars.mjs:257`); `audit-semantic-index.mjs` only prints advisory pairs; catalog order is manual.
- **Proposed:** Deterministic `compute-rankings.mjs` (weighted stars + recency decay + release activity) → generated JSON driving default catalog sort + related-fallback on similarity ties. Documented weights.
- **Touches:** `compute-rankings.mjs` (new) or extend `fetch-stars.mjs`, `derived.ts`, `index.astro` sort, `[slug].astro` related.
- **Verify:** Highest-star/most-recent repos rank top in a built page.

### NF-14 / NF-15 — Extend the AST validator · P3 · S each · **Verified gap**
- **NF-14 Content-drift audit:** capture `repo.description` in `_meta.json` (currently omitted, `fetch-stars.mjs:157-162`) and add an advisory audit flagging catalog `desc` that materially diverges from live GitHub description or case-only repo renames. `audit-catalog.mjs:65-73` only checks membership today.
- **NF-15 featured⊆catalog invariant:** `validate-project-data.mjs:285-287` enforces live↔catalog parity but a `featured` repo can lack a catalog entry (missing from search/filters while holding a hero slot). Add an advisory warning.
- **Verify:** Mismatch a desc → flagged; remove a featured repo's catalog entry → warned.

### NF-16 — Make the terminal real (history + Tab completion) · P2 · S · **Verified**
- **Problem:** The hero terminal (`matt@sysadmin$`, 15+ commands) ignores Up/Down and Tab — anyone who uses a shell hits dead air, breaking the very illusion the feature exists to create.
- **Evidence:** `main.js:658` keydown only branches on Enter; no history buffer, no Tab; `getProjectMatches()` (`:590`) already ranks matches Tab could reuse.
- **Proposed:** Session `commandHistory` (Up/Down recall, cap ~50); Tab completes `open <q>` to top match and bare command names against `Object.keys(commands)`. No persistence.
- **Touches:** `main.js` (keydown ~658-680).
- **Verify:** Run two commands, Up recalls; `open astra`+Tab → `open astra-deck`.

### NF-17 — Terminal a11y + safe render (complements roadmap) · P3 · M · **Verified**
- **Problem:** Global keystroke hijack activates the terminal on any single char (`main.js:702-709`); output `innerHTML` (`:674`) is per-command-discipline safe today but structurally fragile; output has no `role=log`/`aria-live`; Konami easter egg bypasses `prefersReducedMotion` (`:712-737`). (Roadmap has terminal-a11y broadly; the **structured-render guardrail** + **reduced-motion easter-egg gate** are new.)
- **Proposed:** Route command results through a token-list renderer using `textContent`; add `role=log` + `aria-live=polite`; gate the Konami animation on reduced-motion; focus-gate the global keystroke activation.
- **Touches:** `main.js` (handlers 614-642, render 672-675, 702-737).
- **Verify:** Temp command echoing raw input renders as text; SR announces output; reduced-motion suppresses the matrix.

### NF-18 — Conditional GitHub requests (ETag → free 304s) · P2 · M · **Verified**
- **Problem:** Unauthenticated GitHub is 60/hr per IP; a cold homepage fires up to 10 paginated `/repos` GETs (`main.js:89`) with no `If-None-Match`, so a CGNAT/shared IP or rapid multi-tab can exhaust the budget and silently freeze live data for everyone behind it.
- **Evidence:** `fetchAllRepos:87-99` plain GETs; cache (`:135`) stores data but not ETag. **304s don't count against the rate limit.**
- **Proposed:** Persist ETag/Last-Modified per page; send `If-None-Match`; on 304 reuse cache and skip parse. Keep TTL as the trigger cadence.
- **Touches:** `main.js` (fetchAllRepos, cache read/write 110-138).
- **Verify (Needs live validation):** DevTools — refresh sends `If-None-Match`, receives 304, `X-RateLimit-Remaining` doesn't decrement.

### NF-19 — Custom PWA install prompt · P3 · M · **Verified gap**
- **Problem:** Full manifest + SW + update toast, but `beforeinstallprompt` is never captured, so installs effectively never happen (Chromium users get only the easily-missed mini-infobar; iOS gets nothing).
- **Evidence:** zero `beforeinstallprompt`/`appinstalled` matches; `main.js:798-847` handles SW only; manifest is install-eligible.
- **Proposed:** Capture/`preventDefault`/stash the event; reveal a dismissible "Install" chip (reuse toast styling); `prompt()` on click; hide on `appinstalled`; remember dismissal; optional iOS "Add to Home Screen" hint.
- **Touches:** `main.js` (new block near SW reg), `global.css` (reuse `.sw-update-toast`).
- **Verify (Needs live validation):** Chrome desktop shows chip; click triggers native dialog; hides after install.

### NF-20 — SW stale-while-revalidate navigation · P2 · M · **Verified**
- **Problem:** Navigations are network-first with a 10s timeout (`sw.js:51-63`); a slow-but-alive connection gives a blank wait before paint even though a good cached copy exists (SWR only used for the generic same-origin branch `:83-96`).
- **Proposed:** For same-origin navigations, respond from cache immediately + background-revalidate, falling back to network when uncached; keep the update toast as the freshness surface.
- **Touches:** `sw.js` (navigation branch 51-63).
- **Verify (Needs live validation):** Slow-3G second visit paints from cache instantly; background revalidation completes after paint.

### NF-21 — localStorage resilience / in-memory fallback · P3 · S · **Verified**
- **Problem:** All cache read/write swallow errors into empty catches (`main.js:10-11`); in private-mode/quota-exceeded the GitHub + live-status caches never persist, so every visit re-fetches/re-probes — the exact users most likely to hit the rate limit. No shape guard beyond `JSON.parse`.
- **Proposed:** Detect availability once; fall back to a module-scoped in-memory cache so TTL still suppresses repeat fetches per session; add a lightweight shape/version check dropping malformed entries.
- **Touches:** `main.js` (readJsonCache/writeJsonCache, fetchGitHub validation).
- **Verify (Needs live validation):** Block localStorage → one fetch per session, no console errors.

### NF-22 — Migrate `public/` raster images to `astro:assets <Picture>` · P1 · L · **Verified gap**
- **Problem:** Screenshots/raster art live in `public/` (which Astro **never** optimizes) behind a hand-rolled sharp script + `images:audit` gate. Astro's stable `<Picture formats={['avif','webp']}>` generates AVIF/WebP + full srcset/sizes + CLS-safe dims automatically — letting you delete bespoke pipeline code. This is the single biggest current-standards gap.
- **Evidence:** `package.json` sharp + `images:audit`; images served from `public/`; no `astro:assets` import usage. Astro 6 stabilized `image.layout`.
- **Proposed:** Migrate screenshots/OG-source art to `src/` imports through `<Picture>` with `image.layout:'constrained'`; keep `width/height` (CLS). Keep the satori runtime-OG pipeline separate. Migrate incrementally.
- **Touches:** components rendering screenshots, image data paths, `astro.config` image config, retire parts of `audit-image-pipeline.mjs`.
- **Risks:** large diff; verify no CLS regression and SW precache paths update.
- **Verify:** Build emits AVIF + srcset; Lighthouse shows smaller responsive images; no layout shift.

### NF-23 — README code-block syntax highlighting (Shiki) · P3 · M · **Verified gap**
- **Problem:** Project READMEs are the richest content but fenced code renders as flat monochrome `<pre><code>` — for a dev portfolio this looks worse than GitHub itself.
- **Evidence:** `[slug].astro` `marked.use()` (`:84-106`) overrides image/link but not the **code** renderer; no shiki/prism/hljs anywhere; `global.css:624-626` single bg color.
- **Proposed:** Build-time Shiki (zero client JS) via a marked code renderer emitting pre-highlighted spans themed to the dark/light tokens. Preserves the static, no-runtime-JS posture.
- **Touches:** `[slug].astro` (code renderer), `package.json` (shiki), `global.css` (token colors).
- **Verify:** A PowerShell repo's fenced block shows colored tokens in both themes; no client JS added.

### NF-24 — Enrich project `SoftwareSourceCode` JSON-LD · P2 · S · **Verified gap**
- **Problem:** Project JSON-LD has only name/desc/repo/language/author — no `image`, `dateModified` (freshness already known), `keywords` (tags exist), or `SoftwareApplication` facet for live apps. (Distinct from the roadmap's BreadcrumbList/ProfilePage items.)
- **Evidence:** `[slug].astro:276-285`; `updatedAt`/tags/ogImage all computed in-frontmatter but never added to the schema.
- **Proposed:** Add `image`, `dateModified`, `keywords`; for live apps emit a `SoftwareApplication` node with `applicationCategory` + free `offers`. Combine into a `@graph` when BreadcrumbList lands (NF-29).
- **Touches:** `[slug].astro:276-285`.
- **Verify:** Google Rich Results / schema.org validator shows image+dateModified+keywords.

### NF-25 — Migrate to `@astrojs/rss` + `content:encoded` · P2 · M · **Verified gap**
- **Problem:** `rss.xml.ts` is a hand-rolled XML string template; `@astrojs/rss` gives spec-correct escaping/GUIDs/atom:self and supports full-content `<content:encoded>` (sanitized via the `sanitize-html` already in deps).
- **Touches:** `rss.xml.ts`, `package.json`.
- **Verify:** Feed validates; items carry sanitized content:encoded.

### NF-26 — Pagefind facets + metadata · P2 · M · **Verified gap**
- **Problem:** `/search` indexes pages with zero `data-pagefind-*`, so results can't be filtered by category/type/language and cards lack structured metadata.
- **Evidence:** zero `data-pagefind` matches; `search.astro:46-52` has no `<pagefind-filter>`.
- **Proposed:** Add `data-pagefind-filter='category:<label>'` + `data-pagefind-meta` (type/stars/updated) to the project-header region; add a `<pagefind-filter>` control; optional `data-pagefind-body` to exclude nav/footer noise.
- **Touches:** `[slug].astro`, `search.astro`, `lang/[slug].astro`.
- **Verify:** Filter dropdown narrows results.

### NF-27 — `/llms.txt` (AEO) · P1 · S · **Verified gap**
- **Problem:** AI answer engines increasingly read `/llms.txt`; the site has rich machine indexes but nothing in this convention. Cheap, on-brand for a "here's my strongest work" portfolio.
- **Evidence:** no `llms*.txt`; not mentioned anywhere in ROADMAP.md.
- **Proposed:** `src/pages/llms.txt.ts` emitting the spec (H1, blockquote summary, `## Projects/## Pages/## Feeds` link lists) from the same data feeding cmdk/RSS; reference in robots.txt; optional `llms-full.txt`.
- **Touches:** `llms.txt.ts` (new), `robots.txt`, reuse `projects.ts`/`curated.ts`.
- **Verify:** Curl `/llms.txt` → valid markdown; validate vs llmstxt.org format.

### NF-28 — `forced-colors` / Windows High Contrast support · P0 · M · **Verified gap**
- **Problem:** Zero `forced-colors`/`prefers-contrast` rules. The glass/shadow/gradient design isn't honored in WHCM: box-shadow focus halos drop, semi-transparent borders vanish, icon-only buttons (theme toggle, back-to-top, mobile nav) can disappear. Standards-mandatory after `-ms-high-contrast` removal (Edge 138, June 2025).
- **Evidence:** grep zero `forced-colors`; focus system relies on `box-shadow:var(--focus-ring)` (`global.css:421`); icon buttons are SVG-in-button with no fallback.
- **Proposed:** One targeted `@media (forced-colors: active)` block — `:focus-visible` outlines via `Highlight`/`CanvasText`, borders via `ButtonText`/`CanvasText` replacing shadow separation, keep icon controls visible, hide decorative film-grain/divider; optional `prefers-contrast: more` bumping `--t2/--t3`/border tokens. Let semantic HTML do the rest (don't build a separate theme; don't use `forced-color-adjust:none`).
- **Touches:** `global.css` (new block near the reduced-motion block ~`:406`).
- **Verify (Needs live validation):** Windows Contrast theme or DevTools emulate forced-colors → focus rings + icon buttons visible, no invisible controls.

### NF-29 — Connect the JSON-LD `@graph` · P1 · M · **Verified gap**
- **Problem:** `@graph` has WebSite + Person + disconnected per-page SoftwareSourceCode — no breadcrumbs, no catalog ItemList, no ProfilePage, no `@id` linking. (Roadmap has BreadcrumbList + homepage ProfilePage/ItemList **individually**; the **graph-linking via stable `@id`** and **lang-lane CollectionPage** are new.)
- **Proposed:** Give Person a stable `@id` (`#matt-parker`); reference it from a homepage `ProfilePage`, a catalog `CollectionPage(ItemList of project @ids)`, `BreadcrumbList` on `/projects/[slug]`, and `CollectionPage+ItemList` on `/lang/[slug]` (which currently emits no JSON-LD at all). Define Person once, reference everywhere.
- **Touches:** `Base.astro`, `[slug].astro`, `lang/[slug].astro`, `index.astro`.
- **Verify:** schema.org validator shows a connected graph; lang pages validate CollectionPage.

### NF-30 — INP hygiene on the cmdk keystroke filter · P2 · M · **Likely**
- **Problem:** The only real interaction loop is cmdk filtering the full project list on every keystroke; as the catalog grows, an unthrottled per-keystroke filter + layout-read patterns in `shared.js` are the realistic INP regressions (target ≤200ms).
- **Proposed:** Debounce/`scheduler.yield()` the filter; batch DOM reads. No new deps. Measure locally (no RUM script — privacy posture).
- **Touches:** `cmdk.js`, `shared.js`.
- **Verify (Needs live validation):** PerformanceObserver/Lighthouse INP under 200ms on rapid typing.

### NF-31 — `accent-color` token for native controls · P3 · S · **Verified gap**
- **Problem:** The catalog sort `<select>` and any native controls render with the UA default (blue) accent, clashing with the brand. The token system (added `12c0e1a`) covers surface/radius/shadow/type but not `accent-color`.
- **Proposed:** `accent-color: var(--blue)` at `:root` + light override. One line per theme.
- **Touches:** `global.css`.
- **Verify:** Sort dropdown accent matches brand in both themes.

### NF-32 — `experimental.clientPrerender` (Speculation Rules) · P1 · S · **Verified gap**
- **Problem:** `astro.config` already sets `prefetch.defaultStrategy:'hover'` with `prefetchAll:false`; flipping `experimental:{clientPrerender:true}` upgrades those hovers into real Chromium prerenders for near-instant navigation — zero template changes, no extra JS. (GitHub Pages can't send the Speculation-Rules header, so Astro's inline-script route is the only viable path — this is it.)
- **Proposed:** Add the flag; keep `prefetchAll:false` (don't blow Chrome's speculation budget); pin Astro (experimental).
- **Touches:** `astro.config.mjs`.
- **Verify (Needs live validation):** DevTools → Application → Speculative Loads shows prerenders on hover; no Firefox/Safari regression.

### NF-33 — Per-PR axe-core WCAG 2.2 AA gate · P0 · M · **Verified gap**
- **Problem:** a11y is declared "core product quality" with 15+ manual items, but **no automated a11y gate** exists and `quality-gates.yml` runs only on Monday cron. Every fix can silently regress.
- **Evidence:** zero `axe`/`pa11y`/`lighthouse` in `package.json`/`.github/`; `quality-gates.yml:50-57` runs only data/asset/astro-check; `audit-performance.mjs` already drives Chrome via CDP (plumbing exists).
- **Proposed:** `scripts/audit-a11y.mjs` builds dist, serves it, runs `@axe-core/cli --tags wcag22aa --exit` (the official Deque engine, most accurate, exit-1 on violations) against ~6 curated routes (/, /search, a project detail, /resume, /archive, /404). Advisory first (mirror `semantic:audit`), graduate to blocking once the known-issue list drains. Pin the CLI (tracks axe-core major.minor).
- **Touches:** `audit-a11y.mjs` (new), `package.json`, `quality-gates.yml` (+ a new PR-triggered `ci.yml`, see NF-36).
- **Verify:** `npm run a11y:audit` reports violations + exit code; CI uploads the log artifact.

### NF-34 — Lighthouse CI budget tracker · P1 · M · **Verified gap**
- **Problem:** The mobile LCP regression (3156ms vs 2500ms) is a known standing issue with no automated budget; `audit:perf` (CDP) is never run in CI; the Lighthouse CLI was abandoned on Windows for an EPERM bug (`PERFORMANCE_AUDIT.md:54`) — but **Ubuntu CI runners don't hit that bug**.
- **Proposed:** `@lhci/cli` with `staticDistDir: ./dist` (perfect for Astro/Pages), `numberOfRuns:3`, assert `categories.accessibility>=0.95` + JS/CSS byte budgets (guard the 43KB main.js + large global.css). Advisory/non-blocking (scores flake); use axe as the blocking a11y gate, Lighthouse for trend.
- **Touches:** `quality-gates.yml`/`ci.yml`, `lighthouserc.json`, `package.json`.
- **Verify:** Job summary shows LCP/CLS; a synthetic over-budget value fails (advisory) the job.

### NF-35 — Playwright visual + a11y-state regression · P2 · L · **Verified gap**
- **Problem:** After the `@layer` refactor (roadmap) and the forced-colors block (NF-28), there's no safety net for silent layout/contrast breakage.
- **Proposed:** Built-in `toHaveScreenshot` (no extra service) on key pages × {light, dark, forced-colors via `forcedColors`/`colorScheme` context options} + `@axe-core/playwright` for interactive states (open menus, focus rings) the static sweep misses. **Critical:** baseline in the **same Ubuntu/Docker CI** (never Windows→Ubuntu) and mask volatile content (live stars, dates, heatmap) with `stylePath`.
- **Touches:** `tests/` (new), `package.json`, CI.
- **Verify:** A deliberate CSS break diffs red; masked dynamic regions don't.

### NF-36 — PR build gate + supply-chain hardening · P2 (build gate) / P3 (SHA pin) · S · **Verified gap**
- **Problem:** `deploy.yml` triggers only on `push:main` + dispatch — **no `pull_request` trigger**, so Dependabot's up-to-10 weekly PRs merge with no verified green build; first failure signal is a broken production deploy. Separately, all actions float on `@v4/@v7` tags in workflows holding `pages:write`+`id-token:write`.
- **Proposed:** `ci.yml` on `pull_request` running `npm ci && npm run check && npm run build` (skip star fetch / use cached data), with concurrency cancellation — and host the NF-33/34/12 gates here. Pin each third-party action to a full commit SHA with a `# vX.Y.Z` comment; let Dependabot's github-actions ecosystem bump them.
- **Touches:** `.github/workflows/ci.yml` (new), `deploy.yml`, `quality-gates.yml`, `data-refresh.yml`.
- **Verify:** Open a test PR → build/check + gates report status before merge; workflows still resolve after SHA pinning.

---

## Existing Feature Improvements

> These refine **shipped** behavior (distinct from net-new). Each notes backward-compat.

1. **Hero stat counters → grouped, labeled, live-region** *(complements roadmap a11y item)*. Current: 3 bare `.hsn/.hsl` divs, no aria, no `aria-live` though main.js updates them. Change: wrap as a labeled group with `aria-live=polite`. Files: `index.astro:380`. Compat: none. Verify: SR announces "repositories 176".
2. **Journey cards → whole-card link** *(root-causes the roadmap's dead `.ji:focus-visible` CSS)*. Current: `.ji` not focusable; only nested `.ji-link` heading is a link; the visible `.jlink` CTA is `aria-hidden` and does nothing. Change: make the whole card one anchor (title+CTA), drop the CTA's `aria-hidden`. Files: `index.astro:676-687`, `global.css`. Compat: none. Verify: one tab stop per card; CTA announced; whole card clickable.
3. **`theme.js` misleading comment + hardcoded dark** *(pairs with roadmap prefers-color-scheme item)*. The doc-comment at `theme.js:60` **falsely** claims "Respects prefers-color-scheme only on first visit" while `:84` only reads localStorage and hard-defaults dark. Whatever the decision, correct the comment so it doesn't mislead the next implementer. Verify: comment matches behavior.
4. **`releases.astro` missing `SectionJumpNav`** — it defines `cmdkSections` but never renders the component, unlike every other interior page. Add the import + render + a Timeline cross-link in its footer. Files: `releases.astro`. Verify: jump-nav appears, consistent with peers.
5. **Reduced-motion should short-circuit the JS observers, not just override end-state CSS** *(complements roadmap's "gate JS scroll reveal" item)*. The `a534de0` divider now depends on a JS-added `.vis` class; under reduced-motion the CSS is `!important`-overridden but the IntersectionObservers still run and do compositor work the user opted out of. Read `matchMedia('(prefers-reduced-motion: reduce)')` once in `theme.js`/`shared.js`; if true, add final classes and skip registering observers. Verify: no observer callbacks fire on scroll under emulated reduced-motion.
6. **Cache-shape contract types** — `index.astro:15` and `[slug].astro:179` independently re-type `metaMap`; a `fetch-stars` field rename surfaces only as runtime `undefined`. Add `src/data/generated.d.ts` referenced by producer + consumers. Verify: `astro check` fails on a renamed field. *(NF-related; P3.)*

---

## Reliability, Security, Privacy, and Data Safety

- **Wrong public-facing computation (NF-1)** — the streak badge is the single clearest reliability/trust bug; a "evidence over claims" site shipping a wrong number is self-undermining. **P0.**
- **Silent partial-refresh corruption (NF-11)** — non-atomic writes + integrity checks that can't see readme/release staleness. **P2.**
- **Rate-limit self-DoS (NF-18, NF-21)** — a shared/CGNAT IP can exhaust 60/hr and freeze live data for everyone behind it; private-mode users defeat the cache entirely. Conditional requests + in-memory fallback close this. **P2.**
- **Permanent "Loading…" dead-ends (NF-6)** — the language donut never resolves without JS/online/quota; build-time fallback fixes it. **P1.**
- **Terminal `innerHTML` fragility (NF-17)** — safe today, but one careless future command author introduces DOM-XSS into the one free-text-input component. Structural guardrail. **P3.**
- **Supply chain (NF-36)** — unpinned actions hold `pages:write`+`id-token:write`; npm side is audited (`audit:prod`) but Actions aren't. **P3.**
- **Privacy guardrails to preserve:** any NF that adds an embed (NF-4 Spotify) or signal (NF-30 measurement) must stay same-origin / cookieless or be click-to-load — the no-analytics/no-cookies posture is a **product differentiator** (research) and must not be eroded. The roadmap's "brief privacy statement" idea (parked) is worth promoting to a visible footer/`/privacy` value statement.
- **Live-status cross-origin trap (NF-5 note)** — `main.js:287` returns early for cross-origin, so any future custom-domain live app shows a permanently grey dot. Latent, low priority.

## UX, Accessibility, and Trust

- **Onboarding/empty states:** Catalog is exemplary (search/sort/filter/empty-state/freshness). **Live Apps (NF-5)** and **Skills donut (NF-6)** are the thin spots; **Healthcare-IT** has no empty-state (roadmap).
- **Forced-colors / high-contrast (NF-28)** is the biggest a11y gap not in the roadmap — and the only one affecting whether controls are *visible at all* for WHCM users. **P0.**
- **WCAG 2.2 AA target-size (SC 2.5.8)** — icon-only links (footer/social), TagCloud chips, SectionJumpNav, pagination are the likely <24×24 failures; pair with the forced-colors/focus pass. *(New SC, partly testable.)* **P1.**
- **Trust signals:** case-study teasers (NF-3), real contact path (NF-8), and a visible privacy statement convert the site's existing substance into above-fold credibility. The "Beyond Code" broken music promise (NF-4) is an active *anti*-trust signal.
- **Microcopy:** correct the cmdk Beyond-Code description (NF-4) and the theme.js comment (Improvement #3) so the site doesn't describe things it doesn't do.

## Architecture and Maintainability

- **No test runner (NF-12)** and **no CI a11y/perf/visual gates (NF-33/34/35)** are the two structural gaps; everything else is incremental. Adding the data-layer test runner + a PR-triggered CI job (NF-36) is the highest-leverage maintainability investment.
- **Duplicated AST helpers** — `scripts/lib/ts-data-utils.mjs` is canonical but 3 scripts still carry verbatim copies (roadmap R16, confirmed open) — raises the cost of fixing any shared parsing bug.
- **CSS monolith** — 4016-line `global.css`, tokens scattered across 3+ `:root` blocks; `@layer` (roadmap P2) + the forced-colors block (NF-28) + visual-regression net (NF-35) should ship as one coordinated CSS pass.
- **Client JS** — 4 hand-served unbundled scripts; bundling/hashing (P3) is real but lower priority than the rate-limit/fallback fixes.
- **Doc drift (NF / Improvement):** Astro 5→6 migration uncaptured; CLAUDE.md says "Astro 5 / ~1175-line CSS" (actual 4016); no root `CHANGELOG.md` despite v0.17.0 + 4 polish commits; version strings (package.json 0.17.0 vs CLAUDE.md v0.16.0) drift — violates the project's own Definition-of-Done. Reconcile in one pass.

---

## Prioritized Roadmap

> Phased, implementation-ready, deduped against ROADMAP.md. Tackle Phase 0 first — it's small, high-trust, and unblocks the rest.

### Phase 0 — Trust & correctness (do first)
- [ ] **P0 - NF-1 Fix the contribution-streak algorithm**
  - Why: A wrong public number on an "evidence over claims" site.
  - Evidence: `fetch-stars.mjs:191-196` never breaks when today has no push (Verified).
  - Touches: `scripts/fetch-stars.mjs`, hero display.
  - Acceptance: streak counts strictly-consecutive days ending at the most recent push; 0 when latest push >1 day old; documented policy.
  - Verify: `node --test` fixtures (run/gap/no-today/empty) + re-run `npm run fetch-stars`, inspect `_stats.json`.
- [ ] **P0 - NF-28 forced-colors / WHCM support**
  - Why: Controls can become invisible in Windows High Contrast; standards-mandatory post Edge-138.
  - Evidence: zero `forced-colors` rules; focus relies on box-shadow halos (Verified).
  - Touches: `src/styles/global.css`.
  - Acceptance: focus rings + icon buttons visible in forced-colors; decorative layers hidden; no `forced-color-adjust:none`.
  - Verify: DevTools Rendering → emulate `forced-colors: active`; tab through `/`, `/projects/<slug>`, `/search`.
- [ ] **P0 - NF-33 Per-PR axe-core WCAG 2.2 AA gate**
  - Why: a11y declared core quality but nothing prevents regression.
  - Evidence: no axe/pa11y/lighthouse anywhere; quality-gates is cron-only (Verified).
  - Touches: `scripts/audit-a11y.mjs`, `package.json`, `ci.yml`.
  - Acceptance: `npm run a11y:audit` exits non-zero on violations across 6 routes; runs on PRs; artifact uploaded.
  - Verify: introduce a missing-alt image → gate fails.

### Phase 1 — High-value features & resilience
- [ ] **P1 - NF-12 Test runner for data/script logic** — Why: zero coverage on the most intricate pure logic. Touches: `test/`, `package.json`, extract helpers, `quality-gates.yml`. Acceptance: `npm test` green; wired into CI. Verify: break streak fixture → fail.
- [ ] **P1 - NF-2 Render dead `featured` content** — Evidence: only `featured.slice(0,3)` used (Verified). Acceptance: featured strip renders desc/tags, or dataset pruned. Verify: build + visual.
- [ ] **P1 - NF-8 Contact/hire funnel** — Evidence: no contact channel; LinkedIn only in JSON-LD (Verified). Acceptance: working mailto/LinkedIn Connect card + hero pill scroll. Verify: click each.
- [ ] **P1 - NF-6 Build-time language-donut fallback** — Evidence: permanent "Loading…" without JS (`index.astro:536`). Acceptance: baked data renders no-JS/offline. Verify: disable JS.
- [ ] **P1 - NF-27 `/llms.txt`** — Acceptance: valid markdown index from build data, referenced in robots.txt. Verify: curl + format check.
- [ ] **P1 - NF-29 Connect the JSON-LD `@graph`** — Acceptance: Person `@id` referenced by ProfilePage/CollectionPage/BreadcrumbList; lang pages get CollectionPage. Verify: schema.org validator.
- [ ] **P1 - NF-32 `experimental.clientPrerender`** — Acceptance: hover prerenders in Chromium, no other-browser regression. Verify: DevTools Speculative Loads. *(Needs live validation.)*
- [ ] **P1 - NF-22 Migrate `public/` raster art to `<Picture>`** — Acceptance: AVIF+srcset emitted, no CLS, SW paths updated. Verify: build output + Lighthouse. *(L — stage incrementally.)*
- [ ] **P1 - NF-34 Lighthouse CI budget** — Acceptance: a11y≥0.95 + byte budgets asserted, advisory. Verify: job summary shows metrics.
- [ ] **P1 - NF-36 PR build gate** *(SHA pin is P3)* — Acceptance: PRs run check+build before merge. Verify: open a test PR.
- [ ] **P1 - Doc/version reconciliation** — Why: project's own DoD requires matching versions; Astro 5→6 uncaptured (Verified). Touches: `CHANGELOG.md` (new), `CLAUDE.md`, README badge, ROADMAP header. Acceptance: one version everywhere; CLAUDE.md says Astro 6 / real CSS size. Verify: grep version strings.

### Phase 2 — Depth, polish, hardening
- [ ] **P2 - NF-5 Live Apps overview + status a11y**
- [ ] **P2 - NF-4 Resolve music promise** *(decide vs privacy posture)*
- [ ] **P2 - NF-3 Case-study teasers on homepage** *(S — quick win)*
- [ ] **P2 - NF-11 fetch-stars atomicity + integrity checks**
- [ ] **P2 - NF-13 Build-time ranking signal**
- [ ] **P2 - NF-16 Terminal history + Tab completion** *(S — quick win)*
- [ ] **P2 - NF-18 Conditional GitHub requests (ETag)**
- [ ] **P2 - NF-20 SW stale-while-revalidate navigation**
- [ ] **P2 - NF-24 Richer project JSON-LD** *(S)*
- [ ] **P2 - NF-25 `@astrojs/rss` migration**
- [ ] **P2 - NF-26 Pagefind facets**
- [ ] **P2 - NF-30 INP hygiene on cmdk filter**
- [ ] **P2 - NF-35 Playwright visual + a11y-state regression** *(after `@layer` + NF-28)*
- [ ] **P2 - WCAG 2.2 SC 2.5.8 target-size audit** *(S)*
- [ ] **P2 - Improvements #1,#2,#4,#5** (hero-stat labels, journey whole-card link, releases SectionJumpNav, reduced-motion observer gate)

### Phase 3 — Nice-to-have / on-brand polish
- [ ] **P3 - NF-7 Heatmap enrichment** · **NF-9 Releases feed** · **NF-10 JSON Resume export** · **NF-14/15 validator extensions** · **NF-17 Terminal a11y/safe-render** · **NF-19 PWA install prompt** · **NF-21 localStorage resilience** · **NF-23 Shiki highlighting** · **NF-31 accent-color token** · **NF-36 SHA-pin actions** · **Improvement #3** (theme.js comment) · **#6** (cache-shape types) · **security.txt + humans.txt** · **JSON Feed** · **client-local "recently viewed"**

---

## Quick Wins
*(low risk, < ~1 hour each — not already in the roadmap's own Quick-Wins table)*
- NF-3 case-study teaser badge (S) · NF-16 terminal history/Tab (S) · NF-24 richer JSON-LD (S) · NF-27 llms.txt (S) · NF-31 accent-color (S) · NF-7 heatmap streak/peak (S) · Improvement #3 fix the false theme.js comment (XS) · Improvement #4 releases SectionJumpNav (S) · NF-32 one-line clientPrerender flag (S) · security.txt + humans.txt (S) · **Mark robots.txt + divider-perf complete in ROADMAP.md** (XS, housekeeping).

## Larger Bets
- **NF-22 astro:assets `<Picture>` migration (L)** — deletes bespoke sharp pipeline; biggest standards alignment; stage incrementally.
- **CI quality platform (NF-33+34+35+12+36)** — axe gate + Lighthouse budget + visual regression + data tests on a PR-triggered workflow; the structural fix for "all gating is manual."
- **NF-29 connected `@graph` + NF-27 llms.txt + roadmap BreadcrumbList** — ship as one AEO pass.
- **Curated-flagship-case-studies + filterable-archive split (competitive, L)** — the Comeau/Chiang strategy mapped to 150+ repos; partially in place via Greatest Hits + catalog; the gap is *depth* (infra-story write-ups with diagrams + measurable outcomes) — biggest *seniority* signal.
- **`@layer` CSS refactor (roadmap P2) coordinated with NF-28 + NF-35** — restructure the monolith behind a visual-regression net.

## Explicit Non-Goals
- **Re-deriving the v0.18.0 audit** — already done; this doc only verifies/extends it.
- **Any analytics, cookies, or third-party tracking** — rejected (privacy posture is a differentiator). NF-30 measurement is local-only.
- **A hosted backend / runtime services** — preserve the static GitHub-Pages model (roadmap operating principle).
- **A Spotify iframe that sets third-party cookies** — only static cards/click-to-load if NF-4 ships (privacy).
- **Unit-testing the 43KB `main.js` in jsdom** — brittle, low value; cover behavior with Playwright (NF-35) instead.
- **A second a11y/visual tool with overlapping coverage** — axe ⊆ Lighthouse ⊆ pa11y; one blocking engine.
- **Cloning a front-end-flex aesthetic or gimmick easter eggs** — would muddy the sysadmin/healthcare-IT identity.
- **Listing private/internal repos or live infrastructure endpoints** — rejected (security/PHI posture).
- **Full CSS redesign** — incremental `@layer` preferred (roadmap).

## Open Questions
*(only items that block correct prioritization — everything else is answerable from code/sources)*
1. **NF-4 music:** restore a Spotify presence (static cards vs click-to-load embed) **or** remove the promise? Blocks on the privacy-vs-personality tradeoff — owner's call.
2. **NF-1 streak policy:** does "no push today yet" carry yesterday's streak or reset to 0? Both are defensible; pick one and document it.
3. **NF-12 / NF-33 test posture:** CLAUDE.md says "no tests unless requested." This plan treats the **data-layer test runner + a11y gate as the explicit request** — confirm that scope (data/CI gating only, not UI unit tests) is approved before building the harness.
4. **Competitive infra-metrics framing:** does the owner have sanitizable uptime/scale/compliance/credential numbers to back infra-story case studies? (Assumption — required before NF-3/Larger-Bet depth work.)
