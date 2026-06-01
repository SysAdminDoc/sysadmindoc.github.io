# Portfolio Research Report

Date: 2026-06-01
Repository: SysAdminDoc/sysadmindoc.github.io
Site: https://sysadmindoc.github.io
Version: v0.16.15

---

## Executive Summary

The sysadmindoc.github.io portfolio is a mature, well-engineered static site built on Astro 6 with a TypeScript data layer, serving as the public showcase for 173+ GitHub repositories across 6 languages. A comprehensive 2026-05-17 research sprint shipped all 17 planned roadmap items (security fixes, catalog reconciliation, schema validation, CI gates, proof sections, timeline, archive, Pagefind search, performance audit, image pipeline, JSON feeds, semantic indexing). The site is now in maintenance/incremental mode with no active roadmap items. This deep research pass identified 54 new findings across 4 categories: 6 bugs/broken navigation, 12 performance/code hygiene issues, 11 accessibility/UX gaps, 8 architecture debt items, 9 competitive feature opportunities, and 8 security/data safety observations. The top 10 actionable opportunities are:

1. **P0 Bug**: InteriorNav "Projects" link targets nonexistent `#featured` anchor -- broken navigation on all interior pages
2. **P1 Security**: sanitize-html allows `data:` URI scheme on anchor tags, enabling potential XSS via crafted READMEs
3. **P1 Bug**: /now/ page shows stale date (2026-04-16, 46 days old) undermining "active builder" narrative
4. **P1 Performance**: Dead particle canvas JS (40 lines) executing on every homepage load with no canvas element
5. **P1 Data**: Build-time stats (_stats.json) are 15 days stale -- hero shows outdated repo/star counts
6. **P1 Feature**: No custom 404 page -- visitors hitting bad URLs see default GitHub Pages error with no recovery
7. **P1 Feature**: View Transitions API for app-like page navigation (2 lines of Astro code)
8. **P1 SEO**: Per-project JSON-LD structured data (SoftwareSourceCode schema) for search engine visibility
9. **P1 Architecture**: OG image endpoint missing 'cpp' category accent/label -- data consistency bug
10. **P1 Feature**: Case study deep-dive pages for Greatest Hits projects

---

## Evidence Reviewed

### Local Files Inspected

