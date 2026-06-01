# Portfolio Research Report (Post-v0.17.0)

Date: 2026-06-01
Repository: SysAdminDoc/sysadmindoc.github.io
Site: https://sysadmindoc.github.io
Version: v0.17.0

---

## Executive Summary

### What Changed (v0.16.15 to v0.17.0)

A massive 42-item roadmap was conceived and fully drained in a single session on 2026-06-01 across 13 commits. The sprint delivered:

- **Security**: CSP meta tag, sanitize-html data: URI restriction, YouTube privacy-enhanced domain, extracted.json cleanup
- **Accessibility**: Focus trap on mobile nav, heading hierarchy fixes, aria-pressed on catalog filters, color contrast fix (--t3), journey card link semantics, footer nav landmark, zero-star suppression
- **Performance**: Self-hosted WOFF2 fonts (eliminating Google Fonts CDN), SW auto-versioning, SW JS precache, CSS scroll-driven animations as progressive enhancement, baked avatar URL, font preload + fetchpriority for LCP
- **Features**: Custom 404 page, View Transitions (ClientRouter), JSON-LD structured data (SoftwareSourceCode), /uses page, /resume page, case studies for top 3 projects, contribution heatmap, native dialog for command palette, expanded RSS feed (full catalog), download count aggregation
- **Code hygiene**: Dead particle canvas removed, dead CSS selectors removed, dead generate-data.mjs removed, legacy.html archived, shared TS-AST helpers extracted, shared client JS utils extracted, screenshots migrated to AST parsing, quality-gates error handling fixed, concurrency documented, data-refresh workflow documented
- **Visual**: Complete light theme palette shipped (was previously incomplete/broken)

### What's Next

A post-sprint deep audit across 5 dimensions (feature completeness, performance, security, accessibility, build/CI, competitive features) surfaced 89 new findings. After deduplication against shipped work and rejection of low-value items, 73 actionable items were added to the v0.18.0 roadmap organized into 6 categories:

1. **SEO & Structured Data** (5 items): robots.txt (P0), BreadcrumbList (P1), ProfilePage/ItemList (P2), per-page OG images (P2), last-updated timestamps (P3)
2. **Performance** (14 items): Extract 44KB inline data (P0), divider animation (P1), film grain gate (P1), CSS splitting (P1), Speculation Rules (P1), plus 9 P2 items
3. **Security & Privacy** (8 items): dns-prefetch leak (P2), innerHTML escaping (P2), legacy.html cleanup (P2), CSP hardening (P2/L), and more
4. **Accessibility** (16 items): Scroll animation reduced-motion (P1), hero stats labels (P1), ARIA listbox fix (P1), plus 13 P2/P3 items
5. **Navigation & Content** (14 items): Duplicate InteriorNav link (P1), orphaned pages (P1), career data extraction (P2), and more
6. **Build System & CI/CD** (12 items): CI deduplication (P1), TS-AST migration completion (P1), lockfile sync (P1), plus 9 P2/P3 items
7. **Competitive Features & UX** (8 items): Web Share API (P1), PWA shortcuts (P2), reading time (P2), offline fallback (P2), and more

The P0 items (robots.txt, extract inline data) are quick wins that should ship immediately. The P1 cluster represents the highest-impact batch for v0.18.0.

---

## Evidence Reviewed

### Local Files Inspected (Post-v0.17.0)

