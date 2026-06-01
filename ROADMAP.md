# Portfolio Roadmap

Last updated: 2026-06-01
Current version: v0.16.15
Previous roadmap (2026-05-17, 17 items) fully completed -- see [COMPLETED.md](COMPLETED.md).

This roadmap consolidates all active work from the 2026-06-01 deep research pass. Prior completed items and stale references are archived in COMPLETED.md. Research evidence and methodology are in [RESEARCH_REPORT.md](RESEARCH_REPORT.md). Archived 2026-05-17 research artifacts are in [docs/archive/research-2026-05-17/](docs/archive/research-2026-05-17/).

## Operating Principles

- Public-only portfolio: list only repositories that are intentionally public and safe to promote.
- GitHub Pages static-first: preserve the Astro static output model. No runtime services unless value is clear.
- Evidence over claims: counts, catalog entries, security status should be generated or checked from source data.
- Accessibility and performance are core product quality, not polish.
- Changes must be tested with `npm run check`, `npm run build`, and targeted browser/accessibility checks when UI changes.

---

## Existing Planned Work

### Active from prior roadmap / project context

**Mobile homepage LCP warning (3156ms vs 2500ms threshold)**
- Priority: P2
- Status: Documented in PERFORMANCE_AUDIT.md as next performance follow-up
- Root cause: Google Fonts loading chain (2-3 round trips to external CDN), hero image API fetch, and 47KB main.js parse time
- Related research findings: Self-host fonts, bake avatar at build time, code-split main.js

**NOTES_FEED_POLICY.md activation criteria (7 gates)**
- Priority: Parked
- Status: All 7 criteria unmet. No action until a reviewed source corpus exists.

---

## Research-Driven Additions

### Bugs and Broken Behavior

#### R1. Fix InteriorNav "Projects" link targeting nonexistent anchor
- **Priority**: P0
- **Why**: The InteriorNav component (used on all interior pages) links to `/#featured` but no element with `id="featured"` exists. The section was renamed to `#greatest-hits`. Clicking "Projects" from any interior page scrolls to the top of the homepage instead of the correct section.
- **Evidence**: InteriorNav.astro line 27: `<a href="/#featured">Projects</a>`. Grep for `id="featured"` returns zero matches.
- **Touches**: src/components/InteriorNav.astro (line 27)
- **Acceptance**: Link updated to `/#greatest-hits` (or `/#catalog`). Clicking from any interior page scrolls to the correct section.
- **Verify**: Navigate to /search/, click "Projects" in InteriorNav, confirm scroll target.
- **Complexity**: S

#### R2. Update /now/ page stale date and content
- **Priority**: P1
- **Why**: The /now/ page is a key trust signal. The `now.updated` field is hardcoded to 2026-04-16 (46 days stale). Building and thinking sections reference outdated projects, not the recent v0.16.1-v0.16.15 sprint or 9-repo addition.
- **Evidence**: src/data/curated.ts line 93: `updated: '2026-04-16'`. Git log shows commits on 2026-06-01, 2026-05-26, 2026-05-17.
- **Touches**: src/data/curated.ts (now.updated, now.building, now.thinking)
- **Acceptance**: Date updated to current. Building/thinking arrays reflect current work.
- **Verify**: Navigate to /now/, confirm date and content are current.
- **Complexity**: S

#### ~~R3. Refresh build-time stats (_stats.json)~~ DONE
- Ran `npm run fetch-stars` on 2026-06-01. Updated to 176 repos, 268 stars. READMEs preserved from cache (full refresh needs GITHUB_TOKEN).

#### R4. Fix OG image endpoint missing 'cpp' category
- **Priority**: P1
- **Why**: The OG image generator defines its own accentByCat and labelByCat maps that omit 'cpp', even though 'cpp' is a valid Lang. C++ project OG images would show raw 'CPP' instead of 'C++' and fall to a default accent color.
- **Evidence**: src/data/types.ts defines `'cpp'`. src/data/categories.ts: `cpp: 'C++'`. src/pages/og/[slug].png.ts lines 31-40 omit 'cpp'. Fallback at line 78 is `category.toUpperCase()`.
- **Touches**: src/pages/og/[slug].png.ts, src/data/categories.ts
- **Acceptance**: 'cpp' present in both maps. Ideally import categoryLabels from categories.ts instead of a parallel map.
- **Verify**: Build, inspect OG image for a C++ project slug.
- **Complexity**: S

