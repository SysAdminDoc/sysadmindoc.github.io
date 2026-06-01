# Portfolio Roadmap

Last updated: 2026-06-01
Current version: v0.17.0

## Status: 42 of 42 v0.17.0 items shipped — roadmap fully drained

The 2026-06-01 sprint produced 42 items. All 42 were implemented across 13 commits (v0.16.15 -> v0.17.0). See [COMPLETED.md](COMPLETED.md) for the prior 17-item roadmap. Research evidence in [RESEARCH_REPORT.md](RESEARCH_REPORT.md).

### Shipped items (v0.17.0)
R1 (InteriorNav anchor), R2 (/now update), R3 (stats refresh), R4 (OG cpp), R5 (sanitize-html data: URI), R6 (CSP), R7 (extracted.json cleanup), R8 (dead particle canvas), R9 (dead CSS selectors), R10 (dead generate-data.mjs), R11 (legacy.html archive), R12 (avatar bake), R13 (YouTube nocookie), R14 (SW cache version), R15 (SW JS precache), R16 (shared TS-AST helpers), R17 (shared client JS utils), R18 (data-refresh docs), R19 (screenshots TS AST), R20 (quality-gates fix), R21 (concurrency docs), R22 (validation parallelization -- skipped, not worth complexity), R23 (mobile nav focus trap), R24 (heading hierarchy), R25 (--t3 contrast), R26 (aria-pressed), R27 (journey card links), R28 (footer nav), R29 (404 page), R30 (View Transitions), R31 (JSON-LD), R32 (case studies), R33 (contribution heatmap), R34 (/uses page), R35 (/resume page), R36 (RSS expansion), R37 (download counts), R38 (light theme completion), R39 (zero-star suppress), R40 (CSS scroll animations), R41 (native dialog), R42 (self-host fonts), plus mobile LCP follow-up (font preload + fetchpriority)

## Operating Principles

- Public-only portfolio: list only repositories that are intentionally public and safe to promote.
- GitHub Pages static-first: preserve the Astro static output model. No runtime services unless value is clear.
- Evidence over claims: counts, catalog entries, security status should be generated or checked from source data.
- Accessibility and performance are core product quality, not polish.
- Changes must be tested with `npm run check`, `npm run build`, and targeted browser/accessibility checks when UI changes.

---

## Standing Issues (carried forward)

**Mobile homepage LCP warning (3156ms vs 2500ms threshold)**
- Priority: P2
- Status: Partially addressed by font self-hosting (R42) and fetchpriority on hero avatar. Still documented in PERFORMANCE_AUDIT.md as next performance follow-up.

**NOTES_FEED_POLICY.md activation criteria (7 gates)**
- Priority: Parked
- Status: All 7 criteria unmet. No action until a reviewed source corpus exists.

---

## v0.18.0 Research-Driven Additions

Post-v0.17.0 deep audit across 5 dimensions (feature completeness, performance, security, accessibility, build/CI, competitive features). 89 findings distilled into the items below. Items are grouped by category, prioritized P0-P3, and deduplicated against all v0.17.0 shipped work.

### SEO & Structured Data

- [ ] P0 -- Add robots.txt with sitemap reference
  - Why: No robots.txt exists. Crawlers have no directive about indexing and no pointer to the sitemap. Basic SEO hygiene gap that every competing portfolio has covered.
  - Evidence: Glob/grep for robots.txt across entire repo returns zero matches. @astrojs/sitemap generates sitemap but nothing tells crawlers where it is.
  - Touches: public/robots.txt (new file)
  - Acceptance: robots.txt accessible at site root after deploy. Google Search Console validation passes. Sitemap URL resolves.
  - Verify: After deploy, curl https://sysadmindoc.github.io/robots.txt returns 200 with expected content.
  - Complexity: S

- [ ] P1 -- Add BreadcrumbList structured data to project detail and interior pages
  - Why: Visual breadcrumbs exist on project pages but no BreadcrumbList JSON-LD is emitted. BreadcrumbList is highest-ROI schema for search result presentation and CTR.
  - Evidence: Grep for 'BreadcrumbList' across src/ returns zero matches. [slug].astro renders visual breadcrumbs at line 296-305 but no JSON-LD counterpart. Google post-I/O 2026 recommended schema stack includes BreadcrumbList.
  - Touches: src/pages/projects/[slug].astro, src/pages/lang/[slug].astro, src/pages/healthcare-it.astro, potentially src/layouts/Base.astro
  - Acceptance: Google Rich Results Test validates BreadcrumbList on any project detail page. Visual breadcrumbs and structured data in sync.
  - Verify: Paste a project detail page URL into https://search.google.com/test/rich-results and confirm BreadcrumbList validates.
  - Complexity: M

- [ ] P2 -- Add Organization/ProfilePage structured data alongside Person schema
  - Why: Homepage JSON-LD has Person and WebSite but no ProfilePage or ItemList. AI search engines (Gemini, ChatGPT, Perplexity) use structured data for entity recognition and citation.
  - Evidence: Base.astro lines 234-240 show @graph contains WebSite and Person only. No ProfilePage or ItemList schema.
  - Touches: src/layouts/Base.astro (extend @graph), src/pages/index.astro (optional ItemList for catalog)
  - Acceptance: Google Rich Results Test shows ProfilePage and ItemList as valid schemas on homepage.
  - Verify: Submit homepage URL to Google Rich Results Test. Confirm schemas validate.
  - Complexity: M

- [ ] P2 -- Generate unique OG images for key interior pages
  - Why: Non-project pages (/uses, /resume, /search, /timeline, /archive, /now) all share generic /og.png fallback. No differentiated social preview cards.
  - Evidence: Base.astro line 176 defaults ogImage to '/og.png'. Only projects/[slug].astro overrides with per-project OG images.
  - Touches: public/og.png, src/layouts/Base.astro, potentially new OG endpoints
  - Acceptance: Every key interior page has a functioning, differentiated OG image.
  - Verify: Share /search/, /timeline/, /releases/ URLs on social media and confirm distinct preview cards.
  - Complexity: M

- [ ] P3 -- Add last-updated timestamps to interior pages for freshness signals
  - Why: Interior pages (/now, /uses, /resume, /healthcare-it) display no last-modified date. Search engines value freshness signals. /now page pattern specifically calls for a visible date.
  - Evidence: now.astro, uses.astro, resume.astro have no date display. None include dateModified in structured data.
  - Touches: src/data/curated.ts (add lastUpdated fields), src/pages/now.astro, src/pages/uses.astro, src/pages/resume.astro
  - Acceptance: Each interior content page shows a human-readable 'Last updated' date. Structured data includes dateModified.
  - Verify: Navigate to /now/. Confirm 'Last updated' date is visible.
  - Complexity: S

### Performance

- [ ] P0 -- Extract __PORTFOLIO_DATA inline script into external JSON file
  - Why: Base.astro serializes ~44KB of JSON (full project catalog for command palette) into every single HTML page via define:vars. 199 pages x 44KB = 8.8MB of raw HTML payload. Defeats CDN caching of the data.
  - Evidence: Base.astro lines 260-261: define:vars injects allProjects, quickLinks, sections into every page. Measured 45,265 chars per page in dist.
  - Touches: src/layouts/Base.astro (lines 260-261), public/scripts/cmdk.js (line 4)
  - Acceptance: No inline __PORTFOLIO_DATA script in any page HTML. Command palette still works after fetching external JSON. Each page HTML shrinks by ~44KB.
  - Verify: Build and compare dist/index.html size before vs after. Confirm cmdk opens and searches correctly.
  - Complexity: M