| ID | File | Purpose |
|----|------|---------|
| L01 | README.md | Public project documentation |
| L02 | CHANGELOG.md | Version history |
| L03 | package.json | Dependencies, scripts, version |
| L04 | ROADMAP.md | Prior planning (17 items, all completed) |
| L05 | PROJECT_CONTEXT.md | Canonical project memory |
| L06 | NOTES_FEED_POLICY.md | Notes feed activation criteria |
| L07 | PERFORMANCE_AUDIT.md | Core Web Vitals baseline |
| L08 | IMAGE_PIPELINE.md | Visual asset pipeline |
| L09 | SEARCH_DECISION.md | Pagefind vs alternatives |
| L10 | SEMANTIC_INDEX_DECISION.md | Local semantic indexing |
| L11 | src/pages/index.astro | Homepage (hero, catalog, skills, etc.) |
| L12 | src/layouts/Base.astro | Shared layout, meta, JSON-LD |
| L13 | src/components/InteriorNav.astro | Interior page navigation |
| L14 | src/components/CatalogEntry.astro | Catalog card component |
| L15 | src/components/LiveCard.astro | Live app card component |
| L16 | src/data/projects.ts | All project data |
| L17 | src/data/curated.ts | Now page, skills, featured data |
| L18 | src/data/types.ts | TypeScript type definitions |
| L19 | src/data/categories.ts | Category labels |
| L20 | src/data/proof.ts | Proof sections data |
| L21 | src/data/archive.ts | Archive decisions data |
| L22 | src/data/catalog-policy.json | Exclusion/privacy policy |
| L23 | src/pages/projects/[slug].astro | Project detail page |
| L24 | src/pages/og/[slug].png.ts | OG image endpoint |
| L25 | src/pages/search.astro | Pagefind search page |
| L26 | src/pages/timeline.astro | Timeline page |
| L27 | src/pages/archive.astro | Archive page |
| L28 | src/pages/now.astro | Now page |
| L29 | src/pages/healthcare-it.astro | Healthcare IT page |
| L30 | src/pages/releases.astro | Releases page |
| L31 | src/pages/rss.xml.ts | RSS feed |
| L32 | src/pages/projects.json.ts | Projects JSON feed |
| L33 | src/pages/releases.json.ts | Releases JSON feed |
| L34 | src/styles/global.css | Full site CSS (3515 lines, 122KB) |
| L35 | public/scripts/main.js | Homepage JS (873 lines, 47KB) |
| L36 | public/scripts/cmdk.js | Command palette JS |
| L37 | public/scripts/theme.js | Theme toggle + mobile nav JS |
| L38 | public/sw.js | Service worker |
| L39 | public/manifest.json | PWA manifest |
| L40 | scripts/fetch-stars.mjs | GitHub data refresh |
| L41 | scripts/validate-project-data.mjs | Data validation |
| L42 | scripts/audit-catalog.mjs | Catalog drift audit |
| L43 | scripts/audit-assets.mjs | Stale asset audit |
| L44 | scripts/audit-image-pipeline.mjs | Image pipeline audit |
| L45 | scripts/audit-performance.mjs | Performance audit |
| L46 | scripts/audit-semantic-index.mjs | Semantic audit |
| L47 | scripts/capture-screenshots.mjs | Screenshot capture |
| L48 | scripts/generate-screenshot-thumbnails.mjs | Thumbnail generation |
| L49 | scripts/generate-data.mjs | Dead migration script |
| L50 | scripts/summarize-generated-data.mjs | Data freshness summary |
| L51 | astro.config.mjs | Astro configuration |
| L52 | .github/workflows/deploy.yml | Deploy workflow |
| L53 | .github/workflows/data-refresh.yml | Data refresh workflow |
| L54 | .github/workflows/quality-gates.yml | Quality gates workflow |
| L55 | .github/dependabot.yml | Dependabot config |
| L56 | .gitignore | Git exclusion rules |
| L57 | legacy.html | Pre-Astro backup (201KB) |
| L58 | _extracted.json | Migration artifact (gitignored) |
| L59 | .ai/research/2026-05-17/*.md | 10 research pass artifacts |

### Git History

- 15 days of commits examined (2026-05-17 to 2026-06-01)
- Most recent: 1d0d6b8 "Add 9 missing repos to portfolio catalog" (2026-06-01)
- Merge: de2bcc5 AI-scrub rewrite integration (2026-05-26)
- Sprint: 15 feature commits on 2026-05-17 (v0.16.1 to v0.16.15)

### External Sources

| ID | Source | Category |
|----|--------|----------|
| E01 | Astro docs (content collections, view transitions, image, endpoints, upgrade) | Framework |
| E02 | Pagefind docs | Search |
| E03 | MiniSearch, Fuse.js, Lunr.js | Search alternatives |
| E04 | Lee Robinson (leerob.com) | Competitor portfolio |
| E05 | Simon Willison (simonwillison.net) | Competitor portfolio |
| E06 | Julia Evans (jvns.ca) | Competitor portfolio |
| E07 | fasterthanli.me | Competitor portfolio |
| E08 | Rauno Freiberg (rauno.me) | Competitor portfolio |
| E09 | Paco Coursey (paco.me) | Competitor portfolio |
| E10 | Maggie Appleton (maggieappleton.com) | Competitor portfolio |
| E11 | Brittany Chiang (brittanychiang.com) | Competitor portfolio |
| E12 | Astrofy, Astro Boilerplate, Astroplate, casraf.dev | Templates |
| E13 | WCAG 2.2, Creative Alive accessibility checklist | Accessibility |
| E14 | CSS-Tricks Interop 2026, Codercops State of CSS 2026 | Modern CSS |
| E15 | web.dev Core Web Vitals, bfcache | Performance |
| E16 | MDN ServiceWorker, scroll-driven animations, Popover API | Web standards |
| E17 | GitHub Pages docs, GitHub API docs | Platform |
| E18 | Josh Comeau portfolio guide, Kent C. Dodds | Portfolio strategy |
| E19 | Wes Bos awesome-uses, uses.tech | /uses convention |
| E20 | Schema.org SoftwareSourceCode, JSON-LD guides | SEO/structured data |
| E21 | Google Rich Results Test | Validation |
| E22 | sanitize-html, marked advisory databases | Security |
| E23 | npm audit, Dependabot, GitHub security features | Supply chain |
| E24 | github-readme-stats, contribution heatmap libraries | Developer signals |
| E25 | lite-youtube-embed, youtube-nocookie.com | Privacy/performance |

---

## Current Product Map

### Site Architecture

```
Astro 6 Static Site Generator
    |
    +-- TypeScript Data Layer (src/data/)
    |       projects.ts (173+ repos: featured[9], liveApps[22], catalog[173+], skills[8])
    |       curated.ts (now page, skills, career roles)
    |       proof.ts (evidence sections for project pages)
    |       archive.ts (retired project decisions)
    |       types.ts, categories.ts, derived.ts
    |       _*.json (gitignored GitHub API caches)
    |
    +-- Pages (src/pages/)
    |       index.astro (homepage: hero, greatest-hits, live, catalog, skills, about, career, etc.)
    |       projects/[slug].astro (182+ detail pages with README rendering)
    |       og/[slug].png.ts (Satori+Resvg social cards)
    |       lang/[slug].astro (language track pages)
    |       search.astro, timeline.astro, archive.astro, now.astro, releases.astro
    |       healthcare-it.astro
    |       projects.json.ts, releases.json.ts, rss.xml.ts
    |
    +-- Client JS (public/scripts/)
    |       main.js (47KB, homepage features)
    |       cmdk.js (command palette)
    |       theme.js (theme toggle, mobile nav, reveals)
    |       sw.js (service worker, portfolio-v10)
    |
    +-- Build Scripts (scripts/)
    |       fetch-stars.mjs, validate-project-data.mjs, audit-catalog.mjs
    |       audit-assets.mjs, audit-image-pipeline.mjs, audit-performance.mjs
    |       audit-semantic-index.mjs, capture-screenshots.mjs
    |       generate-screenshot-thumbnails.mjs, summarize-generated-data.mjs
    |       generate-data.mjs (dead migration script)
    |
    +-- CI/CD (.github/workflows/)
            deploy.yml (push to main -> build -> GitHub Pages)
            data-refresh.yml (daily GitHub API refresh, no deploy)
            quality-gates.yml (weekly audit + catalog drift)
            dependabot.yml (weekly npm + Actions updates)
```

### Target Personas

1. **Recruiter / Hiring Manager** -- Evaluating technical breadth, project quality, and active building cadence. Needs: portfolio overview, project evidence, technology stack, resume/career history.
2. **Peer Developer / Collaborator** -- Looking for tools to use, fork, or contribute to. Needs: searchable catalog, README rendering, download/install paths, live demos.
3. **Search Engine / AI Overview** -- Indexing public project pages for discovery queries. Needs: structured data, clean HTML, RSS feeds, machine-readable indexes.

### Platform Coverage

- **Deployment**: GitHub Pages (static, HTTPS enforced)
- **Build**: GitHub Actions (Node 18+, npm ci)
- **Search**: Pagefind (build-time index, client-side UI)
- **Data**: GitHub REST API (stars, metadata, releases, READMEs)
- **Images**: Satori+Resvg (OG cards), Sharp (thumbnails), Playwright (screenshots)
- **Monitoring**: Dependabot (deps), quality-gates.yml (weekly audit)

---

## Feature Inventory

### Homepage Sections (index.astro)

| Section | ID | Content | Interactive |
|---------|-----|---------|-------------|
| Hero | hero | Name, title, terminal animation, stats, avatar | Typing animation, GitHub API fetch |
| Greatest Hits | greatest-hits | 9 featured projects on bento grid | Hover effects |
| Live Apps | live | 22 live demo cards with thumbnails | Status dots, click-to-navigate |
| Volume | volume | Project count headline | -- |
| Catalog | catalog | 173+ searchable/filterable repo cards | Search, filter, sort, pagination |
| Skills | skills | 8 animated ring charts | Scroll-triggered animation |
| About | about | Bio, signals, terminal profile | Interactive terminal |
| Career | career | 3 role cards with highlights | -- |
| Philosophy | philosophy | Building principles cards | -- |
| Journey | journey | Milestone timeline cards | Click-to-navigate |
| Beyond Code | beyond | 4 YouTube video embeds | Click-to-play |
| Connect | connect | Social links, contact methods | -- |

### Interior Pages

| Page | Route | Data Source |
|------|-------|-------------|
| Project Detail | /projects/[slug]/ | projects.ts + proof.ts + _readmes.json |
| Language Track | /lang/[slug]/ | projects.ts filtered by category |
| Search | /search/ | Pagefind index |
| Releases | /releases/ | _releases.json |
| Timeline | /timeline/ | _releases.json + changelog |
| Archive | /archive/ | archive.ts |
| Now | /now/ | curated.ts |
| Healthcare IT | /healthcare-it/ | curated.ts |
| OG Image | /og/[slug].png | projects.ts |
| Projects JSON | /projects.json | projects.ts + _stars.json + _meta.json |
| Releases JSON | /releases.json | _releases.json |
| RSS | /rss.xml | releases data |

### Build Scripts

| Script | npm Command | Purpose |
|--------|-------------|---------|
| fetch-stars.mjs | fetch-stars | Refresh GitHub API caches |
| validate-project-data.mjs | data:validate | Schema + policy validation |
| audit-catalog.mjs | catalog:audit | Public repo drift detection |
| audit-assets.mjs | assets:audit | Stale screenshot/reference checks |
| audit-image-pipeline.mjs | images:audit | Screenshot/thumbnail/OG validation |
| audit-performance.mjs | audit:perf | Chromium CDP performance audit |
| audit-semantic-index.mjs | semantic:audit | Project similarity advisory |
| capture-screenshots.mjs | capture-screenshots | Playwright screenshot capture |
| generate-screenshot-thumbnails.mjs | screenshots:thumbs | Sharp thumbnail generation |
| summarize-generated-data.mjs | data:summary | Data freshness reporting |
| generate-data.mjs | (none) | Dead migration script |

---

## Competitive Landscape

### Competitor Analysis Summary

| Site | Strengths | Patterns Worth Adopting |
|------|-----------|----------------------|
| **Lee Robinson** (leerob.com) | Clean design, fast performance, view transitions, structured data | View transitions, resume integration |
| **Simon Willison** (simonwillison.net) | Cross-linking tools/TIL/releases, diverse RSS feeds, dated worklogs | Expanded RSS feed content types |
| **Julia Evans** (jvns.ca) | Zine-style learning content, clear technical writing | -- (different format) |
| **fasterthanli.me** | Deep technical posts, project timeline | Timeline already shipped |
| **Rauno Freiberg** (rauno.me) | Micro-interactions, design polish, smooth transitions | Scroll-driven animations |
| **Paco Coursey** (paco.me) | Minimal aesthetic, fast load, thoughtful interactions | -- (different aesthetic) |
| **Maggie Appleton** (maggieappleton.com) | Digital garden, bidirectional linking, topic maps | Project relationship visualization |
| **Brittany Chiang** (brittanychiang.com) | Accessibility-first, smooth transitions, case studies | View transitions, focus management |
| **Josh Comeau** (joshwcomeau.com) | Portfolio guide, case study emphasis | Case study deep-dives |
| **Kent C. Dodds** (kentcdodds.com) | 211 blog posts as project narratives, structured data | JSON-LD per project page |
| **Wes Bos** (uses.tech) | /uses convention, 1000+ examples cataloged | /uses page |

### Cross-Competitor Patterns Not Yet Adopted

1. **View Transitions** -- Used by Lee Robinson, Brittany Chiang, Rauno Freiberg. Astro 6 supports natively with 2 lines of code.
2. **Per-Page Structured Data** -- Used by Lee Robinson, Kent C. Dodds. SoftwareSourceCode schema for project pages.
3. **Case Studies** -- Used by Josh Comeau, Brittany Chiang. Extended narrative for top projects.
4. **Contribution Heatmap** -- Used by most developer portfolios. Visual commit activity signal.
5. **Custom 404 Page** -- Universal best practice. Missing entirely.
6. **/uses Page** -- Wes Bos convention, 1000+ examples. Natural fit for sysadmin portfolio.
7. **Focus Trap on Mobile Nav** -- Brittany Chiang's accessibility-first approach.
8. **CSS Scroll-Driven Animations** -- Baseline 2025, replaces JS IntersectionObserver.