| ID | File | Purpose |
|----|------|---------|
| L01 | README.md | Public documentation (stale: badge 0.16.15, layout tree outdated) |
| L02 | CHANGELOG.md | Version history (missing v0.17.0 entry) |
| L03 | package.json | Dependencies, scripts, version (0.17.0) |
| L04 | package-lock.json | Lockfile (stale: still 0.16.15) |
| L05 | ROADMAP.md | Prior roadmap (42/42 drained) |
| L06 | COMPLETED.md | Prior 17-item roadmap completion record |
| L07 | NOTES_FEED_POLICY.md | Notes feed activation criteria (7 gates, all unmet) |
| L08 | PERFORMANCE_AUDIT.md | Core Web Vitals baseline (LCP 3156ms documented) |
| L09 | src/pages/index.astro | Homepage (hero, greatest-hits, live, catalog, skills, about, career, philosophy, journey, beyond, connect) |
| L10 | src/layouts/Base.astro | Shared layout, meta, JSON-LD, CSP, command palette data |
| L11 | src/components/InteriorNav.astro | Interior page navigation (duplicate link, missing active states) |
| L12 | src/components/CatalogEntry.astro | Catalog card component |
| L13 | src/components/LiveCard.astro | Live app card component |
| L14 | src/components/SkillCard.astro | Skill ring chart card |
| L15 | src/components/GreatestHits.astro | Featured projects bento grid |
| L16 | src/components/TagCloud.astro | Technology tag cloud with quick-pick links |
| L17 | src/components/Heatmap.astro | Contribution heatmap SVG (new in v0.17.0) |
| L18 | src/components/SectionJumpNav.astro | On-this-page section nav |
| L19 | src/data/projects.ts | All project data (182 entries) |
| L20 | src/data/curated.ts | Now page, skills, featured, healthcare IT data |
| L21 | src/data/types.ts | TypeScript type definitions (includes unused 'cpp') |
| L22 | src/data/categories.ts | Category labels |
| L23 | src/data/proof.ts | Proof/case study sections |
| L24 | src/data/archive.ts | Archive decisions |
| L25 | src/data/catalog-policy.json | Exclusion/privacy policy |
| L26 | src/pages/projects/[slug].astro | Project detail page (290+ lines, sanitize-html, marked, JSON-LD) |
| L27 | src/pages/og/[slug].png.ts | OG image endpoint (Satori+Resvg) |
| L28 | src/pages/search.astro | Pagefind search page |
| L29 | src/pages/timeline.astro | Timeline page |
| L30 | src/pages/archive.astro | Archive page |
| L31 | src/pages/now.astro | Now page |
| L32 | src/pages/releases.astro | Releases page (missing SectionJumpNav) |
| L33 | src/pages/healthcare-it.astro | Healthcare IT page (empty repos, no empty-state) |
| L34 | src/pages/uses.astro | Uses page (new in v0.17.0, orphaned nav) |
| L35 | src/pages/resume.astro | Resume page (new in v0.17.0, orphaned nav, no contact info) |
| L36 | src/pages/404.astro | Custom 404 page (new in v0.17.0, no footer) |
| L37 | src/pages/lang/[slug].astro | Language track pages |
| L38 | src/pages/lang/_langs.ts | Language page definitions (no cpp entry) |
| L39 | src/pages/rss.xml.ts | RSS feed (expanded in v0.17.0) |
| L40 | src/pages/projects.json.ts | Projects JSON feed |
| L41 | src/pages/releases.json.ts | Releases JSON feed |
| L42 | src/styles/global.css | Full site CSS (3991 lines, 110KB compiled) |
| L43 | public/scripts/main.js | Homepage JS (873+ lines) |
| L44 | public/scripts/cmdk.js | Command palette JS (native dialog in v0.17.0) |
| L45 | public/scripts/theme.js | Theme toggle, mobile nav, scroll reveals |
| L46 | public/scripts/shared.js | Shared client utilities (new in v0.17.0) |
| L47 | public/sw.js | Service worker (auto-versioned in v0.17.0) |
| L48 | public/manifest.json | PWA manifest (minimal) |
| L49 | scripts/fetch-stars.mjs | GitHub data refresh pipeline |
| L50 | scripts/validate-project-data.mjs | Data validation |
| L51 | scripts/audit-catalog.mjs | Catalog drift audit |
| L52 | scripts/audit-assets.mjs | Stale asset audit |
| L53 | scripts/audit-image-pipeline.mjs | Image pipeline audit |
| L54 | scripts/audit-performance.mjs | Performance audit |
| L55 | scripts/audit-semantic-index.mjs | Semantic audit (still has duplicate helpers) |
| L56 | scripts/capture-screenshots.mjs | Screenshot capture (migrated to AST in v0.17.0, still has duplicates) |
| L57 | scripts/generate-screenshot-thumbnails.mjs | Thumbnail generation (still has duplicate helpers) |
| L58 | scripts/lib/ts-data-utils.mjs | Shared TS-AST helpers (new in v0.17.0, incomplete adoption) |
| L59 | scripts/summarize-generated-data.mjs | Data freshness summary |
| L60 | astro.config.mjs | Astro config (concurrency=1 documented in v0.17.0) |
| L61 | .github/workflows/deploy.yml | Deploy workflow (validation scripts run 3x) |
| L62 | .github/workflows/data-refresh.yml | Data refresh workflow (health check, documented in v0.17.0) |
| L63 | .github/workflows/quality-gates.yml | Quality gates workflow (error handling fixed in v0.17.0) |
| L64 | .github/dependabot.yml | Dependabot config (no labels/grouping) |
| L65 | .gitignore | Git exclusion rules (missing .claude/) |
| L66 | docs/archive/legacy.html | Archived pre-Astro site (still loads Google Fonts) |
| L67 | dist/sw.js | Built service worker (BUILD_VERSION not stamped) |

### Git History

- 13 commits on 2026-06-01 draining the full v0.17.0 roadmap
- Key commits: ccc4412 (consolidate planning), bdbfcff (R1-R5, R14-15, R20, R25-26, R28-31, R39), e066bde (R7-R13, R23-24, R27), 791f4e8 (R18, R32), 7c9e3a2 (R3/R6/R21/R22/R36), abc61e8 (shared helpers, /uses, /resume), 81db56f (R17/R19/R41/R42), 81f43c5 (bump v0.17.0), 0fe26ca (R40 scroll animations), 4fcdb28 (LCP follow-up), 79d336c (R38 light theme), 4ee4c04 (R33 heatmap), 4fe7514 (roadmap drained)

### External Research Sources