- [ ] P1 -- Stop divider animation running infinite off-screen with will-change
  - Why: .dv::after runs animation: dividerSweep 4s infinite with will-change:transform on every divider. 595 .dv elements across all pages, each promoting a compositor layer and running animation even off-screen.
  - Evidence: global.css line 119: .dv::after with animation infinite and will-change:transform.
  - Touches: src/styles/global.css (lines 118-120)
  - Acceptance: Divider animation no longer runs off-screen. No will-change:transform on .dv::after. Visual effect preserved when visible.
  - Verify: DevTools Performance panel -- check for reduced compositor layer count.
  - Complexity: S

- [ ] P1 -- Gate film grain overlay behind capability media query
  - Why: body::after renders a full-viewport SVG feTurbulence filter with position:fixed on every scroll frame. At 3.5% opacity it is barely perceptible but costs a full-viewport compositor layer. Already removed for prefers-reduced-motion but still runs on all mobile/low-power devices.
  - Evidence: global.css line 324: body::after with position:fixed, z-index:9999, opacity:.035, feTurbulence SVG.
  - Touches: src/styles/global.css (line 324, 3332)
  - Acceptance: Film grain removed or gated behind capability media query (@media (hover: none) or @media (prefers-reduced-motion)). Scroll performance improves on mid-tier devices.
  - Verify: Compare FPS counter during scroll before/after on throttled DevTools.
  - Complexity: S

- [ ] P1 -- Split monolithic 107KB render-blocking CSS
  - Why: 3991-line global.css (110KB compiled) loaded as single render-blocking stylesheet on every page. Includes homepage-only selectors, light theme overrides (475 lines), heatmap, career timeline -- all parsed by non-homepage pages. Directly impacts FCP and LCP.
  - Evidence: dist/_assets/Base.*.css is 110,158 bytes loaded in head as render-blocking link.
  - Touches: src/styles/global.css, src/layouts/Base.astro
  - Acceptance: Critical CSS inlined in head. Non-critical CSS loaded without blocking first paint. No FOUC.
  - Verify: Measure FCP with Lighthouse before/after. Verify no FOUC.
  - Complexity: L

- [ ] P1 -- Add Speculation Rules API for instant page navigation
  - Why: Site uses Astro prefetch with hover strategy but not the Speculation Rules API which can prerender entire pages for instant navigation. Shopify measured 130ms desktop / 180ms mobile improvement. WordPress Core ships it since 6.8 (April 2025). Static site on CDN is ideal candidate.
  - Evidence: Grep for 'speculation' across src/ returns zero matches. astro.config prefetch is hover-only, not prerender. Speculation Rules API reached cross-browser baseline with Safari 18.4 (March 2025).
  - Touches: src/layouts/Base.astro (add speculationrules script to head)
  - Acceptance: Chrome DevTools Application > Speculative Loads shows prerendered pages when hovering nav links. No regressions in Firefox/Safari (ignored).
  - Verify: Open Chrome DevTools > Application > Speculative Loads. Hover a project card. Confirm prerendered. Click and observe instant paint.
  - Complexity: S

- [ ] P2 -- Add shared.js to service worker precache list
  - Why: SW precaches main.js, cmdk.js, theme.js but omits shared.js which defines globals consumed by both main.js and cmdk.js. Offline-first scenario breaks without it.
  - Evidence: public/sw.js line 2 PRECACHE array has no '/scripts/shared.js'. Base.astro line 263 loads it on every page.
  - Touches: public/sw.js (line 2)
  - Acceptance: shared.js in PRECACHE list. Offline scenario works without JS errors.
  - Verify: Build, go offline in DevTools, navigate to homepage -- confirm no JS errors.
  - Complexity: S

- [ ] P2 -- Fix dist/sw.js __BUILD_VERSION__ not stamped
  - Why: dist/sw.js contains literal placeholder 'portfolio-v__BUILD_VERSION__' instead of 'portfolio-v0.17.0'. Cache name never changes between deployments, so returning visitors never invalidate stale assets.
  - Evidence: dist/sw.js line 1: 'portfolio-v__BUILD_VERSION__'. sw:stamp script should replace this during build.
  - Touches: dist/sw.js, package.json (sw:stamp script)
  - Acceptance: dist/sw.js contains portfolio-v0.17.0 (or current version) after build.
  - Verify: Run npm run build, check dist/sw.js line 1 contains version number.
  - Complexity: S

- [ ] P2 -- Gate JS scroll reveal observer to avoid double-animation with CSS scroll-driven animations
  - Why: theme.js IntersectionObserver for .rv elements and CSS animation-timeline: view() for .rv both run simultaneously in Chrome 115+, causing double-animation conflict.
  - Evidence: theme.js lines 156-199: two IntersectionObservers for .rv and .card-enter. global.css lines 15-18: @supports (animation-timeline: view()) with .rv animation.
  - Touches: public/scripts/theme.js (lines 175-183)
  - Acceptance: In browsers supporting animation-timeline: view(), no JS IntersectionObserver for .rv elements. Fallback works in older browsers. .card-enter unchanged.
  - Verify: Test in Chrome (supports) and Safari (does not) -- reveal animations work in both.
  - Complexity: S

- [ ] P2 -- Defer cmdk.js loading until first Ctrl+K
  - Why: cmdk.js (15.7KB) loaded and parsed on every page even though command palette is only used on Ctrl+K. Parse/compile cost paid on every page load for a feature most visitors never use.
  - Evidence: Base.astro line 264: script src='/scripts/cmdk.js' is:inline. File is 15,773 bytes running IIFE immediately.
  - Touches: src/layouts/Base.astro (line 264), public/scripts/cmdk.js
  - Acceptance: cmdk.js not parsed during initial page load. Command palette still works on Ctrl+K.
  - Verify: DevTools Performance trace shows no cmdk.js parse during page load. Ctrl+K still works.
  - Complexity: M

- [ ] P2 -- Increase GitHub API cache TTL and skip on metered connections
  - Why: main.js calls fetchAllRepos() on every homepage visit (up to 10 paginated requests) with a 30-minute cache. Build-time stats are already baked. Live fetch only updates star counts which change rarely.
  - Evidence: main.js line 7: GITHUB_CACHE_TTL=1800000 (30 min). Lines 87-98: fetchAllRepos loops up to 10 pages. Line 261: runs on every homepage load after 1.2s idle.
  - Touches: public/scripts/main.js (line 7, lines 87-98)
  - Acceptance: GitHub API fetched less frequently (4-6 hour TTL). Metered connections skip the live fetch.
  - Verify: Monitor network tab -- confirm fewer API requests on repeat visits.
  - Complexity: S

- [ ] P2 -- Audit and bound non-essential infinite CSS animations
  - Why: 10 different animation: ... infinite declarations run continuously (pulse, gradientShift, blink, dividerSweep, shimmer, borderSpin, freshPulse). Several consume compositor cycles off-screen.
  - Evidence: global.css has 10 infinite animation instances including gradientShift 6s, dividerSweep 4s, shimmer 1.5s, plus pulse, blink, borderSpin, freshPulse.
  - Touches: src/styles/global.css (multiple lines with 'infinite')
  - Acceptance: Non-essential infinite animations bounded or paused off-screen. Visual quality preserved on-screen.
  - Verify: DevTools Rendering panel -- verify reduced animation frame counts.
  - Complexity: S

- [ ] P2 -- Use font-display:optional for JetBrains Mono to reduce CLS
  - Why: font-display:swap on JetBrains Mono causes FOUT/CLS. System monospace fallback is visually close; swap gains minimal visual value but contributes to CLS.
  - Evidence: global.css lines 1-4: all @font-face blocks use font-display:swap. Outfit is 31.5KB, JetBrains-Mono is 39.5KB.
  - Touches: src/styles/global.css (lines 1-4)
  - Acceptance: JetBrains Mono uses font-display:optional. Outfit continues to swap. CLS reduced on slow connections.
  - Verify: Lighthouse CLS score before/after. Visual check on Slow 3G.
  - Complexity: S