---

## Quality & Friction Findings

### P0 -- Must Fix

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| Q1 | InteriorNav "Projects" link targets `/#featured` but no `id="featured"` exists (renamed to `#greatest-hits`) | Broken navigation | InteriorNav.astro:27 |

### P1 -- Should Fix Soon

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| Q2 | Particle canvas system is 40 lines of dead JS (no canvas element exists) | Unnecessary JS payload | main.js:57-95, global.css:45,369,441 |
| Q3 | /now/ page shows stale date (2026-04-16, 46 days old) | Trust signal | curated.ts:93 |
| Q4 | Build-time stats (_stats.json) are 15 days stale -- hero shows outdated counts | Data freshness | _stats.json, fetch-stars.mjs |
| Q5 | No custom 404 page -- default GitHub Pages 404 with no navigation | Lost visitors | src/pages/ (needs 404.astro) |
| Q6 | main.js GitHub API pagination loops to 10 pages (only 2 needed for 182 repos) | Unnecessary API calls | main.js:138-150 |

### P2 -- Should Fix

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| Q7 | Dead CSS selectors for removed #featured and #manifesto sections | Code hygiene | global.css:358,461,1280 |
| Q8 | Forks/Other filter types defined but never used in data | Unused type variant | types.ts, categories.ts |
| Q9 | CSS file is 122KB/3515 lines with duplicate version blocks | Maintainability | global.css |
| Q10 | Light theme has incomplete styling -- hardcoded dark rgba values leak through | Visual breakage in light mode | global.css (78+ override sites) |
| Q11 | Mobile nav menu has no focus trap | Accessibility | theme.js:97-145 |
| Q12 | Service worker precache list missing CSS, JS, key pages | Partial offline experience | sw.js |
| Q13 | Hero avatar fetches GitHub API on every visit for a static image | Unnecessary API call | main.js:784-803 |
| Q14 | YouTube embeds use tracking domain, not youtube-nocookie.com | Privacy | main.js:397 |
| Q15 | Google Fonts loaded from external CDN -- render-blocking, privacy | Performance/privacy | Base.astro:199-213 |
| Q16 | Catalog shows '--' stars for zero-star repos (visual noise flash) | UX polish | CatalogEntry.astro:98 |
| Q17 | Command palette chord shortcuts undiscoverable | Hidden feature | cmdk.js:29-41, Base.astro:237-240 |