| ID | Source | Category |
|----|--------|----------|
| E01 | Astro 6 docs (ClientRouter, prefetch, image, endpoints) | Framework |
| E02 | Pagefind 1.5.2 docs | Search |
| E03 | WCAG 2.2 / ARIA authoring practices / axe-core rules | Accessibility |
| E04 | CSS Interop 2026, State of CSS 2026 | Modern CSS |
| E05 | web.dev Core Web Vitals, Speculation Rules API | Performance |
| E06 | MDN ServiceWorker, scroll-driven animations, Popover API, Web Share API | Web standards |
| E07 | GitHub Pages docs, GitHub REST API docs | Platform |
| E08 | Google Rich Results Test, Schema.org SoftwareSourceCode/BreadcrumbList/ProfilePage | SEO |
| E09 | Shopify Speculation Rules case study (130ms desktop, 180ms mobile) | Performance benchmarks |
| E10 | WordPress 6.8 Speculation Rules integration (April 2025) | Production adoption |
| E11 | Chrome for Developers blog: Speculation Rules API | Performance guidance |
| E12 | Safari 18.4 release notes (March 2025): Speculation Rules baseline | Browser support |
| E13 | Google post-I/O 2026 structured data guidance | SEO strategy |
| E14 | filipmikina.com/blog/github-pages-indexing | GitHub Pages SEO |
| E15 | Lee Robinson (leerob.com), Brittany Chiang (brittanychiang.com) | Competitor portfolios |
| E16 | Josh Comeau portfolio guide, Kent C. Dodds | Portfolio strategy |
| E17 | sanitize-html, marked security advisories | Security |
| E18 | npm audit, Dependabot, GitHub security features | Supply chain |
| E19 | caniuse.com: content-visibility, @layer, popover, speculation rules | Browser support data |

---

## Current Product Map (v0.17.0)

### Site Architecture

```
Astro 6.3.3 Static Site Generator (concurrency=1, documented constraint)
    |
    +-- TypeScript Data Layer (src/data/)
    |       projects.ts (182 repos: featured[9], liveApps[22], catalog[182], skills[8])
    |       curated.ts (now page, skills, career roles, healthcare IT)
    |       proof.ts (case study sections for top 3 projects)
    |       archive.ts (retired project decisions)
    |       types.ts, categories.ts, derived.ts
    |       catalog-policy.json (exclusion/privacy policy)
    |       _*.json (gitignored GitHub API caches)
    |
    +-- Pages (src/pages/)  [12 page types, 199 total pages]
    |       index.astro (homepage: hero, heatmap, greatest-hits, live, catalog,
    |                     skills, about, career, philosophy, journey, beyond, connect)
    |       projects/[slug].astro (182 detail pages with README, sanitize-html, JSON-LD)
    |       og/[slug].png.ts (Satori+Resvg OG social cards per project)
    |       lang/[slug].astro (language track pages: ps, py, web, ext, android, sec, media, cs, guides)
    |       search.astro (Pagefind 1.5.2 static search)
    |       timeline.astro (chronological release stream)
    |       archive.astro (retired project decisions)
    |       now.astro (current focus page)
    |       releases.astro (release overview + timeline)
    |       healthcare-it.astro (healthcare IT track narrative, no project cards)
    |       uses.astro (tools/stack page, NEW in v0.17.0)
    |       resume.astro (printable resume, NEW in v0.17.0)
    |       404.astro (custom error page, NEW in v0.17.0)
    |       projects.json.ts, releases.json.ts, rss.xml.ts (machine-readable feeds)
    |
    +-- Components (src/components/)  [10 components]
    |       InteriorNav.astro, CatalogEntry.astro, LiveCard.astro,
    |       SkillCard.astro, GreatestHits.astro, TagCloud.astro,
    |       Heatmap.astro (NEW), SectionJumpNav.astro, Base.astro (layout)
    |
    +-- Client JS (public/scripts/)  [4 files, ~1502 lines]
    |       main.js (homepage: catalog, stats, terminal, video, GitHub API)
    |       cmdk.js (command palette via native <dialog>, NEW in v0.17.0)
    |       theme.js (theme toggle, mobile nav + focus trap, scroll reveals)
    |       shared.js (escapeHTML, isTextEntryTarget, prefersReducedMotion, NEW in v0.17.0)
    |       sw.js (service worker, auto-versioned cache, JS precache, NEW in v0.17.0)
    |
    +-- Styles (src/styles/)
    |       global.css (3991 lines, 110KB compiled, includes light theme, NEW in v0.17.0)
    |       Self-hosted WOFF2 fonts: Outfit, JetBrains Mono (NEW in v0.17.0)
    |
    +-- Build Scripts (scripts/)  [10 scripts + 1 shared module]
    |       fetch-stars.mjs (GitHub API: stars, meta, releases, READMEs)
    |       validate-project-data.mjs, audit-catalog.mjs, audit-assets.mjs,
    |       audit-image-pipeline.mjs, audit-performance.mjs, audit-semantic-index.mjs
    |       capture-screenshots.mjs (Playwright, migrated to AST in v0.17.0)
    |       generate-screenshot-thumbnails.mjs (Sharp)
    |       summarize-generated-data.mjs
    |       lib/ts-data-utils.mjs (shared AST helpers, NEW in v0.17.0, partial adoption)
    |
    +-- CI/CD (.github/workflows/)
    |       deploy.yml (push to main -> build -> GitHub Pages, Node 22)
    |       data-refresh.yml (daily health check, documented purpose in v0.17.0)
    |       quality-gates.yml (weekly audit + catalog drift, error handling fixed in v0.17.0)
    |       dependabot.yml (weekly npm + Actions updates)
    |
    +-- Docs
            docs/archive/legacy.html (pre-Astro backup, still loads Google Fonts)
            PERFORMANCE_AUDIT.md, IMAGE_PIPELINE.md, SEARCH_DECISION.md,
            SEMANTIC_INDEX_DECISION.md, NOTES_FEED_POLICY.md
```