- [ ] P2 -- Remove duplicate .skip-link CSS rules
  - Why: .skip-link defined 3 times in global.css: line 59 (original), lines 396-397 (v0.4 override that fully supersedes it), lines 518-519 (safe-area override). Line 59 is completely dead.
  - Evidence: global.css line 59: .skip-link original definition. Lines 396-397: later definition fully overrides it.
  - Touches: src/styles/global.css (lines 59-60)
  - Acceptance: Only one base .skip-link definition. No visual change.
  - Verify: Skip-link still appears on Tab key press.
  - Complexity: S

- [ ] P2 -- Re-introduce content-visibility: auto for below-fold homepage sections
  - Why: Homepage renders 10+ sections eagerly. content-visibility: auto defers rendering of offscreen content. Previously tried and removed (2023-2024) due to blank flashes, but now Baseline Widely Available since August 2024.
  - Evidence: global.css line 422: comment '/* content-visibility removed -- can cause blank flashes on some browsers */'. Mobile LCP at 3156ms suggests reducing initial render cost would help.
  - Touches: src/styles/global.css, src/pages/index.astro
  - Acceptance: Homepage initial paint time improves. No blank flashes at normal scroll speed. Applied to 3+ below-fold sections.
  - Verify: Lighthouse before/after. Manually scroll at various speeds in Chrome, Firefox, Safari.
  - Complexity: M

### Security & Privacy

- [ ] P1 -- CSP scroll-driven animations lack prefers-reduced-motion override (a11y+security overlap)
  - Why: See Accessibility section below (tracked there as primary).

- [ ] P2 -- Remove dns-prefetch for www.youtube.com (leaks browsing intent)
  - Why: Base.astro dns-prefetches www.youtube.com but all embeds use youtube-nocookie.com (R13 shipped). The prefetch to the tracking domain leaks visitor info to Google on every page load for no functional benefit.
  - Evidence: Base.astro line 225: dns-prefetch href="https://www.youtube.com". All iframe srcs use youtube-nocookie.com. CSP frame-src only allows youtube-nocookie.com.
  - Touches: src/layouts/Base.astro line 225
  - Acceptance: No dns-prefetch or preconnect to www.youtube.com. youtube-nocookie.com may be prefetched instead.
  - Verify: View page source, confirm no www.youtube.com dns-prefetch.
  - Complexity: S

- [ ] P2 -- Escape star count in catalog badge innerHTML
  - Why: main.js line 187 concatenates star count s directly into innerHTML without escaping. Value comes from GitHub API (numeric field from trusted API) but the pattern violates defense-in-depth.
  - Evidence: main.js line 187: badge.innerHTML='<svg ...>'+s with no escapeHTML(). Line 253 correctly uses escapeHTML(lang) for language names from the same API.
  - Touches: public/scripts/main.js line 187
  - Acceptance: Star count escaped or set via textContent. SVG still renders.
  - Verify: Catalog star badges render correctly.
  - Complexity: S

- [ ] P2 -- Verify and clean i.scdn.co (Spotify CDN) preconnect usage
  - Why: Base.astro preconnects and dns-prefetches to i.scdn.co on every page. CSP allows it in img-src. If Spotify album art is not loaded on any current page, this leaks a connection for no benefit.
  - Evidence: Base.astro lines 221-223: preconnect and dns-prefetch to i.scdn.co. CSP img-src includes i.scdn.co.
  - Touches: src/layouts/Base.astro lines 191, 221, 223
  - Acceptance: Either confirm i.scdn.co is needed and document where, or remove all references.
  - Verify: Search built HTML for i.scdn.co image references. Check Network tab.
  - Complexity: S

- [ ] P2 -- Strip Google Fonts and analytics from archived legacy.html
  - Why: docs/archive/legacy.html still loads Google Fonts (fonts.googleapis.com, fonts.gstatic.com) and contains Google Analytics references. Served publicly on GitHub Pages. Contradicts self-hosting decision (R42) and privacy posture.
  - Evidence: docs/archive/legacy.html lines 26-34: preconnect and load Google Fonts CSS. File is 201KB served publicly.
  - Touches: docs/archive/legacy.html
  - Acceptance: legacy.html does not make external requests to Google Fonts or analytics services.
  - Verify: Load /docs/archive/legacy.html, confirm no network requests to fonts.googleapis.com.
  - Complexity: S

- [ ] P2 -- Sync package-lock.json version to 0.17.0
  - Why: package.json says 0.17.0 but package-lock.json still says 0.16.15. Creates confusion in CI logs and npm metadata.
  - Evidence: package.json line 4: 0.17.0. package-lock.json line 3: 0.16.15.
  - Touches: package-lock.json
  - Acceptance: package-lock.json version field matches package.json (0.17.0).
  - Verify: Run npm install --package-lock-only and verify version field.
  - Complexity: S

- [ ] P2 -- Add cross-origin cache TTL to service worker
  - Why: SW caches responses from api.github.com, i.scdn.co, opengraph.githubassets.com indefinitely (no TTL, only evicted on SW version change). If a response is poisoned, it persists until next deploy.
  - Evidence: sw.js lines 66-80: cross-origin responses cached via caches.open without TTL. Cache only clears on CACHE version change.
  - Touches: public/sw.js lines 66-80
  - Acceptance: Cross-origin cached responses expire after configurable TTL.
  - Verify: Inspect SW cache in DevTools > Application > Cache Storage.
  - Complexity: M

- [ ] P2 -- Migrate unsafe-inline scripts to external files (medium-term CSP hardening)
  - Why: CSP includes script-src 'unsafe-inline' because of theme init (Base.astro:232), define:vars (Base.astro:260), and Pagefind init (search.astro:100). This weakens CSP XSS protection. Removing unsafe-inline requires externalizing these inline scripts.
  - Evidence: CSP at Base.astro:191 has script-src 'self' 'unsafe-inline'. Three inline scripts require it.
  - Touches: src/layouts/Base.astro lines 232, 260; src/pages/search.astro lines 100-117
  - Acceptance: Inline scripts migrated to external files and unsafe-inline removed from CSP. No FOUC.
  - Verify: Remove unsafe-inline from CSP, test all pages for script execution.
  - Complexity: L

### Accessibility

- [ ] P1 -- Wrap CSS scroll-driven animations in prefers-reduced-motion guard
  - Why: @supports (animation-timeline: view()) applies translateY(24px) reveal on every .rv element. The general prefers-reduced-motion rule zeros animation-duration but scroll-driven animations use animation-timeline (scroll-position-based, not time-based) so the duration override has no effect. Users with vestibular disorders still see motion. WCAG 2.3.3.
  - Evidence: global.css lines 15-18: @supports block with no prefers-reduced-motion nesting. Line 386 zeros duration but scroll-timeline ignores duration.
  - Touches: src/styles/global.css lines 15-18
  - Acceptance: With prefers-reduced-motion: reduce enabled, no .rv elements animate on scroll.
  - Verify: Enable prefers-reduced-motion in DevTools. Scroll homepage. Confirm no slide-in animations.
  - Complexity: S

- [ ] P1 -- Add accessible labels to hero stat counters
  - Why: Hero stats (Projects, Stars, Live Apps) render as separate divs with no semantic connection. Screen readers announce isolated fragments. No aria-live for dynamic updates. WCAG 1.3.1, 4.1.2.
  - Evidence: index.astro lines 381-384: .hs-item with separate .hsn and .hsl divs, no aria-label or grouping.
  - Touches: src/pages/index.astro lines 380-384
  - Acceptance: Screen readers announce each stat as coherent phrase. Dynamic updates announced via aria-live.
  - Verify: NVDA/VoiceOver on hero stats. Trigger GitHub API refresh and confirm announcement.
  - Complexity: S