### P3 -- Nice to Have

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| Q18 | Catalog search has no debounce visual indicator | Micro-friction | main.js:551 |
| Q19 | Catalog zero-star '--' flash before API response | Visual noise | CatalogEntry.astro:98 |

---

## Architecture & Technical Findings

### P1 -- Should Fix Soon

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| A1 | OG image endpoint missing 'cpp' category accent and label | Data consistency | og/[slug].png.ts:31-40, categories.ts |

### P2 -- Should Fix

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| A2 | Six build scripts duplicate identical TS-AST helper functions (~200 lines) | Maintainability debt | 6 scripts in scripts/ |
| A3 | Client-side JS duplicates functions across main.js and cmdk.js | Maintainability debt | main.js, cmdk.js |
| A4 | data-refresh workflow fetches data but never persists to repo | CI/CD gap | data-refresh.yml |
| A5 | global.css is 3424 lines in a single file with no structural separation | Maintainability debt | global.css |
| A6 | capture-screenshots.mjs uses fragile regex while all others use TS AST | Fragility risk | capture-screenshots.mjs |
| A7 | Service worker cache key requires manual version bump | Stale content risk | sw.js |
| A8 | Command palette data assembled in 3 separate places | Maintainability debt | Base.astro, validate-project-data.mjs |
| A9 | Quality-gates workflow silently swallows local check failures | CI reliability | quality-gates.yml |