### Security

#### R5. Restrict data: URI scheme to img tags only in sanitize-html
- **Priority**: P1
- **Why**: The sanitize-html config allows `data:` in allowedSchemes globally, meaning `data:text/html` payloads can pass through anchor tags. A malicious README could inject XSS via `<a href="data:text/html,...">`. The `data:` scheme is needed for inline images (base64 badges) but should not apply to anchors.
- **Evidence**: src/pages/projects/[slug].astro lines 79, 133: `allowedSchemes: ['http', 'https', 'mailto', 'data']`. transformTags for 'a' does not filter data: hrefs.
- **Touches**: src/pages/projects/[slug].astro
- **Acceptance**: data: scheme restricted to img tags only. data:text/html anchors are stripped. data: inline images in READMEs still render.
- **Verify**: Create test markdown with `<a href="data:text/html,...">` and confirm it is stripped. Confirm base64 img src still works.
- **Complexity**: S

#### ~~R6. Add Content-Security-Policy meta tag~~ DONE
- Added CSP meta tag to Base.astro after theme-color meta. Covers self, fonts, GitHub API/assets, Spotify CDN, YouTube nocookie, and data: URIs for img-src only.

#### R7. Clean _extracted.json of medical-imaging references
- **Priority**: P1
- **Why**: Defense-in-depth. _extracted.json is gitignored but contains RadAtlas and GeneratorSpecs entries. If accidentally committed, it would leak the association.
- **Evidence**: _extracted.json lines 16-17 list RadAtlas and GeneratorSpecs. catalog-policy.json lists both under privacyReviewRequired.
- **Touches**: _extracted.json
- **Acceptance**: RadAtlas and GeneratorSpecs removed from _extracted.json. Verify git history has no committed version with these entries.
- **Verify**: Grep entire repo for RadAtlas -- should appear only in catalog-policy.json and gitignored generated caches.
- **Complexity**: S

### Performance and Code Hygiene

#### R8. Remove dead particle canvas system
- **Priority**: P1
- **Why**: 40 lines of JS reference `document.getElementById('particles')` but no canvas element exists. Contributes ~1.6KB to the JS bundle and has matching dead CSS rules.
- **Evidence**: main.js lines 58-59: canvas lookup bails immediately. Grep for `particles` or `canvas` in .astro files returns zero.
- **Touches**: public/scripts/main.js (lines 57-95), src/styles/global.css (lines 45, 369, 441)
- **Acceptance**: Particle IIFE and #particles CSS rules removed. No functional regression.
- **Verify**: Homepage loads without errors. Build passes.
- **Complexity**: S

#### R9. Remove dead CSS selectors (#featured, #manifesto)
- **Priority**: P2
- **Why**: global.css has rules targeting `#featured` and `#manifesto` sections that no longer exist in any template.
- **Evidence**: global.css line 358: `#featured::before{...}`. Lines 461, 1280: `#manifesto` references. Grep for these IDs in .astro files returns zero.
- **Touches**: src/styles/global.css (lines 358, 461, 1280)
- **Acceptance**: Dead selectors removed. No visual regression.
- **Verify**: Build, visual check of homepage.
- **Complexity**: S

#### R10. Remove dead generate-data.mjs migration script
- **Priority**: P3
- **Why**: Not referenced by any npm script, workflow, or build chain. Reads from gitignored _extracted.json. Dead code confusing future contributors.
- **Evidence**: No npm script references it. Header comment in projects.ts says "edit this file directly."
- **Touches**: scripts/generate-data.mjs, src/data/projects.ts (header comment)
- **Acceptance**: Script deleted. Auto-generated comment in projects.ts updated.
- **Verify**: `npm run build` passes without it.
- **Complexity**: S