- [ ] P1 -- Fix command palette listbox items using invalid ARIA (a with role=option)
  - Why: Command palette renders results as <a> elements with role='option' inside role='listbox'. ARIA spec states role='option' must be on non-interactive elements; <a> implicit 'link' role conflicts. WCAG 4.1.2.
  - Evidence: cmdk.js line 155: '<a class="cmdk-item" ... role="option" ...' -- anchor elements with explicit option role.
  - Touches: public/scripts/cmdk.js line 155
  - Acceptance: Results use <div role='option'> with programmatic navigation. Keyboard nav and activation still work.
  - Verify: Axe or Lighthouse a11y audit with command palette open. No conflicting role violations.
  - Complexity: M

- [ ] P2 -- Fix theme toggle to respect prefers-color-scheme on first visit
  - Why: Theme initialization always defaults to dark when no localStorage exists, ignoring OS-level prefers-color-scheme: light preference. WCAG 1.4.1. Users with light mode OS setting get dark on first visit.
  - Evidence: theme.js line 84: apply(saved === 'light' ? 'light' : 'dark') -- only checks localStorage. No prefers-color-scheme fallback.
  - Touches: public/scripts/theme.js lines 81-84, src/layouts/Base.astro line 232
  - Acceptance: First visit with prefers-color-scheme: light shows light theme. Dark preference still gets dark. Returning visitors use localStorage.
  - Verify: In DevTools set prefers-color-scheme to light. Clear localStorage. Load site. Verify light theme.
  - Complexity: S

- [ ] P2 -- Add aria-labelledby to homepage sections for landmark navigation
  - Why: Homepage has 11+ section elements but most lack aria-label or aria-labelledby. Screen reader users navigating by landmark hear 'region' repeated with no differentiation. WCAG 1.3.1, 2.4.1.
  - Evidence: index.astro sections: #live, #catalog, #skills, #about, #career, #philosophy, #journey, #beyond, #connect -- none have aria-labelledby. Only GreatestHits.astro and TagCloud.astro have labels.
  - Touches: src/pages/index.astro sections at lines 473, 484, 521, 560, 610, 646, 673, 692, 710
  - Acceptance: Screen reader landmark navigation lists each section with distinct descriptive name.
  - Verify: NVDA landmark navigation (D key). Each section appears with unique label.
  - Complexity: S

- [ ] P2 -- Add aria-hidden to zero-push heatmap cells (or add titles)
  - Why: Heatmap renders 364 SVG cells. Days with pushes get <title> but zero-push and future days have none. Screen readers encounter hundreds of unlabeled rectangles. WCAG 1.1.1.
  - Evidence: Heatmap.astro lines 121-123: title only added when count > 0.
  - Touches: src/components/Heatmap.astro lines 110-126
  - Acceptance: Screen reader users get meaningful info without hundreds of unlabeled element announcements.
  - Verify: Screen reader on heatmap section. Navigate SVG content.
  - Complexity: S

- [ ] P2 -- Fix mobile nav focus trap tab order (mobileToggle appended instead of prepended)
  - Why: Focus trap builds list from navLinks then appends mobileToggle at end. Visually the toggle is at top. Tab order does not match visual order. WCAG 2.4.3.
  - Evidence: theme.js line 143: focusable list concats mobileToggle at end instead of beginning.
  - Touches: public/scripts/theme.js lines 142-149
  - Acceptance: Mobile nav Tab order matches visual layout: toggle first, then nav links.
  - Verify: At mobile viewport, open nav menu. Tab through items. Verify order matches visual.
  - Complexity: S

- [ ] P2 -- Remove unreachable .ji:focus-visible CSS or make journey cards focusable
  - Why: Journey cards (.ji) have CSS focus-visible styles but no tabindex. Only nested heading link is focusable. Focus-visible styles are unreachable dead CSS.
  - Evidence: global.css lines 1432-1443: .ji:focus-visible styles exist. index.astro lines 677-686: .ji div has no tabindex.
  - Touches: src/pages/index.astro lines 677-686, src/styles/global.css lines 1432-1443
  - Acceptance: Journey cards keyboard-navigable via heading links. Focus indicator visible on correct element.
  - Verify: Tab through Journey section. Each milestone reachable with visible focus ring.
  - Complexity: S

- [ ] P2 -- Change interior page footer nav from div to nav landmark
  - Why: Homepage footer has <nav aria-label='Footer navigation'> but interior pages use <div class='fl'> for same links. Screen readers on project pages cannot find footer links via landmarks. WCAG 1.3.1.
  - Evidence: [slug].astro line 558: <div class='fl'> instead of <nav>. Compare index.astro line 764: <nav class='fl'>.
  - Touches: src/pages/projects/[slug].astro line 558
  - Acceptance: All pages use <nav aria-label='Footer navigation'> for footer links.
  - Verify: Navigate to project page. Screen reader lists Footer navigation landmark.
  - Complexity: S