### P3 -- Nice to Have

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| A10 | generate-data.mjs is dead migration script | Dead code | generate-data.mjs |
| A11 | legacy.html (201KB) is unreferenced and committed | Repo hygiene | legacy.html |
| A12 | main.js is 873 lines of densely packed code | Performance/maintainability | main.js |
| A13 | Build pipeline runs 3 serial validation scripts that could run in parallel | Build performance | package.json |
| A14 | Astro build concurrency set to 1 with no documented reason | Build performance | astro.config.mjs |

---

## Security, Privacy & Data Safety

### P1 -- Should Fix Soon

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| S1 | sanitize-html allows data: URI scheme on anchor tags (XSS vector via crafted README) | Medium | projects/[slug].astro:79,133 |
| S2 | _extracted.json contains RadAtlas/GeneratorSpecs references (gitignored but defense-in-depth) | Medium | _extracted.json, catalog-policy.json |

### P2 -- Should Fix

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| S3 | No Content-Security-Policy headers or meta tag | Medium | Base.astro |
| S4 | Service worker caches cross-origin API responses without validation/expiry | Low | sw.js:66-80 |

### P3 / Informational -- No Action Required

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| S5 | Interactive terminal innerHTML uses hardcoded data (safe, noted for future) | Low-Informational | main.js |
| S6 | Structured data exposes city-level location and employer (intentional) | Informational | Base.astro |
| S7 | set:html used with owner-controlled project descriptions (safe currently) | Low-Informational | CatalogEntry.astro, LiveCard.astro, etc. |
| S8 | Resume files properly gitignored | Informational | .gitignore |
| S9 | GitHub token handling follows best practices | Informational | fetch-stars.mjs |
| S10 | Generated data files properly gitignored | Informational | .gitignore |