### Key v0.17.0 Additions

| Feature | Implementation | Notes |
|---------|---------------|-------|
| View Transitions | ClientRouter in Base.astro | Cross-document transitions via Astro 6 |
| Contribution Heatmap | Heatmap.astro SVG component | 52-week grid from GitHub push data |
| Complete Light Theme | 475 lines in global.css | All card borders, sections, chrome visible |
| CSS Scroll Animations | animation-timeline: view() | Progressive enhancement with JS fallback |
| Self-hosted Fonts | WOFF2 in public/fonts/ | Outfit + JetBrains Mono, preloaded |
| Native Dialog | dialog element in Base.astro | Replaced div-based command palette |
| Custom 404 | 404.astro | Branded error page with recovery links |
| /uses Page | uses.astro | Tools, stack, hardware |
| /resume Page | resume.astro | Printable career view with @media print |
| Case Studies | proof.ts extended | Top 3 Greatest Hits with narrative depth |
| JSON-LD | SoftwareSourceCode schema | Per-project structured data |
| Focus Trap | theme.js | Mobile nav keyboard accessibility |
| CSP | Base.astro meta tag | script-src, img-src, frame-src, font-src |
| RSS Expansion | rss.xml.ts | Full catalog (182 entries) by push date |
| Shared Utils | shared.js + lib/ts-data-utils.mjs | Client and build-time code deduplication |

### Target Personas

1. **Recruiter / Hiring Manager** -- Evaluating technical breadth, project quality, and active building cadence. Needs: portfolio overview, project evidence, technology stack, resume/career history. Now served by /resume/, case studies, heatmap.
2. **Peer Developer / Collaborator** -- Looking for tools to use, fork, or contribute to. Needs: searchable catalog, README rendering, download/install paths, live demos. Now served by Pagefind search, expanded RSS, download counts.
3. **Search Engine / AI Overview** -- Indexing public project pages for discovery queries. Needs: structured data, clean HTML, RSS feeds, machine-readable indexes. Now served by JSON-LD, expanded RSS, JSON feeds. Gaps: no robots.txt, no BreadcrumbList, no ProfilePage schema.

### Platform Coverage

- **Deployment**: GitHub Pages (static, HTTPS enforced)
- **Build**: GitHub Actions (Node 22, npm ci)
- **Search**: Pagefind 1.5.2 (build-time index, client-side UI)
- **Data**: GitHub REST API (stars, metadata, releases, READMEs)
- **Images**: Satori 0.26.0 + Resvg-js 2.6.2 (OG cards), Sharp 0.34.5 (thumbnails), Playwright (screenshots)
- **CSS**: lightningcss 1.32.0 (minification)
- **Monitoring**: Dependabot (deps), quality-gates.yml (weekly audit)

---

## Feature Inventory (Complete, v0.17.0)

### Homepage Sections (index.astro)

| Section | ID | Content | Interactive |
|---------|-----|---------|-------------|
| Hero | hero | Name, title, terminal animation, stats, avatar | Typing animation, GitHub API fetch, baked avatar |
| Heatmap | (below hero) | 52-week contribution grid | Hover tooltips, theme-aware colors |
| Greatest Hits | greatest-hits | 9 featured projects on bento grid | Hover effects, case study links |
| Live Apps | live | 22 live demo cards with thumbnails | Status dots, click-to-navigate |
| Volume | volume | Project count headline + tag cloud | Tag cloud quick-pick links to catalog filters |
| Catalog | catalog | 182 searchable/filterable repo cards | Search, filter, sort, pagination, aria-pressed |
| Skills | skills | 8 animated ring charts | Scroll-triggered animation (CSS + JS fallback) |
| About | about | Bio, signals, terminal profile | Interactive terminal |
| Career | career | 3 role cards with highlights | -- |
| Philosophy | philosophy | Building principles cards | -- |
| Journey | journey | Milestone timeline cards | Click-to-navigate (semantic links) |
| Beyond Code | beyond | 4 YouTube video embeds (nocookie) | Click-to-play |
| Connect | connect | Social links, contact methods | -- |

### Interior Pages

