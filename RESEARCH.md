# Research — sysadmindoc.github.io

## Executive Summary

`sysadmindoc.github.io` v0.20.0 is an Astro 6.4.8 static portfolio, evidence layer, and project catalog for Matt Parker (SysAdminDoc). It is not a generic portfolio template; it is a source-backed, privacy-preserving, audited public artifact with Pagefind search, generated GitHub metadata, remote README rendering, strict CSP, PWA/offline support, machine-readable endpoints, and 34 audit scripts across CI/deploy quality gates. Compared to the top 25 OSS portfolio templates (AstroPaper, Astrofy, GitProfile, Magic UI Portfolio, Once UI, astro-erudite) and commercial platforms (Framer, Webflow, read.cv, Peerlist), this project leads in evidence density, audit infrastructure, security posture, and accessibility coverage. Its competitive position is strong; the highest-value direction is CSS modernization, deeper WCAG 2.2 compliance, and progressive web platform adoption — not feature expansion.

Top priorities in order:
1. Adopt baseline CSS features (`@starting-style`, `color-mix()`, `:has()`, subgrid) to reduce manual workarounds and CSS volume
2. Split the 6272-line global.css into importable module files behind the existing `@layer` structure
3. Add `Permissions-Policy` restrictive defaults via CSP meta tag
4. Adopt WCAG 2.2 target-size auditing for interactive elements
5. Add Trusted Types CSP directive as defense-in-depth
6. Verify cross-document View Transition behavior in browser audits
7. Add resume print-to-PDF generation at build time
8. Expand the Playwright interaction smoke to cover catalog filter URL persistence
9. Add a build-time CSS nesting pass for the most repetitive selector blocks
10. Surface project reading-time estimates in catalog and search result cards

## Product Map

- Core workflows: browse homepage proof and Greatest Hits, search/filter the 182-project catalog, inspect project detail and README excerpts, use language/release/timeline/archive/screenshots/status views, open command palette shortcuts, install/use offline fallback, and consume JSON/Atom/RSS/sitemap/LLM endpoints.
- User personas: hiring managers validating real impact and engineering judgment; technical collaborators checking source, releases, and README evidence; open-source users looking for launchable projects; the site owner maintaining public/private boundaries.
- Platforms and distribution: Astro 6 static output on GitHub Pages; Node >=24; browser-only scripts; no server runtime, database, analytics, hosted CMS, forms backend, or team editing workflow.
- Key integrations: GitHub REST API (with ETag conditional caching) and profile feed populate generated caches; `marked`, `sanitize-html`, and Shiki render remote README excerpts; Pagefind indexes built HTML with Category/Scope facets; GitHub Actions runs dependency review, generated-data refresh, build, link, accessibility, visual baseline, CSP, schema, feed, sitemap, bundle, DOM-size, performance, forced-colors, and live smoke audits; SBOM and artifact attestation ship with every deploy.

## Competitive Landscape

- **AstroPaper** (4747 stars): Does Pagefind fuzzy search, tag-based filtering, and system/light/dark themes well. Learn from its 100/100 Lighthouse discipline and VoiceOver/TalkBack screen-reader testing documentation. This project already exceeds its feature set through faceted search, case studies, and audit infrastructure.
- **Once UI Magic Portfolio** (1336 stars, fastest-growing 2025-2026): Does config-driven setup, auto-generated OG images, and password-protected pages well. Learn from its design-system consistency and feature toggles. Avoid adopting a component design-system layer; the custom vanilla-JS approach is intentional and already audited.
- **astro-erudite** (797 stars): Does native CSS (dropped Tailwind in v2), View Transitions SPA mode, Shiki code highlighting, and LaTeX rendering well. Learn from its move away from Tailwind toward native CSS; confirms the project's existing vanilla CSS direction.
- **chronark.com** (815 stars): Does deep GitHub data integration (REST + GraphQL, traffic data, security alerts, auto UI-library detection from `package.json`) well. Learn from its deployment and traffic data surfacing. Avoid pulling traffic/analytics data — contradicts the privacy model.
- **lowlighter/metrics** (16821 stars): Does plugin-based GitHub visualization (30+ plugins, 300+ options, SVG/Markdown/PDF output) well. Learn from its repeatable data-refresh and shareable artifact patterns. Avoid widget-heavy badge walls; searchable project pages and proof records are more credible.
- **Commercial platforms** (Framer, Webflow, read.cv, Peerlist): Paywall analytics dashboards, CMS collections, team editing, and A/B testing. Learn from structured case-study formats (Problem > Approach > Outcome > Metrics) and availability signaling. Avoid CMS/analytics/collaboration complexity without a content team.

## Security, Privacy, and Reliability

- Verified: 0 npm audit vulnerabilities across production and development dependencies (checked 2026-06-19).
- Verified: `scripts/fetch-stars.mjs` now uses `ETag`/`If-None-Match` conditional requests for releases and READMEs (v0.19.0). Rate-limit pressure is reduced but repo list fetches still do full refetches.
- Verified: CSP is strict with hash-based `style-src-elem`, `script-src 'self'`, `style-src-attr 'none'`, and `form-action 'self'`. Missing: `Permissions-Policy` header (not settable via GitHub Pages HTTP headers, but `<meta>` equivalent is not present). Missing: `trusted-types` directive (baseline since Feb 2026, would add defense-in-depth against DOM XSS since `innerHTML` usage is already audited safe).
- Verified: Light theme browser audits and SW lifecycle tests were added in v0.19.0. Live-app availability and screenshot drift audit added. SBOM and artifact attestation added to deploy workflow. Quality-gate issue format normalized with compact status tables.
- Gap: No `Permissions-Policy` restrictive defaults to disable unused browser capabilities (camera, microphone, geolocation, payment).
- Gap: No build-time validation that interactive touch targets meet WCAG 2.2's 24×24px minimum (2.5.8). Current targets are 42-44px min-height (well above threshold), but no automated gate catches regressions.
- Gap: Cross-document View Transitions are enabled via `@view-transition { navigation: auto; }` in CSS, but no browser audit exercises the transition behavior between pages.