#### R11. Handle legacy.html (201KB unreferenced file)
- **Priority**: P3
- **Why**: Tracked in git but unreferenced by any source file. Original pre-Astro portfolio. Bloats repo.
- **Evidence**: Grep for 'legacy.html' returns only a match in gitignored _readmes.json.
- **Touches**: legacy.html, .gitignore
- **Acceptance**: Either deleted or gitignored. If historical value desired, move to docs/archive/.
- **Verify**: `git status` clean after change.
- **Complexity**: S

#### R12. Bake hero avatar URL at build time
- **Priority**: P2
- **Why**: A separate GitHub API call fetches the user profile just for avatar_url on every homepage visit (30-min cache). The URL is stable for months. The fetch-stars.mjs script already calls the GitHub API.
- **Evidence**: main.js line 793 fetches `https://api.github.com/users/SysAdminDoc`. Index.astro line 372 uses a 1x1 transparent GIF placeholder.
- **Touches**: scripts/fetch-stars.mjs, src/pages/index.astro, public/scripts/main.js (lines 784-803)
- **Acceptance**: Avatar URL in _stats.json, baked into img src at build time. Runtime avatar fetch IIFE removed.
- **Verify**: Build, check hero avatar renders without API call.
- **Complexity**: S

#### R13. Switch YouTube embeds to privacy-enhanced domain
- **Priority**: P2
- **Why**: youtube.com/embed sends cookies and tracking. youtube-nocookie.com reduces tracking. Thumbnails from img.youtube.com reveal visitor IP before any click.
- **Evidence**: main.js line 397: `youtube.com/embed`. index.astro line 691: `img.youtube.com` thumbnails.
- **Touches**: public/scripts/main.js (playVideo, line 397), src/pages/index.astro (line 691)
- **Acceptance**: Embed domain changed to youtube-nocookie.com. Thumbnails optionally self-hosted or loaded lazily.
- **Verify**: Click a video in Beyond Code section, confirm youtube-nocookie.com in iframe src.
- **Complexity**: S

#### R14. Auto-generate service worker cache version from build
- **Priority**: P2
- **Why**: Hardcoded 'portfolio-v10' cache key requires manual bump on every deploy. If forgotten, returning visitors get stale pages.
- **Evidence**: sw.js line 1: `const CACHE = 'portfolio-v10'`. No build step modifies this.
- **Touches**: public/sw.js, possibly astro.config.mjs or package.json build script
- **Acceptance**: Cache version tied to build identifier (package version, git SHA, or build timestamp). Every deploy guarantees cache invalidation.
- **Verify**: Deploy twice with different content, confirm SW update toast appears for returning visitor.
- **Complexity**: S

#### R15. Add service worker precache for JS files
- **Priority**: P2
- **Why**: SW precaches only 7 files (/, manifest, icons, RSS). Missing main.js, cmdk.js, theme.js. Cold offline PWA visit would show broken scripts.
- **Evidence**: sw.js line 2 precache array. Three JS files not listed.
- **Touches**: public/sw.js (PRECACHE array)
- **Acceptance**: JS files added to precache. Key interior pages optionally added. Cross-origin API cache gets max-age check.
- **Verify**: Install PWA, go offline, verify homepage renders with scripts.
- **Complexity**: M

### Architecture Debt

#### R16. Extract shared TS-AST helpers into scripts/lib/ts-data-utils.mjs
- **Priority**: P2
- **Why**: propertyName(), stringProperty(), collectLiveSlugs() are copy-pasted across 6 build scripts (~200 lines of duplication). Copies can drift.
- **Evidence**: Identical implementations in validate-project-data.mjs, audit-assets.mjs, audit-image-pipeline.mjs, audit-catalog.mjs, generate-screenshot-thumbnails.mjs, audit-semantic-index.mjs.
- **Touches**: All 6 scripts + new scripts/lib/ts-data-utils.mjs
- **Acceptance**: All helpers extracted and imported. All scripts pass their npm commands.
- **Verify**: `npm run data:validate && npm run assets:audit && npm run images:audit && npm run catalog:audit && npm run semantic:audit && npm run screenshots:thumbs`
- **Complexity**: S