| Page | Route | Data Source | New in v0.17.0 |
|------|-------|-------------|----------------|
| Project Detail | /projects/[slug]/ | projects.ts + proof.ts + _readmes.json + JSON-LD | JSON-LD |
| Language Track | /lang/[slug]/ | projects.ts filtered by category | -- |
| Search | /search/ | Pagefind index | -- |
| Releases | /releases/ | _releases.json | -- |
| Timeline | /timeline/ | _releases.json + changelog | -- |
| Archive | /archive/ | archive.ts | -- |
| Now | /now/ | curated.ts | Content updated |
| Healthcare IT | /healthcare-it/ | curated.ts | -- |
| Uses | /uses/ | Inline data | Yes |
| Resume | /resume/ | Inline careerRoles | Yes |
| 404 | /404/ | Static | Yes |
| OG Image | /og/[slug].png | projects.ts | -- |
| Projects JSON | /projects.json | projects.ts + _stars.json + _meta.json | -- |
| Releases JSON | /releases.json | _releases.json | -- |
| RSS | /rss.xml | Full catalog (182 entries) | Expanded |

### Build Scripts

| Script | npm Command | Purpose | Uses shared lib |
|--------|-------------|---------|-----------------|
| fetch-stars.mjs | fetch-stars | Refresh GitHub API caches | No |
| validate-project-data.mjs | data:validate | Schema + policy validation | Yes |
| audit-catalog.mjs | catalog:audit | Public repo drift detection | Yes |
| audit-assets.mjs | assets:audit | Stale screenshot/reference checks | Yes |
| audit-image-pipeline.mjs | images:audit | Screenshot/thumbnail/OG validation | Yes |
| audit-performance.mjs | audit:perf | Chromium CDP performance audit | No |
| audit-semantic-index.mjs | semantic:audit | Project similarity advisory | No (has duplicates) |
| capture-screenshots.mjs | capture-screenshots | Playwright screenshot capture | No (has duplicates) |
| generate-screenshot-thumbnails.mjs | screenshots:thumbs | Sharp thumbnail generation | No (has duplicates) |
| summarize-generated-data.mjs | data:summary | Data freshness reporting | No |

### CI/CD Workflows

| Workflow | Trigger | Actions | Issues Found |
|----------|---------|---------|--------------|
| deploy.yml | Push to main | Build + deploy to GitHub Pages | Validation scripts run 3x; cancel-in-progress: false |
| data-refresh.yml | Daily cron | Full fetch-stars (health check only) | Burns 100+ API calls for a health check |
| quality-gates.yml | Weekly cron | data:validate + assets:audit + astro check | Missing semantic:audit |
| dependabot.yml | Weekly | npm + Actions updates | No labels, no grouping |

---

## Competitive Landscape (Updated)

### Competitor Analysis Summary

| Site | Strengths | Adopted in v0.17.0 | Still Missing |
|------|-----------|---------------------|---------------|
| **Lee Robinson** (leerob.com) | Clean design, view transitions, structured data | View Transitions, JSON-LD | BreadcrumbList, ProfilePage |
| **Simon Willison** (simonwillison.net) | Cross-linking, diverse RSS, dated worklogs | Expanded RSS | robots.txt, last-updated timestamps |
| **Rauno Freiberg** (rauno.me) | Micro-interactions, design polish | CSS scroll animations | Speculation Rules |
| **Brittany Chiang** (brittanychiang.com) | Accessibility-first, smooth transitions, case studies | Focus trap, view transitions, case studies | Web Share, reading time |
| **Josh Comeau** (joshwcomeau.com) | Case study emphasis, portfolio guide | Case studies for top 3 | README table of contents |
| **Kent C. Dodds** (kentcdodds.com) | Structured data, blog as narrative | JSON-LD per project | BreadcrumbList, ProfilePage |
| **Wes Bos** (uses.tech) | /uses convention | /uses page | -- (achieved) |

### Cross-Competitor Patterns Not Yet Adopted (Post-v0.17.0)

1. **robots.txt** -- Universal best practice. Missing entirely. Every competitor has one.
2. **BreadcrumbList structured data** -- Used by Lee Robinson, Kent C. Dodds. Highest-ROI schema after SoftwareSourceCode.
3. **Speculation Rules API** -- Shipped by WordPress Core (6.8), Shopify. Measured 130ms+ improvement.
4. **Web Share API** -- Baseline since 2023. Native share on mobile. Missing on all 199 project pages.
5. **PWA manifest shortcuts** -- Standard for installed web apps. Current manifest is minimal.
6. **Reading time estimates** -- Universal on technical blogs and docs. Missing from README sections.
7. **Offline fallback page** -- Standard PWA pattern. Currently returns plain text "Offline".
8. **CSS @layer** -- Baseline Widely Available since 2022. Would organize 3991-line CSS file.
9. **content-visibility: auto** -- Baseline Widely Available since 2024. Previously tried and removed. Ready for retry.
10. **Popover API** -- Baseline Widely Available since April 2025. Natural fit for tech-stack chip details.

---

## Quality & Friction Findings

### P0 -- Must Fix

| Finding | Category | Touches |
|---------|----------|---------|
| No robots.txt -- crawlers have no indexing directive or sitemap pointer | SEO | public/robots.txt (new) |
| 44KB __PORTFOLIO_DATA inline script duplicated across all 199 pages | Performance | Base.astro, cmdk.js |

### P1 -- Should Fix Soon

