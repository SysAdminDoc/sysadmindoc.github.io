# Research - sysadmindoc.github.io

Date: 2026-07-06

## Executive Summary
Verified: `sysadmindoc.github.io` v0.21.8 is an Astro 7, Node 24+, GitHub Pages portfolio/PWA for Matt Parker's public project archive. Its strongest current shape is not a generic template; it is a static, privacy-first proof-of-work system with generated GitHub/profile data, Pagefind search, strict local audits, status/feed endpoints, JSON Resume export, screenshots, CSP hardening, and service-worker resilience. The highest-value direction is release trust: fix broken downloadable artifacts first, then make install/search/visual QA and evidence semantics as enforceable as the existing data and CSP gates.

Top opportunities, in order:
- Fix the broken `/resume.pdf` production artifact path and make built-link auditing part of the release gate.
- Expand rendered axe/visual coverage beyond the four current baseline routes to every major public surface.
- Add manifest screenshots and a manifest audit so the install prompt reflects the existing visual product evidence.
- Keep Astro/Vite/Shiki/sharp/rss range updates current because the repo is Windows-first and Vite dev-server advisories are active in the ecosystem.
- Add a release-artifact smoke check for the portfolio itself, matching the site's existing status/build-identity posture.
- Precache the actual Pagefind component runtime after indexing so first-install offline search is not dependent on a previous build stamp.
- Make the contribution heatmap legend truthful: source data is binary push-day presence, while the UI renders five intensity levels.
- Continue source-level CSP style hardening by shrinking the remaining inline style-block surface.
- Synchronize ignored local ops docs/version metadata so maintainer-facing guidance does not drift behind shipped version state.

## Product Map
- Core workflows: scan homepage proof, search/filter the project catalog, open project detail/README/release pages, browse timeline/releases/screenshots/status/uses/resume pages, consume JSON/RSS/Atom/llms endpoints, and install/use the site as a PWA.
- User personas: hiring and recruiting reviewers, technical peers checking source quality, the maintainer running local build/deploy gates, search/social crawlers, and offline/mobile visitors using the PWA shell.
- Platforms and distribution: static Astro output on GitHub Pages, local Windows-first Node 24 build tooling, Chromium/Playwright local QA, no hosted analytics, no backend, no GitHub Actions.
- Key integrations and data flows: SysAdminDoc profile feed and GitHub API caches into `src/data/_*.json`, sanitized Markdown rendering for README previews, Pagefind index generation after build, Satori/resvg OG cards, screenshot capture/thumbnail pipeline, service-worker precache/runtime caching, JSON Resume endpoint and PDF render script.

## Competitive Landscape
- Peerlist: does proof-of-work aggregation and verified resume credibility well. Learn from its "all work in one place" and verified-credential framing; avoid social feed, messaging, and account/network mechanics.
- JSON Resume, OpenResume, and Reactive Resume: do structured career portability and PDF/JSON export well. Learn from schema validation and reliable export artifacts; avoid replacing the existing concise resume page with a full resume builder.
- Magic Portfolio / Once UI: does content separation, CV/project/gallery structure, and polished portfolio defaults well. Learn from portable content contracts and gallery polish; avoid importing a heavier React/design-system stack into a static Astro codebase.
- AstroPaper, Dasein, and recent Astro portfolio templates: do Astro content hygiene, search, SEO, RSS/sitemap, dark mode, and accessible templates well. Learn from route coverage and theme consistency; avoid becoming a blog/template project.
- Pagefind: remains the best fit for no-backend private static search. Keep it; improve offline/runtime integration before considering hosted or vector search.
- lowlighter/metrics: does deterministic GitHub-data artifact generation and many output formats well. Learn from reproducible data/report patterns; avoid badge-wall presentation that would weaken project-level evidence.
- Framer/Webflow/PWA install guidance: commercial products package deployment confidence, localization, staging, redirects, and install presentation well. Learn from richer install and deployment-health surfaces; avoid CMS, analytics, forms, and paid-platform workflows that conflict with the repo philosophy.