#### R17. Extract shared client-side utilities between main.js and cmdk.js
- **Priority**: P2
- **Why**: isTextEntryTarget(), _escMap/escape, prefersReducedMotion duplicated between both files.
- **Evidence**: main.js:38 and cmdk.js:60 (isTextEntryTarget). main.js:3-4 and cmdk.js:42-45 (_escMap). main.js:26 and cmdk.js:20-21 (prefersReducedMotion).
- **Touches**: public/scripts/main.js, public/scripts/cmdk.js
- **Acceptance**: Shared helpers defined once and reused. Both files work on all pages.
- **Verify**: Homepage and project detail page function correctly.
- **Complexity**: S

#### R18. Fix data-refresh workflow to persist or clarify purpose
- **Priority**: P2
- **Why**: Workflow runs `npm run fetch-stars` daily but files are gitignored and never committed back. Refreshed data is discarded. Effectively a no-op health check.
- **Evidence**: data-refresh.yml has no git commit/push step. .gitignore excludes all _*.json.
- **Touches**: .github/workflows/data-refresh.yml
- **Acceptance**: Either add commit+push step (requires un-gitignoring data files) or rename/document as health check.
- **Verify**: Run workflow manually, confirm intent matches behavior.
- **Complexity**: M

#### R19. Migrate capture-screenshots.mjs from regex to TS AST parsing
- **Priority**: P2
- **Why**: Only script using regex to parse projects.ts. All others use TypeScript compiler API. Regex will break if code formatting changes.
- **Evidence**: capture-screenshots.mjs lines 22-31 use regex. Compare with audit-assets.mjs, audit-catalog.mjs using ts.createSourceFile().
- **Touches**: scripts/capture-screenshots.mjs
- **Acceptance**: Uses TS AST (or imports shared collectLiveSlugs helper from R16). Regex parsing removed.
- **Verify**: `npm run capture-screenshots` still works (requires Playwright).
- **Complexity**: S

#### R20. Fix quality-gates workflow swallowing check failures
- **Priority**: P2
- **Why**: The 'Run local quality checks' step pipes to tee without `set -eo pipefail`. Failures in data:validate, assets:audit, or astro check can be silently ignored. Final gate only checks prod_audit and catalog_audit.
- **Evidence**: quality-gates.yml lines 53-56 lack error trapping. Lines 127-129 only check two exit codes.
- **Touches**: .github/workflows/quality-gates.yml
- **Acceptance**: Step uses `set -eo pipefail`. All check outcomes considered in final gate.
- **Verify**: Introduce a deliberate data:validate failure and confirm workflow fails.
- **Complexity**: S

#### ~~R21. Investigate and document Astro build concurrency setting~~ DONE
- `marked.use()` in `[slug].astro` mutates global state -- parallel builds race. Added inline comment explaining the constraint. concurrency:1 stays.

#### ~~R22. Parallelize pre-build validation scripts~~ SKIPPED
- All three scripts run in <2s total. Parallelizing adds complexity (concurrently/npm-run-all dep or ugly node -e wrapper) for negligible gain. Not worth it.

### Accessibility

#### R23. Add focus trap to mobile nav menu
- **Priority**: P1
- **Why**: When hamburger menu opens, keyboard users can Tab past nav into hidden content. Focus is not moved to first link on open. Screen reader users may not know it opened.
- **Evidence**: theme.js lines 98-145: setMobileNav() toggles 'open' but never traps focus. cmdk.js has a correct focus trap for comparison.
- **Touches**: public/scripts/theme.js, src/pages/index.astro, src/components/InteriorNav.astro
- **Acceptance**: Focus moves to first nav link on open. Tab cycles within open menu. Escape closes and restores focus to hamburger button.
- **Verify**: Open mobile nav with keyboard, Tab through all links, confirm wrapping. Escape, confirm focus returns.
- **Complexity**: S

#### R24. Fix heading hierarchy on homepage
- **Priority**: P1
- **Why**: Multiple h2 elements in hero area create confusing document outline. Journey section wraps h3 inside anchor tags (not proper heading landmarks).
- **Evidence**: index.astro line 421: `<h2 class='hero-stage-title'>` inside hero creates a second h2. Journey items (line 672) wrap cards in `<a>` containing h3.
- **Touches**: src/pages/index.astro, src/components/GreatestHits.astro
- **Acceptance**: Clean h1>h2>h3 outline. Each section has one h2. Validated with heading outline tool.
- **Verify**: Run heading outline checker on homepage.
- **Complexity**: S