| Finding | Category | Touches |
|---------|----------|---------|
| InteriorNav has duplicate link to /#catalog (Projects + Catalog) | Navigation | InteriorNav.astro |
| /uses/ and /resume/ orphaned -- no visible links from homepage or InteriorNav | Navigation | InteriorNav.astro, index.astro |
| 595 divider elements run infinite animation with will-change:transform | Performance | global.css |
| Film grain overlay renders full-viewport SVG filter every frame | Performance | global.css |
| 107KB render-blocking CSS loaded as single monolithic stylesheet | Performance | global.css, Base.astro |
| Speculation Rules API not used (instant prerender available) | Performance | Base.astro |
| CSS scroll-driven animations lack prefers-reduced-motion override | Accessibility | global.css |
| Hero stat counters have no accessible labels | Accessibility | index.astro |
| Command palette listbox items use invalid ARIA (a with role=option) | Accessibility | cmdk.js |
| BreadcrumbList structured data missing from project/interior pages | SEO | [slug].astro, lang/[slug].astro |
| Pre-build validation scripts run 3x in CI deploy | CI/CD | deploy.yml, package.json |
| TS-AST helper duplication in 3 scripts despite shared module | Code quality | 3 scripts + lib |
| package-lock.json version stuck at 0.16.15 | Version consistency | package-lock.json |
| No Web Share API button on project pages | Engagement | [slug].astro |

### P2 -- Should Fix

| Finding | Category | Touches |
|---------|----------|---------|
| 404 page has no footer | Consistency | 404.astro |
| Healthcare IT page has no empty-state explanation | Content | healthcare-it.astro |
| Homepage footer nav minimal (only RSS + GitHub) | Navigation | index.astro |
| Career data duplicated between index.astro and resume.astro | Architecture | index.astro, resume.astro |
| InteriorNav missing active states for /uses/, /resume/, /healthcare-it/ | Navigation | InteriorNav.astro |
| ThinkTV/Maven employment dates overlap without explanation | Content | index.astro, resume.astro |
| Resume page has no email or contact information | Content | resume.astro |
| OG images use generic /og.png fallback for all non-project pages | SEO | Base.astro |
| TagCloud quick-pick links may not activate filters on page load | Feature | main.js, TagCloud.astro |
| Releases page missing SectionJumpNav despite having 2+ sections | Consistency | releases.astro |
| Releases page footer missing Timeline cross-link | Navigation | releases.astro |
| dns-prefetch for www.youtube.com leaks browsing intent | Privacy | Base.astro |
| Star count injected into innerHTML without escaping | XSS defense | main.js |
| i.scdn.co preconnect may be unused | Privacy | Base.astro |
| legacy.html still loads Google Fonts | Privacy | docs/archive/legacy.html |
| Service worker missing shared.js in precache | Performance | sw.js |
| dist/sw.js BUILD_VERSION not stamped | Performance | dist/sw.js |
| JS scroll reveal observer double-fires with CSS scroll animations | Performance | theme.js |
| cmdk.js loaded and parsed on every page (only used on Ctrl+K) | Performance | Base.astro, cmdk.js |
| GitHub API cache TTL too aggressive (30 min) | Performance | main.js |
| 10 infinite CSS animations running simultaneously | Performance | global.css |
| font-display:swap on JetBrains Mono causes CLS | Performance | global.css |
| Duplicate .skip-link CSS rules (3 blocks for same selector) | Code quality | global.css |
| content-visibility: auto previously removed but now Baseline | Performance | global.css |
| Theme toggle ignores OS prefers-color-scheme on first visit | Accessibility | theme.js, Base.astro |
| Homepage sections lack aria-labelledby for landmark navigation | Accessibility | index.astro |
| Heatmap zero-push cells lack accessible text | Accessibility | Heatmap.astro |
| Mobile nav focus trap has wrong tab order | Accessibility | theme.js |
| Journey card focus-visible CSS unreachable (no tabindex) | Accessibility | global.css, index.astro |
| Interior page footer nav uses div instead of nav landmark | Accessibility | [slug].astro |
| Dual aria-live regions in catalog cause double announcements | Accessibility | index.astro, main.js |
| Terminal hijacks global keystrokes, lacks screen reader output | Accessibility | main.js, index.astro |
| Terminal click-to-copy has no keyboard equivalent | Accessibility | main.js |
| Video play button replacement removes keyboard controls | Accessibility | main.js |
| Catalog form controls lack visible labels | Accessibility | index.astro |
| LinkedIn missing from Connect section and footer | Engagement | index.astro |
| sw:stamp uses require() in ESM project | Build robustness | package.json |
| No .nvmrc or engines field for Node version | Developer experience | package.json |
| README layout tree references deleted/moved files | Documentation | README.md |
| .gitignore missing .claude/ | Git hygiene | .gitignore |
| quality-gates.yml missing semantic:audit | CI/CD coverage | quality-gates.yml |
| fetch-stars.mjs non-atomic writes | Build robustness | fetch-stars.mjs |
| ProfilePage/ItemList structured data missing | SEO | Base.astro |
| PWA manifest has no shortcuts | PWA | manifest.json |
| Reading time estimates missing from README sections | UX | [slug].astro |
| Offline fallback page is plain text | PWA | sw.js |
| Popover API not used for tech chips | Modern web | [slug].astro |
| CSS @layer not used for 3991-line file organization | Maintainability | global.css |
| Cross-origin cache has no TTL in service worker | Cache | sw.js |
| CSP has unsafe-inline (required but limits protection) | Security | Base.astro |