---

## UX & Accessibility

### P1 -- Should Fix Soon

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| U1 | Mobile nav menu lacks focus trap and focus management on open | Accessibility | theme.js:98-145 |
| U2 | Heading hierarchy broken on homepage (multiple h2 in hero, h3 inside links) | Accessibility | index.astro, GreatestHits.astro |
| U3 | Light theme has many visually broken elements (white-alpha borders invisible) | UX | global.css (pervasive) |

### P2 -- Should Fix

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| U4 | No View Transitions -- every page navigation is a hard reload | Modern web pattern | Base.astro |
| U5 | Catalog filter buttons lack aria-pressed in server-rendered HTML | Accessibility | index.astro:491-495 |
| U6 | Interactive terminal has no keyboard input until animation completes | Accessibility | index.astro, main.js |
| U7 | YouTube embeds lack privacy-enhanced mode and keyboard access after play | UX/Performance | main.js:388-411 |
| U8 | Footer has no nav landmark for links | Accessibility | index.astro:741-760 |
| U9 | Color contrast: --t3 (#707d93) on --bg (#050913) is ~3.8:1 (fails AA) | Accessibility | global.css:531 |
| U10 | Journey cards wrap entire content in anchor tags (long screen reader announcements) | Accessibility | index.astro:668-679 |

### P3 -- Nice to Have

| # | Finding | Severity | Touches |
|---|---------|----------|---------|
| U11 | No container queries (card layout based on viewport, not container width) | Modern web pattern | global.css |
| U12 | No scroll-driven animations (progress bar and reveals are JS-based) | Modern web pattern | main.js, theme.js, global.css |
| U13 | Command palette uses div-based dialog instead of native `<dialog>` | Modern web pattern | Base.astro, cmdk.js |
| U14 | Popover API not used for tooltip-like interactions | Modern web pattern | index.astro |
| U15 | Career cards lack expandable detail pattern on mobile | UX | index.astro |
| U16 | CSS nesting not used (deeply qualified selectors could be simplified) | Modern web pattern | global.css |

---

## Explicit Non-Goals

The following ideas were evaluated and explicitly rejected or parked:

1. **Hosted backend search** -- Parked unless Pagefind proves insufficient. Static search covers 173+ projects, README excerpts, and all rendered pages without runtime infrastructure.
2. **Analytics-heavy visitor tracking** -- Rejected. The portfolio improves with build-time evidence and public GitHub metadata, not visitor surveillance.
3. **Listing private/internal repositories** -- Rejected. Private work is represented as sanitized capability narratives, never repo links.
4. **Automatic public/private visibility changes** -- Rejected. GitHub visibility decisions happen outside this site and require explicit human action.
5. **Full site redesign before trust/correctness work** -- Parked. The 2026-05-17 sprint proved that correctness-first was the right priority order.
6. **Client-side embeddings / hosted semantic search** -- Rejected for now. Pagefind handles discovery; semantic:audit handles maintainability offline.
7. **Notes/TIL feed without reviewed source corpus** -- Parked behind NOTES_FEED_POLICY.md activation criteria. No notes route until 7 criteria are met.
8. **Broad CSS redesign** -- Parked. Incremental improvements (fix dead selectors, improve light theme) are preferred over a rewrite.

---

## Open Questions

1. **Should the light theme toggle be removed or completed?** -- The theme.js code explicitly comments "incomplete light palette" and defaults to dark. A half-broken light theme may undermine trust more than having no light theme at all. Decision: complete it or remove the toggle.

2. **Should the data-refresh workflow commit refreshed data back to the repo?** -- Currently it runs fetch-stars but the data is gitignored and discarded after the job. Either rename it to a health check or add a commit+push step (requires un-gitignoring the data files and changing the data flow model).

3. **Why is Astro build concurrency set to 1?** -- No comment explains this in astro.config.mjs. If it was a workaround for a Satori/Resvg race condition in an older Astro version, removing it would significantly speed up builds for 180+ pages.

4. **Should legacy.html be deleted or moved to an archive directory?** -- The 201KB pre-Astro portfolio is tracked in git but unreferenced. It has historical value but bloats the repo.

5. **What is the intended scope of the light theme?** -- Is it a "complete alternative" or a "best-effort fallback"? This determines whether the pervasive hardcoded rgba values need full theme-variable replacement or just the most visible elements.

6. **Should case studies be added to proof.ts or get their own data structure?** -- The current proof.ts model (problem, buildEvidence, platformSupport, installPath, knownLimitations) is a skeleton. Full case studies need architecture decisions, outcomes, and timelines.

7. **Is the /now/ page actively maintained or is it a stale artifact?** -- The 46-day-old date and outdated project references suggest it may need either regular updates or removal.