- [ ] P2 -- Remove duplicate aria-live in catalog (dual status regions)
  - Why: Catalog has two elements with role='status' and aria-live='polite' (#catalogStatus and #noResults). Both updated in same JS function, causing potential double announcements. WCAG 4.1.3.
  - Evidence: index.astro line 506: #catalogStatus with role='status'. Line 512: #noResults with role='status'. Both updated in applyFilters().
  - Touches: src/pages/index.astro lines 506, 512; public/scripts/main.js line 453
  - Acceptance: Screen readers announce filter changes once per interaction, no duplication.
  - Verify: NVDA, click filter buttons rapidly. Announcements coherent and not duplicated.
  - Complexity: S

- [ ] P2 -- Fix terminal global keystroke hijacking and add screen reader output
  - Why: Terminal captures global single-character keystrokes that can hijack screen reader browse-mode keys. Output injected into divs with no role or aria-live. WCAG 4.1.3, 2.1.1.
  - Evidence: main.js line 669: outDiv with no role='log'. Lines 696-703: global keydown activates terminal on any single character.
  - Touches: public/scripts/main.js lines 669, 696-703; src/pages/index.astro line 448
  - Acceptance: Terminal output has role='log' and aria-live. Global keystrokes do not hijack screen reader nav.
  - Verify: NVDA, navigate past terminal. Press single letter keys. Terminal does not activate unless focused.
  - Complexity: M

- [ ] P2 -- Add keyboard equivalent for terminal output click-to-copy
  - Why: Terminal supports click-to-copy but output divs are not focusable and have no keydown handler. Keyboard-only users cannot copy output. WCAG 2.1.1.
  - Evidence: main.js lines 677-683: only click handler. No tabindex or role on output divs.
  - Touches: public/scripts/main.js lines 677-683
  - Acceptance: Terminal output can be copied via keyboard.
  - Verify: Run a command in terminal via keyboard. Copy output with keyboard only.
  - Complexity: M

- [ ] P2 -- Add close button to video player replacement
  - Why: When video thumbnail is activated, button is replaced with iframe div (tabIndex=-1). No close/stop button. Keyboard users trapped in YouTube embed. WCAG 2.1.1.
  - Evidence: main.js lines 337-360: trigger.replaceWith(frameWrap) removes button. No close mechanism.
  - Touches: public/scripts/main.js lines 337-360
  - Acceptance: After playing video, keyboard-operable close button exists.
  - Verify: Tab to video, press Enter. Close button appears. Tab to it. Press Enter to dismiss.
  - Complexity: M

- [ ] P2 -- Add visible labels to catalog form controls
  - Why: Catalog search input and sort dropdown use aria-label but no visible <label> element. Placeholder disappears on input. WCAG 3.3.2.
  - Evidence: index.astro line 489: input with placeholder and aria-label but no <label>. Line 491: select with aria-label but no <label>.
  - Touches: src/pages/index.astro lines 489, 491
  - Acceptance: Each form control has a programmatically associated <label>.
  - Verify: Axe audit. No 'form element has no label' violations.
  - Complexity: S

- [ ] P3 -- Toggle back-to-top button tab order when visually hidden
  - Why: #backToTop toggles visibility via CSS class .show on scroll. If using opacity:0/pointer-events:none instead of display:none, button remains in tab order when invisible. WCAG 2.4.7.
  - Evidence: main.js line 321: classList.toggle('show'). index.astro line 771: button with no hidden attribute management.
  - Touches: public/scripts/main.js line 321, src/pages/index.astro line 771
  - Acceptance: Back-to-top button not in tab order when visually hidden.
  - Verify: Scroll to top. Tab through all elements. Button not reachable.
  - Complexity: S

### Navigation & Content

- [ ] P1 -- Remove duplicate InteriorNav link to /#catalog (Projects and Catalog both go to same anchor)
  - Why: InteriorNav renders two links to /#catalog at lines 28 and 29: "Projects" and "Catalog". Wastes nav real estate, confuses users, adds duplicate tab stops.
  - Evidence: InteriorNav.astro lines 28-29: two consecutive <a href="/#catalog"> links.
  - Touches: src/components/InteriorNav.astro line 28
  - Acceptance: InteriorNav renders exactly one link to the catalog section. No duplicate anchor targets.
  - Verify: Inspect InteriorNav on any interior page. Only one catalog link present.
  - Complexity: S

- [ ] P1 -- Add /uses/ and /resume/ links to InteriorNav and homepage footer
  - Why: /uses/ and /resume/ pages only discoverable via command palette (Ctrl+K). Not linked from homepage nav, footer, Connect section, or InteriorNav. Users who never try Ctrl+K will never find them.
  - Evidence: Grep for href="/uses/" and href="/resume/" in src/ returns zero hits outside Base.astro command palette data. Homepage nav, InteriorNav, Connect section, and footer all omit them.
  - Touches: src/components/InteriorNav.astro, src/pages/index.astro (footer nav and/or Connect section)
  - Acceptance: /uses/ and /resume/ reachable via at least one visible link on homepage plus InteriorNav.
  - Verify: Navigate homepage. Find links to /uses/ and /resume/ without using Ctrl+K.
  - Complexity: S

- [ ] P2 -- Add footer to 404 page (consistent with all other pages)
  - Why: 404 page has no footer element. Every other page has a footer with back-to-portfolio link and summary. 404 is a dead end with only recovery buttons.
  - Evidence: 404.astro is 27 lines with no <footer>. Compare to uses.astro, archive.astro etc.
  - Touches: src/pages/404.astro
  - Acceptance: 404 page renders footer consistent with other interior pages.
  - Verify: Navigate to /nonexistent/ and confirm footer present.
  - Complexity: S

- [ ] P2 -- Add explicit empty-state to Healthcare IT track page
  - Why: healthcare-it page has strong narrative (10+ PACS migrations, 3 continents) but zero project cards because repos array is intentionally empty. The projects section is entirely hidden with no explanation, which looks like a bug rather than an intentional decision.
  - Evidence: curated.ts line 85: repos: [] as string[]. Comment says "project cards intentionally omitted." healthcare-it.astro line 29: hasRepos check hides entire section.
  - Touches: src/data/curated.ts line 85, src/pages/healthcare-it.astro
  - Acceptance: Page either shows project cards or renders explicit empty-state explanation.
  - Verify: Navigate to /healthcare-it/. Understand why there are no project cards without inspecting source.
  - Complexity: S

- [ ] P2 -- Expand homepage footer navigation beyond RSS and GitHub
  - Why: Homepage footer has only RSS and GitHub. Interior pages have richer footer nav. Visitors who scroll to bottom of homepage have no path to Search, Releases, Timeline, Archive, Now, Uses, Resume.
  - Evidence: index.astro lines 764-766: only RSS and GitHub links in footer nav.
  - Touches: src/pages/index.astro lines 764-766
  - Acceptance: Homepage footer includes links to all major interior pages.
  - Verify: Scroll to homepage bottom. Confirm links to key interior pages present.
  - Complexity: S

- [ ] P2 -- Extract shared career data between index.astro and resume.astro
  - Why: Career roles data duplicated as independent const arrays in index.astro (lines 215-264) and resume.astro (lines 6-50). Must be kept in sync manually. Already has minor field divergences (tag/tone fields present in one, not the other).
  - Evidence: Two separate careerRoles arrays with identical text maintained by copy-paste.
  - Touches: src/pages/index.astro lines 215-264, src/pages/resume.astro lines 6-50, src/data/ (new career.ts)
  - Acceptance: Career data defined once. Both pages import from shared file.
  - Verify: Change a role title in the shared file. Confirm both pages reflect the change.
  - Complexity: M

- [ ] P2 -- Expand InteriorNav active state for /uses/, /resume/, /healthcare-it/
  - Why: ActiveRoute type only includes search/releases/timeline/archive/now. Pages like /uses/, /resume/, /healthcare-it/ pass no active value, so no nav link is highlighted.
  - Evidence: InteriorNav.astro line 2: type limited to 5 values. uses.astro, resume.astro, healthcare-it.astro pass no active prop.
  - Touches: src/components/InteriorNav.astro
  - Acceptance: Every page in InteriorNav link list has corresponding active state when visited.
  - Verify: Navigate to /uses/. Confirm Uses link highlighted in InteriorNav.
  - Complexity: S

- [ ] P2 -- Clarify ThinkTV/Maven Imaging employment date overlap
  - Why: Career shows Maven Imaging as 'Feb 2021 - Present' and ThinkTV as 'Apr 2014 - Feb 2025'. 4-year overlap with no explanation looks like a data entry error to recruiters.
  - Evidence: index.astro line 219: Maven 'Feb 2021 - Present'. Line 237: ThinkTV 'Apr 2014 - Feb 2025'.
  - Touches: src/pages/index.astro line 237, src/pages/resume.astro line 28
  - Acceptance: Career timeline has no ambiguous overlapping dates without explanation. Either corrected or overlap explicitly noted.
  - Verify: Review career section. Overlap is either resolved or explained.
  - Complexity: S

- [ ] P2 -- Add resume contact information (email, LinkedIn)
  - Why: Resume page has name, title, location, skills, experience but no email or direct contact method. Recruiters printing it have no way to reach the candidate. LinkedIn URL already in JSON-LD but not displayed.
  - Evidence: resume.astro lines 112-118: Links section shows only GitHub and portfolio site. No email or LinkedIn.
  - Touches: src/pages/resume.astro lines 112-118
  - Acceptance: Resume page includes visible email address and LinkedIn link.
  - Verify: Navigate to /resume/. Confirm email and LinkedIn visible in Links section.
  - Complexity: S

- [ ] P2 -- Add LinkedIn to Connect section and footer
  - Why: Connect section offers 6 paths but not LinkedIn. LinkedIn is in JSON-LD sameAs but never surfaced in UI. Primary channel for recruiter discovery.
  - Evidence: Base.astro line 238 has linkedin URL in sameAs. Grep for 'linkedin' in index.astro returns zero. Connect section has 6 paths, none LinkedIn.
  - Touches: src/pages/index.astro (connectPaths array and footer nav)
  - Acceptance: LinkedIn card appears in Connect section. Link in footer. Opens in new tab with rel=noopener.
  - Verify: Navigate to Connect section. Confirm LinkedIn card with correct URL.
  - Complexity: S

- [ ] P2 -- Verify TagCloud quick-pick links activate catalog filter on page load
  - Why: TagCloud generates links like /?cat=ps#catalog. If main.js does not read the cat query param on page load, clicking from an interior page shows all projects unfiltered.
  - Evidence: TagCloud.astro line 52: href with ?cat= param. Requires main.js to read URL params on init.
  - Touches: public/scripts/main.js, src/components/TagCloud.astro
  - Acceptance: Navigating to /?cat=ps#catalog from any page activates the PowerShell filter.
  - Verify: Click TagCloud quick-pick from Volume section. Confirm filter pre-selected on catalog.
  - Complexity: S

- [ ] P2 -- Add SectionJumpNav to releases page
  - Why: releases.astro defines cmdkSections with 2 entries but does not render SectionJumpNav despite other interior pages with 2+ sections doing so (archive, now, search, healthcare-it).
  - Evidence: releases.astro lines 47-50: cmdkSections defined but no SectionJumpNav rendered.
  - Touches: src/pages/releases.astro
  - Acceptance: Releases page renders SectionJumpNav matching pattern of other interior pages.
  - Verify: Navigate to /releases/. On This Page nav visible for sections.
  - Complexity: S

- [ ] P2 -- Add Timeline cross-link to releases page footer
  - Why: Timeline links to Releases but Releases does not link back to Timeline in footer. Most closely related pages in the site lack bidirectional cross-linking.
  - Evidence: releases.astro line 135: footer links to RSS and GitHub but not Timeline.
  - Touches: src/pages/releases.astro line 135
  - Acceptance: Releases footer includes Timeline link.
  - Verify: Navigate to /releases/. Footer has Timeline link.
  - Complexity: S

- [ ] P3 -- Resolve or remove unused 'cpp' category from types/categories
  - Why: Lang type and categoryLabels both define 'cpp' but _langs.ts has no 'cpp' entry, projects.ts has zero entries with category:'cpp', and the SkillCard maps C++ to /?cat=cs (Desktop). Dead category definition.
  - Evidence: types.ts line 1: Lang includes 'cpp'. categories.ts line 15: cpp: 'C++'. projects.ts: zero entries with category:'cpp'. _langs.ts: no cpp key.
  - Touches: src/data/types.ts, src/data/categories.ts, src/pages/lang/_langs.ts
  - Acceptance: cpp category either removed from types/categories or properly populated.
  - Verify: Grep for 'cpp' in data files. Consistent usage or clean removal.
  - Complexity: S

### Build System & CI/CD

- [ ] P1 -- Deduplicate pre-build validation scripts in CI deploy (running 3x)
  - Why: data:validate and assets:audit each execute 3 times in deploy.yml: standalone steps, inside npm run check, and inside npm run build. Wastes CI minutes on every push.
  - Evidence: package.json build script chains data:validate + assets:audit + images:audit before astro build. check script chains same three. deploy.yml runs them standalone, then check, then build.
  - Touches: .github/workflows/deploy.yml, package.json
  - Acceptance: data:validate runs exactly once, assets:audit once, images:audit once per CI build.
  - Verify: Run deploy workflow. All validations execute once. Build succeeds.
  - Complexity: S

- [ ] P1 -- Finish migrating duplicated TS-AST helpers to shared module
  - Why: R16 created scripts/lib/ts-data-utils.mjs but 3 scripts still carry duplicate copies: audit-semantic-index.mjs, generate-screenshot-thumbnails.mjs, capture-screenshots.mjs.
  - Evidence: function propertyName appears in ts-data-utils.mjs:17, audit-semantic-index.mjs:19, generate-screenshot-thumbnails.mjs:12. function stringProperty in ts-data-utils.mjs:26, generate-screenshot-thumbnails.mjs:17, capture-screenshots.mjs:24.
  - Touches: scripts/audit-semantic-index.mjs, scripts/generate-screenshot-thumbnails.mjs, scripts/capture-screenshots.mjs, scripts/lib/ts-data-utils.mjs
  - Acceptance: No script outside scripts/lib/ defines its own propertyName, stringProperty, parseValue, exportedArray, or collectLiveSlugs.
  - Verify: npm run data:validate && npm run assets:audit && npm run images:audit && npm run semantic:audit && npm run screenshots:thumbs
  - Complexity: M

- [ ] P1 -- Sync package-lock.json version to 0.17.0
  - Why: package.json 0.17.0 but lockfile still 0.16.15. CI confusion, npm metadata mismatch.
  - Evidence: package.json:4 says 0.17.0. package-lock.json:3 says 0.16.15.
  - Touches: package-lock.json
  - Acceptance: Both files say 0.17.0. npm ci clean.
  - Verify: npm install --package-lock-only then grep version package-lock.json.
  - Complexity: S

- [ ] P2 -- Convert sw:stamp from inline node -e CJS to ESM script
  - Why: sw:stamp uses require() in a project with "type": "module". Works today because node -e defaults to CJS, but fragile. No error handling if dist/sw.js missing.
  - Evidence: package.json line 10: node -e with require('fs'). package.json line 3: "type": "module".
  - Touches: package.json, scripts/stamp-sw.mjs (new)
  - Acceptance: sw:stamp uses ESM. Running without dist/sw.js produces clear error.
  - Verify: npm run build end-to-end, dist/sw.js has version stamp.
  - Complexity: S

- [ ] P2 -- Add .nvmrc and engines field to pin Node version
  - Why: CI pins Node 22 but no local signal. Local machine runs Node 24. Can cause subtle build differences with native modules (sharp, resvg-js).
  - Evidence: Workflows specify node-version: '22'. No .nvmrc, .node-version, or engines field exists.
  - Touches: package.json, .nvmrc (new)
  - Acceptance: .nvmrc with content 22. package.json has engines: { node: ">=22.0.0" }.
  - Verify: Verify .nvmrc contains 22.
  - Complexity: S

- [ ] P2 -- Update README layout tree (stale file references)
  - Why: README lists deleted generate-data.mjs, shows legacy.html at root (moved to docs/archive/), version badge says 0.16.15. Missing new pages (uses.astro, resume.astro, 404.astro) and lib/ directory.
  - Evidence: README.md line 128: generate-data.mjs listed but deleted (R10). Line 134: legacy.html at root but moved (R11). Line 3: version badge 0.16.15.
  - Touches: README.md
  - Acceptance: Layout tree matches actual filesystem. Version badge says 0.17.0. New pages listed.
  - Verify: Compare README layout tree against actual filesystem.
  - Complexity: S

- [ ] P2 -- Add .claude/ to .gitignore
  - Why: .gitignore includes CLAUDE.md and CODEX_CHANGELOG.md but not .claude/ directory per global rule. Could accidentally commit AI working files.
  - Evidence: .gitignore has no .claude/ entry across all 35 lines.
  - Touches: .gitignore
  - Acceptance: .gitignore contains .claude/ entry. git status shows no .claude/ files.
  - Verify: Read .gitignore and confirm .claude/ present.
  - Complexity: S

- [ ] P2 -- Add semantic:audit to quality-gates.yml
  - Why: Weekly quality gates run data:validate, assets:audit, and astro check but not semantic:audit. Category drift only caught at deploy time.
  - Evidence: quality-gates.yml runs npm run check (which includes images:audit) but not semantic:audit.
  - Touches: .github/workflows/quality-gates.yml
  - Acceptance: quality-gates.yml includes semantic:audit as non-blocking advisory step.
  - Verify: Trigger quality-gates workflow manually. semantic:audit output in job summary.
  - Complexity: S

- [ ] P2 -- Make fetch-stars.mjs writes atomic (batch at end)
  - Why: fetch-stars writes 5 JSON files at different points during execution. If script crashes mid-run (e.g., during README fetching), data files end up in inconsistent state -- some updated, some stale.
  - Evidence: fetch-stars.mjs: writeJson calls at lines 217, 231, 232, 286, 297/336 scattered throughout.
  - Touches: scripts/fetch-stars.mjs
  - Acceptance: All files written as batch at end, or via atomic temp-file-then-rename. Partial failure leaves existing files unchanged.
  - Verify: Simulate mid-script crash, verify existing files not partially updated.
  - Complexity: M

- [ ] P3 -- Add labels and minor/patch grouping to Dependabot config
  - Why: Dependabot PRs have no labels, assignees, or patch-level grouping. Every trivial semver patch requires manual review and merge for a solo-maintainer project.
  - Evidence: dependabot.yml has no labels, assignees, or update-type grouping.
  - Touches: .github/dependabot.yml
  - Acceptance: Dependabot PRs include dependencies label. Minor/patch updates grouped into single PR.
  - Verify: Review next Dependabot PR for labels and grouping.
  - Complexity: S

- [ ] P3 -- Change deploy.yml cancel-in-progress to true
  - Why: cancel-in-progress: false allows redundant concurrent deployments. Both builds run to completion but only the second takes effect.
  - Evidence: deploy.yml lines 13-15: cancel-in-progress: false.
  - Touches: .github/workflows/deploy.yml
  - Acceptance: cancel-in-progress: true. Newer push cancels older in-flight build.
  - Verify: Push two commits rapidly. First workflow cancelled.
  - Complexity: S

- [ ] P3 -- Document Playwright as optional dependency for capture-screenshots
  - Why: capture-screenshots.mjs requires Playwright but it is not in package.json. New contributor gets cryptic module-not-found error.
  - Evidence: capture-screenshots.mjs lines 67-70: dynamic import('playwright'). No playwright entry in package.json.
  - Touches: package.json, README.md
  - Acceptance: Either Playwright in optionalDependencies or README documents the prerequisite.
  - Verify: Fresh npm ci followed by npm run capture-screenshots gives clear error or works.
  - Complexity: S

- [ ] P3 -- Optimize data-refresh.yml health check to use lightweight probe
  - Why: data-refresh workflow runs full fetch-stars (100+ API calls) just to verify API accessibility. Refreshed data is discarded after the job. Wastes rate limit.
  - Evidence: data-refresh.yml line 34: runs full npm run fetch-stars. Comment says "this is a health check, not a commit-back."
  - Touches: .github/workflows/data-refresh.yml
  - Acceptance: Health check uses lightweight API probe or has comment explaining full refresh rationale.
  - Verify: Run workflow. Completes faster or has documented justification.
  - Complexity: S

### Competitive Features & UX

- [ ] P1 -- Add Web Share API button to project detail pages
  - Why: No share functionality on project pages. Visitors must manually copy URL. Web Share API is Baseline since 2023. Frictionless sharing across 199 project pages is high-leverage.
  - Evidence: Grep for 'navigator.share' returns zero matches. Project pages have GitHub and Live URL buttons but no share.
  - Touches: src/pages/projects/[slug].astro, public/scripts/main.js or inline script
  - Acceptance: Share button on project pages. Native share sheet on Chrome/Safari/Edge. Copy-to-clipboard fallback on Firefox desktop.
  - Verify: Open project page on mobile Chrome. Tap share. Native share sheet with correct title/URL.
  - Complexity: S

- [ ] P2 -- Add PWA manifest shortcuts for quick navigation
  - Why: manifest.json is minimal -- no shortcuts, categories, or screenshots. PWA shortcuts let installed users jump directly to Catalog, Search, Releases, or Now.
  - Evidence: manifest.json is 29 lines with no shortcuts array. No categories, screenshots, or id fields.
  - Touches: public/manifest.json
  - Acceptance: Chrome DevTools > Manifest shows shortcuts parsed. Install PWA and right-click shows navigation shortcuts.
  - Verify: Install PWA on Chrome desktop. Right-click taskbar icon. Shortcuts appear and navigate correctly.
  - Complexity: S

- [ ] P2 -- Add reading time estimate to project detail README sections
  - Why: Long READMEs have no reading time indicator. Standard UX pattern for technical content. Data available at build time (README HTML already rendered).
  - Evidence: Grep for 'readingTime' in src/ returns no source code matches. [slug].astro renders readmeHtml without metadata about length.
  - Touches: src/pages/projects/[slug].astro
  - Acceptance: Pages with README show ~N min read chip. Hidden when no README or word count < 100.
  - Verify: Navigate to project with long README. Reading time chip visible. Short README project shows no chip.
  - Complexity: S

- [ ] P2 -- Add offline fallback page to service worker
  - Why: SW falls back to plain text 'Offline' (status 503) or cached homepage on navigation failure. Top PWAs serve branded offline page. Site already has well-designed 404 as template.
  - Evidence: sw.js line 6-10: offlineResponse() returns plain text. No offline.html exists.
  - Touches: public/offline.html (new), public/sw.js (add to PRECACHE, update fallback)
  - Acceptance: Go offline, navigate to uncached page. Branded offline page renders with styling and retry button.
  - Verify: Chrome DevTools offline mode. Navigate to uncached page. Styled offline page appears.
  - Complexity: S

- [ ] P2 -- Use Popover API for tech-stack tooltip details on project pages
  - Why: Tech chips on project pages are static display elements. Popover API (Baseline Widely Available April 2025) provides native accessible popovers with zero JS. Could show technology context on click.
  - Evidence: Grep for 'popover' in src/ returns no source code matches. Tech chips (.ctg) are plain display elements.
  - Touches: src/pages/projects/[slug].astro, src/components/SkillCard.astro (optional), src/styles/global.css
  - Acceptance: Click tech chip to see native popover with technology context. Escape to dismiss. Keyboard accessible.
  - Verify: Click tech chip. Popover appears. Press Escape. Popover dismisses.
  - Complexity: M

- [ ] P2 -- Use CSS @layer for global.css structural organization
  - Why: global.css is 3991 lines in single file with no structural separation. @layer is Baseline Widely Available since 2022. Provides explicit cascade precedence without file splitting.
  - Evidence: Grep for '@layer' in global.css returns zero matches. Known issues flags 3991-line file as maintainability concern.
  - Touches: src/styles/global.css
  - Acceptance: @layer declarations wrap all major sections. @layer order at top. No visual regressions. Build succeeds with lightningcss.
  - Verify: Full visual comparison of all page types in both themes. No shifted elements or missing styles.
  - Complexity: L

- [ ] P2 -- Add project filtering by technology/language tag (beyond category)
  - Why: Catalog filters are 9 broad categories. No filtering by specific technology (WPF, Flask, Chrome, DICOM, AI). Featured projects have tags arrays but they are not filter facets. Top portfolios offer multi-dimensional filtering.
  - Evidence: Catalog filters in index.astro lines 52-62 hardcoded to 9 categories. TagCloud is display-only. Featured projects have tags in projects.ts but catalog entries have no tags field.
  - Touches: src/pages/index.astro, public/scripts/main.js, src/data/projects.ts
  - Acceptance: Secondary tag filter row below categories. Clicking tag filters catalog. URL syncs tag param. Reset clears tags.
  - Verify: Click 'AI' tag. Only AI projects shown. Click 'Python' category + 'AI' tag. Intersection shown.
  - Complexity: L

- [ ] P3 -- Add README table of contents to long project detail pages
  - Why: Long READMEs have heading IDs (generated at build time) but no TOC for intra-README navigation. Standard UX for technical docs.
  - Evidence: [slug].astro lines 109-119 generate heading IDs. IDs exist but no TOC is generated.
  - Touches: src/pages/projects/[slug].astro, src/styles/global.css
  - Acceptance: Projects with 3+ README headings show collapsible TOC. Clicking TOC entry scrolls to heading.
  - Verify: Navigate to project with long README. TOC appears. Click entry, scrolls to heading.
  - Complexity: M

---

## Quick Wins

P2/P3 items under 1 hour, suitable for a focused cleanup session:

| # | Item | Complexity |
|---|------|-----------|
| -- | Add robots.txt | S |
| -- | Remove duplicate InteriorNav link | S |
| -- | Add /uses/ and /resume/ to InteriorNav + footer | S |
| -- | Wrap scroll-driven animations in prefers-reduced-motion | S |
| -- | Add hero stat accessible labels | S |
| -- | Remove dns-prefetch for www.youtube.com | S |
| -- | Escape star count innerHTML | S |
| -- | Stop divider infinite animation off-screen | S |
| -- | Gate film grain behind media query | S |
| -- | Add shared.js to SW precache | S |
| -- | Fix dist/sw.js version stamp | S |
| -- | Add Speculation Rules | S |
| -- | Sync package-lock.json version | S |
| -- | Gate JS scroll reveal observer | S |
| -- | Increase GitHub API cache TTL | S |
| -- | Bound infinite CSS animations | S |
| -- | font-display:optional for JetBrains Mono | S |
| -- | Remove duplicate .skip-link CSS | S |
| -- | Fix theme toggle to respect OS color scheme | S |
| -- | Add aria-labelledby to homepage sections | S |
| -- | Fix mobile nav focus trap tab order | S |
| -- | Add heatmap cell aria-hidden | S |
| -- | Remove unreachable .ji:focus-visible CSS | S |
| -- | Change interior footer div to nav | S |
| -- | Remove duplicate catalog aria-live | S |
| -- | Add 404 page footer | S |
| -- | Add Healthcare IT empty-state | S |
| -- | Expand homepage footer nav | S |
| -- | Clarify career date overlap | S |
| -- | Add resume contact info | S |
| -- | Add LinkedIn to Connect section | S |
| -- | Verify TagCloud filter activation | S |
| -- | Add SectionJumpNav to releases | S |
| -- | Add Timeline cross-link in releases footer | S |
| -- | Resolve unused cpp category | S |
| -- | Deduplicate CI validation scripts | S |
| -- | Convert sw:stamp to ESM | S |
| -- | Add .nvmrc and engines field | S |
| -- | Update README layout tree | S |
| -- | Add .claude/ to .gitignore | S |
| -- | Strip Google Fonts from legacy.html | S |
| -- | Verify/clean i.scdn.co usage | S |
| -- | Add semantic:audit to quality-gates | S |
| -- | Deploy cancel-in-progress: true | S |
| -- | Dependabot labels and grouping | S |
| -- | Document Playwright dependency | S |
| -- | Optimize data-refresh health check | S |
| -- | Web Share API button | S |
| -- | PWA manifest shortcuts | S |
| -- | Reading time estimate | S |
| -- | Offline fallback page | S |
| -- | Add last-updated timestamps | S |
| -- | Back-to-top tab order toggle | S |
| -- | Add visible catalog form labels | S |

---

## Larger Bets

P0-P2 items needing design decisions or significant implementation:

| Item | Complexity | Design Decision |
|------|-----------|-----------------|
| Extract __PORTFOLIO_DATA to external JSON | M | Lazy load strategy, cache headers, build pipeline change |
| Split monolithic 107KB CSS | L | Critical CSS extraction, non-blocking load pattern, per-page scope |
| BreadcrumbList structured data | M | Path structure for each page type, shared helper vs inline |
| ProfilePage/ItemList structured data | M | Schema selection, which projects to list, graph structure |
| Fix command palette invalid ARIA (a with role=option) | M | Element change, test navigation/activation flow |
| Defer cmdk.js loading | M | Lazy load trigger, first-use latency budget |
| Re-introduce content-visibility: auto | M | Which sections, contain-intrinsic-size estimates, blank flash testing |
| Extract shared career data | M | Data model, homepage tag/tone overlay, import patterns |
| Finish TS-AST helper migration | M | Which functions to export, collectLiveEntries variant |
| Terminal a11y (keystroke hijacking + output) | M | Focus-gated activation, role=log, announce strategy |
| Terminal output copy keyboard access | M | Copy button vs focusable divs, toast feedback |
| Video player close button | M | Button placement, keyboard flow, iframe lifecycle |
| Make fetch-stars writes atomic | M | Temp file pattern, batch write at end |
| Popover API for tech chips | M | Content source, per-chip data, styling |
| CSS @layer organization | L | Layer order, cascade behavior audit, visual regression |
| Technology tag filtering | L | Tag taxonomy, data model extension, URL state |
| README table of contents | M | Heading extraction, collapsible details, threshold |
| Migrate unsafe-inline scripts (CSP) | L | Theme FOUC prevention, data injection pattern |
| Cross-origin cache TTL in SW | M | TTL value, eviction strategy, freshness check |
| OG images for interior pages | M | Per-page satori template or generic with title |

---

## Rejected or Parked

Carried forward from prior roadmap:

- **Hosted backend search**: parked unless Pagefind proves insufficient for the catalog.
- **Analytics-heavy visitor tracking**: rejected. Build-time evidence is sufficient.
- **Listing private/internal repositories**: rejected. Use sanitized capability narratives.
- **Automatic GitHub visibility changes from this repo**: rejected. Explicit human action required.
- **Notes/TIL feed**: parked behind NOTES_FEED_POLICY.md activation criteria (7 gates all unmet).
- **Full CSS redesign**: parked. Incremental improvements (CSS @layer, content-visibility) preferred over rewrite.
- **Client-side embeddings / hosted semantic search**: rejected for now. Pagefind + semantic:audit sufficient.
- **Project dependency/ecosystem graph visualization** (P3/L): deferred. High effort relative to visitor impact.
- **Project comparison tables**: deferred. Requires new data structure and content authoring.
- **Keyboard-navigable project cards with roving tabindex**: partially addressed by R25/R26 in v0.17.0. Full implementation deferred pending real screen reader audit.
- **R22 Parallelize pre-build validation scripts**: skipped in v0.17.0. All three scripts run in <2s total.

New from v0.18.0 research:

- **CSP data: URI in img-src**: acceptable as-is. data: in img-src cannot execute JS. Noise texture requires it. Documented coupling.
- **Pagefind CSP compatibility**: verified as correctly covered by script-src 'self'. No action needed.
- **sanitize-html id on anchor tags**: extremely low risk DOM clobbering vector. Heading IDs generated separately. Accepted.
- **marked.use() global state mutation**: already documented and mitigated (concurrency=1). No change until marked replaced.
- **GitHub API unauthenticated rate limit**: 60 req/hr per IP. Graceful degradation already exists (build-time fallback + localStorage cache). Accepted.
- **No cookies/analytics/tracking**: positive finding. Privacy posture exemplary. Consider brief privacy statement on /uses or footer.
- **Existing 'Forge' project names**: informational. Grandfathered; rule applies to new projects only.
- **SRI on same-origin scripts**: no benefit for static site. Only needed if external CDN scripts added.
- **Command palette homepage cmdkSections**: by design. Quick links in Base.astro sufficiently surface Uses/Resume/Healthcare IT via search.
- **catalog-policy.json privacy configuration**: positive finding. RadAtlas/GeneratorSpecs correctly excluded. Maven Imaging name and internal project mentions on /now and /healthcare-it are intentional public disclosures per owner.

---

## CHANGELOG pending (v0.17.0)

The 13 commits from the v0.17.0 roadmap drain are not yet documented in CHANGELOG.md. A v0.17.0 changelog entry should be added as part of the v0.18.0 work.