### P3 -- Nice to Have

| Finding | Category | Touches |
|---------|----------|---------|
| Command palette homepage cmdkSections omits Uses/Resume/Healthcare IT | Feature | index.astro |
| Unused 'cpp' category in types/categories | Dead code | types.ts, categories.ts, _langs.ts |
| Back-to-top button may be in tab order when hidden | Accessibility | main.js, index.astro |
| Dependabot config lacks labels and auto-merge grouping | CI/CD | dependabot.yml |
| deploy.yml cancel-in-progress is false | CI/CD | deploy.yml |
| Playwright undeclared optional dependency | Developer experience | package.json |
| data-refresh.yml runs full API call suite for health check | CI/CD | data-refresh.yml |
| Last-updated timestamps missing from interior pages | SEO | curated.ts, pages |
| README table of contents for long project pages | UX | [slug].astro |
| No SRI on same-origin scripts (accepted, no benefit) | Security | -- |
| GitHub API unauthenticated rate limit (accepted, graceful degradation) | Availability | -- |

---

## Architecture & Technical Findings

### Data Flow

```
GitHub REST API
    |
    v
fetch-stars.mjs (GITHUB_TOKEN optional, runs in CI daily + at build)
    |
    +-> _stars.json (repo -> star count)
    +-> _stats.json (totalRepos, totalStars, etc.)
    +-> _meta.json (repo -> language, description, topics, pushed_at)
    +-> _releases.json (repo -> releases with assets + download counts)
    +-> _readmes.json (repo -> rendered README HTML)
    |
    v
Astro build (reads TS data + JSON caches)
    |
    +-> 199 static HTML pages
    +-> Per-project OG images (Satori + Resvg)
    +-> Pagefind search index
    +-> RSS + JSON feeds
    +-> Sitemap (via @astrojs/sitemap)
    |
    v
GitHub Pages CDN (static delivery, HTTPS)
```

### Known Constraints

1. **marked.use() global state** -- mutates singleton renderer per [slug].astro call. Prevents Astro build concurrency > 1. Documented in v0.17.0, no fix without replacing marked.
2. **44KB inline data per page** -- __PORTFOLIO_DATA inlined via define:vars for command palette. P0 extraction target for v0.18.0.
3. **Single CSS file** -- 3991 lines in global.css. Maintainability concern but Astro's CSS bundling makes splitting non-trivial. CSS @layer proposed as structural solution without file splitting.
4. **No build-time breadcrumbs** -- Visual breadcrumbs rendered but not in JSON-LD structured data.

### Code Quality Metrics

| Metric | Value | Trend |
|--------|-------|-------|
| Build warnings | 0 | Stable (was 0 pre-sprint) |
| Build errors | 0 | Stable |
| astro check hints | 0 | Stable |
| TODO/FIXME/HACK in source | 0 | Cleaned in v0.17.0 |
| CSS lines (global.css) | 3,991 | Up from 3,515 (light theme added) |
| JS lines (client) | ~1,502 | Down from ~1,600 (shared utils extraction) |
| Build scripts | 10 + 1 lib | Up from 11 (added lib/ts-data-utils.mjs) |
| TS-AST helper duplication | 3 scripts | Down from 6 (partial migration) |
| Pages generated | 199 | Up from ~190 (added uses, resume, 404) |
| Catalog entries | 182 | Up from 173 |

---

## Security, Privacy & Data Safety

### Positive Findings

- **Zero cookies, zero analytics, zero tracking pixels** -- exemplary privacy posture for a portfolio. All state uses localStorage only.
- **sanitize-html configuration is thorough** -- proper allowlist, transform guards, checkbox hardening, data: URI restricted to img only (v0.17.0).
- **CSP meta tag in place** (v0.17.0) -- covers script-src, img-src, frame-src, font-src, connect-src, object-src.
- **YouTube nocookie domain** (v0.17.0) -- all embeds use privacy-enhanced mode.
- **catalog-policy.json** correctly excludes sensitive repos (RadAtlas, GeneratorSpecs).
- **HTTPS enforced** via GitHub Pages. All external resources use HTTPS.

### Remaining Concerns

| Priority | Finding | Risk Level |
|----------|---------|------------|
| P2 | dns-prefetch for www.youtube.com contradicts R13 privacy decision | Low (DNS only, no cookies) |
| P2 | Star count innerHTML not escaped (defense-in-depth, not exploitable) | Very Low |
| P2 | legacy.html loads Google Fonts (privacy leak on archived page) | Low |
| P2 | Cross-origin SW cache has no TTL (theoretical cache poisoning via HTTPS MITM) | Very Low |
| P2 | CSP requires unsafe-inline for 3 inline scripts | Medium (weakens XSS protection) |
| P2 | i.scdn.co preconnect may be unused (unnecessary third-party connection) | Low |
| P3 | Sanitize-html allows 'id' on anchor tags (theoretical DOM clobbering) | Very Low |