#### R25. Fix color contrast for --t3 text
- **Priority**: P2
- **Why**: --t3 (#707d93) on --bg (#050913) is ~3.8:1, failing WCAG AA (4.5:1 required). Used pervasively for labels, timestamps, kickers, meta text.
- **Evidence**: global.css line 531: --t3:#707d93 on --bg:#050913. Used in dozens of components.
- **Touches**: src/styles/global.css (:root --t3)
- **Acceptance**: --t3 adjusted to meet 4.5:1 (suggested ~#8b99b0). Light theme --t3 also verified.
- **Verify**: Contrast checker on --t3 against --bg. Visual review of affected components.
- **Complexity**: S

#### R26. Add aria-pressed to catalog filter buttons in server-rendered HTML
- **Priority**: P2
- **Why**: Filter buttons have role='group' but no aria-pressed in initial HTML. JS adds it dynamically but the first render is inaccessible.
- **Evidence**: index.astro lines 491-495: `<button class='fb act'>All</button>` without aria-pressed. main.js:459 sets it on interaction.
- **Touches**: src/pages/index.astro, public/scripts/main.js
- **Acceptance**: 'All' button has aria-pressed='true', others have aria-pressed='false' in server HTML.
- **Verify**: Inspect source before JS loads. Screen reader check.
- **Complexity**: S

#### R27. Fix journey card link semantics
- **Priority**: P2
- **Why**: Journey cards wrap entire content in `<a>` tags including h3 and CTA text. Screen readers announce the entire card as one long link.
- **Evidence**: index.astro lines 668-679: `<a href={step.href} class='ji rv'>` wraps everything.
- **Touches**: src/pages/index.astro (journey section)
- **Acceptance**: Card uses CSS-stretched link pattern. Screen reader announces just the title as link text.
- **Verify**: Screen reader announces concise link text. Visual appearance unchanged.
- **Complexity**: S

#### R28. Add nav landmark to footer links
- **Priority**: P2
- **Why**: Footer links (RSS, GitHub) are not wrapped in `<nav>`. Screen readers do not describe them as navigation.
- **Evidence**: index.astro lines 741-760: footer has links without `<nav>` wrapper.
- **Touches**: src/pages/index.astro, all interior page footers
- **Acceptance**: Footer links wrapped in `<nav aria-label='Footer navigation'>`. Consistent across all pages.
- **Verify**: Screen reader check on footer.
- **Complexity**: S

### New Features

#### R29. Create custom 404 page
- **Priority**: P1
- **Why**: No 404.astro exists. Visitors hitting bad URLs see the default GitHub Pages 404 with no branding, navigation, or recovery path. With 182+ project pages, renamed or removed projects will 404 without guidance.
- **Evidence**: No 404.astro or 404.html in src/pages/ or public/.
- **Touches**: src/pages/ (new 404.astro)
- **Acceptance**: 404.astro using Base layout with InteriorNav, clear message, links to homepage/catalog/search, command palette functional.
- **Verify**: Navigate to /nonexistent-page/, confirm branded 404 with navigation.
- **Complexity**: M

#### R30. Add View Transitions for page navigation
- **Priority**: P1
- **Why**: Every page navigation is a hard reload. Astro 6 natively supports View Transitions API via ClientRouter (2 lines of code). Browser support >85%. Competitors (Lee Robinson, Brittany Chiang) use smooth transitions as a signature UX feature.
- **Evidence**: Grep for 'view-transition|ViewTransition|ClientRouter' returns zero matches. Astro docs confirm zero-JS cross-document view transitions are Baseline 2025.
- **Touches**: src/layouts/Base.astro (add ClientRouter), src/styles/global.css (view-transition-name rules)
- **Acceptance**: Page navigation shows smooth cross-fade/morph. prefers-reduced-motion respected. No JS bundle increase.
- **Verify**: Navigate homepage to project detail and back. Confirm smooth transition. Test reduced-motion. `npm run build` passes.
- **Complexity**: S

#### R31. Add per-project JSON-LD structured data (SoftwareSourceCode)
- **Priority**: P1
- **Why**: Individual project pages have no structured data beyond site-wide WebSite/Person. Pages with valid structured data are 2.3x more likely in Google AI Overviews. All needed fields (name, desc, codeRepository, programmingLanguage, author) are already in scope on project pages.
- **Evidence**: Grep for 'SoftwareSourceCode' returns zero. Base.astro JSON-LD only covers WebSite and Person.
- **Touches**: src/pages/projects/[slug].astro
- **Acceptance**: Every project page emits valid JSON-LD with @type SoftwareSourceCode. Validates in Google Rich Results Test.
- **Verify**: Build, inspect page source for JSON-LD. Paste into Schema.org validator.
- **Complexity**: S

#### R32. Add case study content for Greatest Hits projects
- **Priority**: P1
- **Why**: The top portfolios use full case studies as the primary conversion artifact. Current proof sections are compressed. Greatest Hits include a 38K-line video editor, 67-check security auditor, and million-file PACS migration tool -- stories worth telling in depth.
- **Evidence**: Josh Comeau identifies case studies as highest-ROI portfolio element. Current proof.ts is a skeleton.
- **Touches**: src/data/proof.ts (extend type), src/pages/projects/[slug].astro (render extended sections)
- **Acceptance**: At least 3 Greatest Hits have extended case studies (problem context, key decisions, outcomes). Non-case-study project pages unaffected.
- **Verify**: Navigate to project pages for top projects. Confirm extended sections render.
- **Complexity**: M

### Competitive Features

#### R33. Add contribution heatmap visualization
- **Priority**: P2
- **Why**: No visual representation of contribution activity. Heatmap is the most recognized developer credibility signal. Can be generated at build time from GitHub GraphQL API.
- **Evidence**: GitHub GraphQL contributionsCollection API returns calendar data. fetch-stars.mjs already calls GitHub API. Multiple vanilla-JS heatmap libraries available.
- **Touches**: scripts/fetch-stars.mjs (extend), new component, src/pages/index.astro
- **Acceptance**: Homepage shows 52-week contribution heatmap from cached API data. Light/dark theme variants. Accessible aria-label.
- **Verify**: Run data refresh, build, check heatmap renders with correct counts.
- **Complexity**: M

#### R34. Add /uses page
- **Priority**: P2
- **Why**: Established convention (1000+ examples at uses.tech). Natural fit for sysadmin portfolio across 6 languages and multiple platforms. Strong long-tail SEO.
- **Evidence**: Wes Bos awesome-uses catalogs 1000+ /uses pages. Existing interior page pattern provides ready template.
- **Touches**: src/data/uses.ts (new), src/pages/uses.astro (new), Base.astro (command palette)
- **Acceptance**: /uses/ renders categorized sections from typed data. Appears in command palette. Matches design language.
- **Verify**: Navigate to /uses/. Command palette finds 'uses'.
- **Complexity**: S

#### R35. Add printable resume page
- **Priority**: P2
- **Why**: Career data already exists in index.astro (3 positions). Resume/ directory exists but integration is unclear. Top portfolios treat resume as derived view of same data.
- **Evidence**: index.astro careerRoles array (lines 212-261). resume/ directory exists. Brittany Chiang, Lee Robinson have prominent resume links.
- **Touches**: resume/ directory, src/pages/resume.astro (new), src/styles/global.css (@media print)
- **Acceptance**: /resume/ renders print-optimized career view. @media print produces clean PDF. Discoverable via command palette.
- **Verify**: Navigate to /resume/. Print (Ctrl+P), verify clean output.
- **Complexity**: S

#### ~~R36. Expand RSS feed beyond releases~~ DONE
- RSS now includes full catalog (182 entries) deduplicated against featured/live apps, sorted by push date. Channel description shows dynamic catalog count and category count.

#### R37. Add build-time download count aggregation
- **Priority**: P3
- **Why**: Stars are shown but downloads are a stronger engagement signal. GitHub Releases API provides download_count per asset. fetch-stars.mjs already queries releases.
- **Evidence**: _releases.json has release data. GitHub API includes assets[].download_count. Impactful for win11-nvme-driver-patcher, HostShield, NovaCut, Astra-Deck.
- **Touches**: scripts/fetch-stars.mjs, project detail pages
- **Acceptance**: Per-project download totals aggregated at build time. Shown on project detail pages for projects with releases.
- **Verify**: Run data refresh, build, check download counts on project pages.
- **Complexity**: M

### Light Theme and Visual Polish

#### R38. Complete or remove light theme
- **Priority**: P2
- **Why**: Light theme toggle exists but the palette is explicitly "incomplete" (theme.js comment). Hardcoded `rgba(255,255,255,.08)` borders, dark gradients, and dark-only card backgrounds become invisible/broken in light mode. A half-broken theme undermines trust.
- **Evidence**: theme.js lines 81-83 comment about incomplete palette. 78 html[data-theme="light"] overrides scattered in global.css, but hundreds of raw rgba dark values are not overridden.
- **Touches**: src/styles/global.css (pervasive), public/scripts/theme.js
- **Acceptance**: Either: (a) all card borders, sections, and chrome are visible in light theme, or (b) the toggle is removed and documented as future work.
- **Verify**: Toggle light theme, scroll entire homepage and key interior pages, confirm no invisible elements.
- **Complexity**: XL (if completing), S (if removing)

#### R39. Suppress zero-star '--' display in catalog
- **Priority**: P3
- **Why**: CatalogEntry shows '--' for all repos before API response (~1-2 seconds). Creates visual noise since most repos have zero stars.
- **Evidence**: CatalogEntry.astro line 98: `{stars ?? '--'}`. Build-time _stars.json data available to conditionally hide zero-star badges.
- **Touches**: src/components/CatalogEntry.astro (lines 96-101)
- **Acceptance**: Star badge only rendered when stars > 0 at build time.
- **Verify**: Build, check catalog entries for zero-star repos show no badge.
- **Complexity**: S

### Modern Web Patterns

#### R40. Add CSS scroll-driven animations (progressive enhancement)
- **Priority**: P2
- **Why**: Scroll progress bar and section reveals are JS-based (IntersectionObserver + scroll listener). CSS scroll-driven animations (animation-timeline: view()) are Baseline 2025 and eliminate JS overhead.
- **Evidence**: main.js lines 364-384 scroll event for progress bar. theme.js lines 148-190 IntersectionObserver for reveals. No animation-timeline CSS found.
- **Touches**: src/styles/global.css, public/scripts/main.js, public/scripts/theme.js
- **Acceptance**: Scroll progress and reveals use CSS animation-timeline with JS fallback via @supports. prefers-reduced-motion still disables animations.
- **Verify**: Scroll homepage, confirm smooth reveals. Disable JS, confirm CSS-only reveals work.
- **Complexity**: M

#### R41. Migrate command palette to native `<dialog>` element
- **Priority**: P3
- **Why**: Currently uses div with role='dialog' + manual focus trap + manual z-index + manual scroll lock. Native `<dialog>` provides all of this for free plus proper top-layer and inert behavior.
- **Evidence**: Base.astro line 228: `<div class='cmdk-backdrop' role='dialog'>`. cmdk.js lines 309-336 implement manual open/close/focus.
- **Touches**: src/layouts/Base.astro, public/scripts/cmdk.js, src/styles/global.css
- **Acceptance**: `<dialog>` with showModal()/close(). Focus trap code removed. Visual appearance unchanged.
- **Verify**: Ctrl+K opens palette, Escape closes, focus trapped, visual identical.
- **Complexity**: M

### Self-Hosting and Performance

#### R42. Self-host Google Fonts
- **Priority**: P2
- **Why**: External CDN for critical visual assets adds 2-3 round trips, privacy vector (Google tracking via font requests), and failure mode (corporate firewalls, privacy extensions). Directly addresses mobile LCP warning (3156ms). Loading 12 weight variants when only 6-8 are used.
- **Evidence**: Base.astro line 210 loads from fonts.googleapis.com. PERFORMANCE_AUDIT.md mobile LCP at 3156ms. .astro/fonts/ already has partial self-hosted TTFs.
- **Touches**: src/layouts/Base.astro (lines 199-213), public/fonts/ (new directory)
- **Acceptance**: WOFF2 files self-hosted for JetBrains Mono and Outfit (used weights only). Google Fonts link removed. Fonts render identically.
- **Verify**: Block fonts.googleapis.com, confirm fonts render. Measure LCP improvement.
- **Complexity**: M

---

## Quick Wins

P2/P3 items under 1 hour, suitable for a focused cleanup session:

| # | Item | Complexity |
|---|------|-----------|
| R1 | Fix InteriorNav #featured anchor | S |
| R2 | Update /now/ page date and content | S |
| ~~R3~~ | ~~Refresh _stats.json~~ | ~~DONE~~ |
| R4 | Fix OG 'cpp' category | S |
| R7 | Clean _extracted.json | S |
| R8 | Remove dead particle canvas | S |
| R9 | Remove dead CSS selectors | S |
| R10 | Delete generate-data.mjs | S |
| R11 | Handle legacy.html | S |
| R12 | Bake avatar URL at build time | S |
| R13 | Switch YouTube to nocookie | S |
| R14 | Auto-generate SW cache version | S |
| R17 | Extract shared client JS utils | S |
| R20 | Fix quality-gates error handling | S |
| ~~R21~~ | ~~Investigate build concurrency~~ | ~~DONE~~ |
| ~~R22~~ | ~~Parallelize pre-build validation~~ | ~~SKIPPED~~ |
| R25 | Fix --t3 color contrast | S |
| R26 | Add aria-pressed to filter buttons | S |
| R27 | Fix journey card link semantics | S |
| R28 | Add footer nav landmark | S |
| ~~R36~~ | ~~Expand RSS feed~~ | ~~DONE~~ |
| R39 | Suppress zero-star display | S |

---

## Larger Bets

P1/P2 items needing design decisions or significant implementation:

| # | Item | Complexity | Design Decision |
|---|------|-----------|-----------------|
| ~~R6~~ | ~~Content-Security-Policy~~ | ~~DONE~~ | ~~Origins enumerated, unsafe-inline for scripts/styles~~ |
| R15 | Service worker precache | M | Which pages to precache, cross-origin API cache strategy |
| R18 | data-refresh workflow purpose | M | Commit-back vs health-check-only model |
| R29 | Custom 404 page | M | Layout, content, navigation paths |
| R32 | Case study deep-dives | M | Data model extension, content authoring for 3+ projects |
| R33 | Contribution heatmap | M | GraphQL query, SVG rendering, theme variants |
| R38 | Light theme completion | XL | Full visual audit, 100+ override sites |
| R40 | CSS scroll-driven animations | M | Progressive enhancement strategy, fallback handling |
| R42 | Self-host fonts | M | Weight subset, WOFF2 generation, @font-face rules |

---

## Rejected or Parked

Carried forward from prior roadmap:

- **Hosted backend search**: parked unless Pagefind proves insufficient for the catalog.
- **Analytics-heavy visitor tracking**: rejected. Build-time evidence is sufficient.
- **Listing private/internal repositories**: rejected. Use sanitized capability narratives.
- **Automatic GitHub visibility changes from this repo**: rejected. Explicit human action required.
- **Notes/TIL feed**: parked behind NOTES_FEED_POLICY.md activation criteria.
- **Full CSS redesign**: parked. Incremental improvements preferred.
- **Client-side embeddings / hosted semantic search**: rejected for now. Pagefind + semantic:audit sufficient.

New rejections from this research:

- **Project dependency/ecosystem graph visualization** (P3/L complexity): Deferred. Interesting differentiation but high effort relative to visitor impact. Revisit if semantic:audit outputs graph-ready data.
- **Project comparison tables**: Deferred. Requires new data structure and content authoring for multiple project families.
- **Keyboard-navigable project cards with roving tabindex**: Partially addressed by R25 (contrast) and R26 (aria-pressed). Full roving tabindex deferred pending accessibility audit with real screen readers.