## Architecture Assessment

- **CSS architecture**: The 6272-line `global.css` uses `@layer` sections and `light-dark()` (24 uses), container queries (9 uses), scroll-driven animations (4 uses), forced-colors (5 uses), and `prefers-reduced-motion` (8 uses). However, it does not use baseline-safe features like `@starting-style`, `color-mix()`, `:has()`, subgrid, or CSS nesting. These could reduce selector repetition and manual theme overrides. The file would benefit from being split along its existing `@layer` boundaries into importable CSS modules.
- **Client JS**: 16 separate public scripts (~2200 lines total) are well-organized by concern. The 1233-line `main.js` covers terminal, GitHub API, particles, search, and animations for the homepage. No JS framework — all vanilla, audited for XSS safety.
- **Data layer**: TypeScript types, profile-feed adapter with local fallback, build-time ranking with configurable weights, and 6 generated JSON caches (`_stars.json`, `_meta.json`, `_readmes.json`, `_releases.json`, `_stats.json`, `_profile-projects.json`). The generated-data lifecycle is well-documented across fixture, unauthenticated, and production modes.
- **Test infrastructure**: 34 unit tests (node:test), 4 Playwright spec files (axe, visual baselines, CSP, interactions, SW lifecycle), 34 audit scripts. Coverage is exceptional. Gaps: no catalog URL-state persistence smoke test, no cross-document view-transition exercise, no touch-target size regression gate.
- **Resume page**: Has print stylesheet, JSON Resume export, and per-section command palette. Missing: build-time PDF generation from the resume HTML (community research shows PDF download is a strong hiring signal).

## Rejected Ideas

- Runtime AI portfolio summaries (DevB.io pattern) — rejected because portfolio claims must remain conservative, source-backed, and locally auditable.
- Hosted analytics/RUM dashboards (Plausible, Umami, Posthog) — rejected because the site intentionally avoids runtime tracking; lab and scheduled audits fit the privacy model.
- CMS, team editing, hosted forms (Framer/Webflow/Notion pattern) — rejected because no content team or workflow requires SaaS editing.
- Full i18n/localization (Hugo Toha's 23-language pattern) — rejected until a real multilingual source corpus and maintenance owner exist.
- Widget-heavy GitHub metric walls (lowlighter/metrics, GitProfile 37-theme pattern) — rejected because searchable project pages and proof records are more credible than badge sprawl.
- Hosted or vector/semantic search — rejected because Pagefind matches the no-backend model.
- Database-backed features (guestbook, view counts, comments via Giscus/Supabase/Astro DB) — rejected because the site is a static, privacy-first public artifact with no user accounts or server runtime.
- Bento grid layout (astro-bento-portfolio pattern) — rejected because the existing section-based hierarchy with Greatest Hits, Live Apps, and Catalog serves evidence density better than a visual grid.
- Public notes/TIL feed — rejected until `NOTES_FEED_POLICY.md` activation criteria are met.
- Astro 7 migration — rejected until stable release (`Roadmap_Blocked.md`).
- Plugin ecosystem or multi-user authoring — rejected as a product mismatch.
- Newsletter integration (Mailchimp/Buttondown/Beehiiv) — rejected because the site has no blog content feed and no subscriber relationship to maintain.
- Password-protected pages (Once UI pattern) — rejected because all portfolio content is intentionally public.
- 3D elements (Three.js/D3 globe, craftzdog pattern) — rejected because the site prioritizes content density and load performance over decorative interactivity.
- COEP/COOP/CORP headers — rejected because unnecessary for a content-only static site without SharedArrayBuffer or WebAssembly threads.

## Sources

Direct OSS competitors and analogs:
- https://github.com/satnaing/astro-paper
- https://github.com/markhorn-dev/astro-nano
- https://github.com/trevortylerlee/astro-micro
- https://github.com/jktrn/astro-erudite
- https://github.com/manuelernestog/astrofy
- https://github.com/arifszn/gitprofile
- https://github.com/lowlighter/metrics
- https://github.com/once-ui-system/magic-portfolio
- https://github.com/magicuidesign/portfolio
- https://github.com/chronark/chronark.com
- https://github.com/emmabostian/developer-portfolios

Commercial and adjacent products:
- https://www.framer.com/pricing
- https://webflow.com/pricing
- https://read.cv/about/profiles
- https://peerlist.io
- https://contra.com
- https://jsonresume.org
- https://rxresu.me

Standards and web platform:
- https://css-tricks.com/interop-2026/
- https://chrome.dev/css-wrapped-2025/
- https://web.dev/articles/strict-csp
- https://web.dev/articles/content-visibility
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/trusted-types
- https://www.debugbear.com/blog/speculation-rules
- https://www.allaccessible.org/blog/wcag-22-complete-guide-2025

Community and hiring signal:
- https://news.ycombinator.com/item?id=32113545
- https://hakia.com/skills/building-portfolio/
- https://dev.to/__be2942592/how-to-build-a-developer-portfolio-that-actually-gets-you-hired-2026-6kn
- https://shipixen.com/blog/seo-checklist-for-developer-portfolios-and-landing-pages
- https://fueler.io/blog/proof-of-work-portfolios-real-examples-that-open-doors

## Open Questions

None that block prioritization or implementation.