### Data Exposure Review

- **Intentional public disclosures**: Maven Imaging employer name on /now/ and /healthcare-it/, NexRay/XRayRoomPlanner/Conduit project names in curated.ts and proof.ts. These are in developer-authored data files and are confirmed intentional.
- **Private repos excluded**: No private repo names appear in catalog, featured lists, or rendered pages. catalog-policy.json privacyReviewRequired list is enforced by validate-project-data.mjs.
- **City-level location**: Dayton, Ohio disclosed in JSON-LD Person schema. Intentional.

---

## UX & Accessibility

### v0.17.0 Accessibility Wins

- Focus trap on mobile nav (R23)
- Heading hierarchy fixed (R24)
- Color contrast fixed: --t3 meets WCAG AA (R25)
- aria-pressed on catalog filter buttons (R26)
- Journey card link semantics fixed (R27)
- Footer nav landmark added (R28)

### Remaining Gaps (16 items in v0.18.0 roadmap)

**P1 (3 items)**:
1. CSS scroll-driven animations bypass prefers-reduced-motion (scroll-timeline ignores animation-duration zeroing)
2. Hero stat counters have no semantic grouping or aria-live for dynamic updates
3. Command palette results use <a role="option"> (invalid ARIA, conflicting roles)

**P2 (12 items)**:
- Theme toggle ignores OS color scheme preference
- Homepage sections lack aria-labelledby
- Heatmap zero-push cells unlabeled
- Mobile nav focus trap tab order mismatch
- Journey card focus-visible CSS unreachable
- Interior footer uses div not nav
- Dual catalog aria-live regions
- Terminal keystroke hijacking
- Terminal copy not keyboard-accessible
- Video player loses keyboard controls on play
- Catalog form controls lack visible labels
- InteriorNav active states incomplete

**P3 (1 item)**:
- Back-to-top button tab order when hidden

---

## Explicit Non-Goals

The following ideas were evaluated and explicitly rejected or parked:

1. **Hosted backend search** -- Parked unless Pagefind proves insufficient. Static search covers 182 projects across all pages.
2. **Analytics-heavy visitor tracking** -- Rejected. Build-time evidence and public GitHub metadata are sufficient.
3. **Listing private/internal repositories** -- Rejected. Private work represented as sanitized capability narratives.
4. **Automatic GitHub visibility changes** -- Rejected. Requires explicit human action.
5. **Notes/TIL feed** -- Parked behind NOTES_FEED_POLICY.md activation criteria (7 gates, all unmet).
6. **Full CSS redesign** -- Parked. CSS @layer and content-visibility are incremental paths.
7. **Client-side embeddings / hosted semantic search** -- Rejected. Pagefind + semantic:audit sufficient.
8. **Project dependency/ecosystem graph** -- Deferred. High effort relative to visitor impact.
9. **Project comparison tables** -- Deferred. Requires new data structure and content authoring.
10. **Full roving tabindex on project cards** -- Deferred pending real screen reader audit. Partially addressed by R25/R26.
11. **SRI on same-origin scripts** -- No benefit for static site on GitHub Pages.
12. **GitHub API authentication for client-side requests** -- Not practical (would expose token). Graceful degradation already handles rate limits.
13. **Existing 'Forge' project names** -- Grandfathered. Rule applies to new projects only.
14. **CSP data: in img-src removal** -- Required for noise texture SVG. Cannot execute JS via img-src.

---

## Open Questions

1. **Should the 44KB inline data extraction (P0) use lazy fetch or eager fetch with cache?** -- Lazy (on first Ctrl+K) minimizes initial load but adds ~100ms latency on first palette open. Eager (fetch after idle) pre-populates but adds a network request. Decision: lazy fetch with localStorage cache for instant subsequent opens.

2. **Is the CSS file split worth the Astro build complexity?** -- Astro bundles all imported CSS into a single file by default. Manual splitting requires per-page `<link>` tags or Astro scoped styles. CSS @layer provides structural organization without splitting. Decision: try @layer first, defer file splitting.

3. **Should the career data extraction create a new src/data/career.ts or extend curated.ts?** -- career.ts is cleaner (single responsibility). curated.ts already has now, skills, and healthcare IT data. Decision: new file, consistent with projects.ts/proof.ts/archive.ts pattern.

4. **How aggressive should Speculation Rules prerendering be?** -- Options: (a) moderate eagerness on all same-origin links, (b) eager on nav links + moderate on project cards, (c) conservative (hover-only). Decision: moderate eagerness on same-origin navigation links, conservative on project cards (there are 182 of them).

5. **Should content-visibility: auto be retried?** -- Previously removed due to blank flashes. Now Baseline Widely Available (Aug 2024). Chrome, Firefox 124+, Safari 17.4+. Decision: retry with contain-intrinsic-size estimates, test across browsers, constrain to furthest-below-fold sections first.

6. **Should the CHANGELOG.md v0.17.0 entry be retroactively added?** -- 13 commits are not documented in CHANGELOG. Decision: yes, add as part of v0.18.0 housekeeping.