## Security, Privacy, and Reliability
- Verified: `npm run links:audit` currently fails on `dist/resume/index.html -> /resume.pdf`; `package.json` exposes `resume:pdf` but `npm run build`/`build:ci` do not run it or `links:audit`.
- Verified: `npm run audit:prod` reports `found 0 vulnerabilities`, and `npm run deps:audit` reports zero high/critical advisories, but range updates remain for `astro`, `@astrojs/rss`, `sharp`, `shiki`, and the Vite override.
- Verified: current `vite@8.1.0` is past the Vite `server.fs.deny` patched floor for GHSA-fx2h-pf6j-xcff, and `sanitize-html@2.17.5` is past the `sanitize-html@2.17.3` XSS patched floor for GHSA-rpr9-rxv7-x643; keep the freshness gate because both dependencies sit on trust boundaries.
- Verified: `public/manifest.json` has icons, shortcuts, categories, and `launch_handler`, but no `screenshots` member despite existing public screenshot assets and PWA install guidance recommending screenshot metadata.
- Verified: `scripts/stamp-sw.mjs` runs before `search:index` and only conditionally includes `pagefind.js`/`pagefind-ui.js`; the search page loads `pagefind-component-ui.css` and `pagefind-component-ui.js`, so a clean build cannot precache the actual component runtime on first stamp.
- Verified: `src/pages/index.astro` maps binary `stats.pushDays` values to `level: active ? 4 : 0`, while `src/styles/global.css` and the homepage legend present five heatmap intensity levels.
- Verified: source-level CSP trial `node scripts/audit-csp.mjs --strict --active-style-src-elem --candidate-style-src-attr "'none'"` reports 15 source style blocks that block a stricter source-level `style-src-elem` posture; the built dist gate remains the current release guard.
- Missing guardrails: build-integrated link artifact audit, manifest screenshot validation, release-asset smoke verification, first-install offline search assertion, source-level style hardening acceptance, and broader browser visual/axe route coverage.

## Architecture Assessment
- Build/release boundary: `build:ci` validates many generated endpoints but omits `links:audit` and `resume:pdf`; artifact generation and broken-link validation should be part of the same production path.
- Data boundary: generated GitHub/profile/release/readme caches are well modeled and status-aware; next trust work should extend that same proof pattern to local release artifacts and install/search assets.
- PWA boundary: service-worker navigation preload is already implemented and tested; the remaining gap is cache-manifest ordering and matching the actual Pagefind component assets.
- UI boundary: major secondary pages have interaction smoke coverage in places, but Playwright axe/target-size/visual baselines still focus on home/search/archive/project routes; status, timeline, releases, screenshots, resume, uses, now, healthcare, and language lanes need rendered regression coverage.
- Security boundary: Markdown/README rendering uses `marked` plus `sanitize-html`; keeping dependency floors current and validating schema/export surfaces matters more than adding new libraries.
- Documentation boundary: `ROADMAP.md` still says v0.21.7 and `CLAUDE.md` has older status/version notes while package/README are v0.21.8; ignored maintainer docs should be synced in a follow-up implementation pass.

## Rejected Ideas
- Hosted analytics or real-user tracking from Framer/Webflow: rejected because the project explicitly favors static, privacy-first behavior and already exposes local/audited status surfaces.
- CMS, comments, forms, accounts, team publishing, or social-network features: rejected because there is no backend, moderation model, or multi-user workflow in this repository.
- Full i18n/localization rollout: rejected until translated resume/project content exists; commercial localization pricing shows value, but the current corpus is English-only.
- Native app-store packaging: rejected because the correct platform investment is PWA install quality on GitHub Pages, not wrapping a static portfolio in native shells.
- Hosted/vector semantic search: rejected because Pagefind already fits the static/no-backend/privacy model and has dedicated local audits.
- Server-side Astro 7 route caching/API middleware: rejected for this GitHub Pages static deployment; useful in Astro generally, but not fit for the current host/runtime.
- GitHub Actions build/deploy/test workflows: rejected by repo rules and history; all gates should remain local scripts.
- Badge-wall GitHub metrics: rejected because lowlighter/metrics is a data-pipeline reference, not the desired product surface.
- Broad proof/case-study expansion: valuable, but human-authored case studies and sensitive healthcare claims need maintainer judgment before promotion.
- Notes/TIL publishing: rejected by `NOTES_FEED_POLICY.md` until there is an intentionally reviewed public notes corpus.

## Sources
Direct OSS and analogs:
- https://github.com/satnaing/astro-paper
- https://github.com/once-ui-system/magic-portfolio
- https://github.com/roicort/dasein
- https://github.com/MaeWolff/astro-portfolio-template
- https://github.com/lowlighter/metrics
- https://github.com/Pagefind/pagefind
- https://github.com/jsonresume
- https://github.com/xitanggg/open-resume

Commercial and community:
- https://peerlist.io/
- https://www.framer.com/pricing
- https://webflow.com/
- https://indieweb.org/Read.cv
- https://github.com/emmabostian/developer-portfolios
- https://www.reddit.com/r/webdev/comments/ru9bpo/some_examples_of_portfolios/

Standards and platform APIs:
- https://pagefind.app/docs/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/screenshots
- https://web.dev/patterns/web-apps/richer-install-ui
- https://developer.mozilla.org/en-US/docs/Web/API/NavigationPreloadManager
- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-contrast
- https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility

Dependencies and security:
- https://astro.build/blog/astro-7/
- https://docs.astro.build/en/guides/upgrade-to/v7/
- https://github.com/Pagefind/pagefind/releases
- https://playwright.dev/docs/release-notes
- https://github.com/withastro/astro/releases
- https://github.com/shikijs/shiki/releases
- https://github.com/advisories/GHSA-fx2h-pf6j-xcff
- https://github.com/advisories/GHSA-rpr9-rxv7-x643

## Open Questions
None.
