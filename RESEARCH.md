# Research — sysadmindoc.github.io

## Executive Summary
Verified: `sysadmindoc.github.io` v0.21.0 is a static Astro 6 portfolio, project catalog, search surface, resume endpoint, and PWA hosted on GitHub Pages with a privacy-first no-analytics posture. Its strongest current shape is not a generic portfolio template; it is a local-audited proof-of-work system with Pagefind search, generated GitHub/profile data, strict CSP audits, visual baselines, and service-worker resilience. The highest-value direction is to make trust visible and enforceable before adding breadth: release gates for generated data freshness, public status transparency, PWA navigation reliability, Trusted Types readiness, and a desktop homepage hero that uses existing proof rather than empty space.

Top opportunities, in order:
- Gate production/release deploys on generated-data freshness and coverage; `npm run data:summary` currently reports stale partial data while normal validation can still pass.
- Surface generated-data trust state on `/status` and `/status.json` so stale, fixture, or unauthenticated builds are visible.
- Add service-worker navigation preload to reduce boot-delay cost while preserving current offline fallbacks.
- Prepare Trusted Types enforcement by removing or centralizing raw `innerHTML` sinks in public runtime scripts.
- Use the desktop homepage hero's empty right column for an evidence preview sourced from existing proof/live screenshot data.
- Clear the `yaml` override range update reported by the dependency audit.
- Re-trial the Astro 7/Vite 8 upgrade path because the current blocked note says Astro 7 was not stable, but the dependency audit now reports Astro 7.0.3 and Vite 8.1.0 as latest majors.

## Product Map
- Core workflows: browse the home proof surface, search/filter projects with Pagefind, inspect project detail pages and generated README previews, view resume/status/feed endpoints, install/use the site as a resilient PWA.
- User personas: hiring/recruiting reviewers, technical peers evaluating work quality, the maintainer running local audits/deploys, and search engines/social previews consuming structured metadata.
- Platforms and distribution: Astro static output on GitHub Pages, Node 24+ local build tooling, browser PWA install via `public/manifest.json`, no server-side runtime.
- Key integrations and data flows: GitHub API/profile feed to generated data caches, local README/release/star metadata, Pagefind index generation, Satori/resvg OG images, sanitized Markdown rendering, service-worker precache/runtime caching, JSON Resume output.

## Competitive Landscape
- AstroPaper: strong Astro content hygiene, fuzzy search, SEO, RSS/sitemap, dark mode, and dynamic OG images. Learn from its narrow performance/SEO discipline; avoid turning this repo into a blog template.
- Magic Portfolio / Once UI: strong config-driven portfolio structure with schema, OG, sitemap, robots, and design-system consistency. Learn from its portable content toggles; avoid importing a heavy component system into a mostly static custom site.
- GitProfile and Astrofy: strong low-friction GitHub/profile-driven portfolio setup. Learn from their simple data-to-portfolio path; avoid theme-gallery sprawl and weak proof depth.
- lowlighter/metrics: strong deterministic GitHub-data artifact generation. Learn from reproducible refresh/reporting patterns; avoid badge-wall presentation that weakens project evidence.
- JSON Resume, read.cv, Peerlist, and Contra: strong structured career/proof-of-work presentation and profile portability. Learn from concise proof, resume export, and project credibility patterns; avoid social-network, messaging, marketplace, or account features.
- Pagefind and static-search peers: strong fit for private, static, no-backend search. Keep Pagefind; avoid hosted/vector search unless local static search stops meeting project needs.
- Framer, Webflow, and PWA Builder: strong install polish, staging/status, redirects, localization, and deployment confidence surfaces. Learn from deployment health and PWA presentation; avoid paid-platform analytics, forms, CMS, and team workflows that conflict with the repo's static/privacy model.

## Security, Privacy, and Reliability
- Verified: `npm run deps:audit` reports zero high/critical advisories; the Astro markdown URL-sanitization advisory GHSA-jrpj-wcv7-9fh9 affects Astro `<6.3.6`, while this repo is on `astro@6.4.8`.
- Verified: `npm run data:summary` reports generated data older than the 36h limit, unauthenticated partial mode, 8.8% star/metadata/README coverage, and failing freshness/coverage integrity checks; `package.json` build scripts do not currently run the strict summary gate.
- Verified: `src/pages/status.astro` and `src/pages/status.json.ts` expose build/status signals, but not generated-data coverage, mode, age, or parity percentages from the failing summary.
- Verified: `public/sw.js` implements resilient navigation/offline handling but does not enable or consume `ServiceWorkerRegistration.navigationPreload`; current SW tests do not cover that path.
- Verified: `public/scripts/cmdk.js`, `home-github.js`, `home-media.js`, `shot-viewer.js`, and `theme-toggle.js` contain `innerHTML` sinks; CSP audits are strong today, but the Trusted Types directive remains blocked until these sinks are wrapped or replaced.
- Missing guardrails: release/deploy preflight for production data quality, public stale/partial data warnings, Trusted Types readiness audit, navigation-preload fallback tests.
- Recovery and rollback needs: keep normal fixture/offline builds available for local development, make release preflight opt-in or deploy-specific, preserve service-worker cache version rollback behavior, and keep CSP changes staged behind audits before enforcing new directives.

## Architecture Assessment
- Data boundary: profile-feed cache freshness and generated GitHub/README/release caches are separate trust domains; a deploy preflight and status contract should make those differences explicit.
- Runtime boundary: public scripts need a shared safe-rendering/Trusted Types compatibility layer so future CSP enforcement does not require another broad audit.
- PWA boundary: `public/sw.js` should treat navigation preload as a performance enhancement only, with unsupported browsers and offline paths still passing current lifecycle tests.
- UI boundary: current desktop screenshots show the homepage hero spans the width but leaves a large unused right side; use existing proof/live screenshot data there rather than adding decorative content.
- Dependency boundary: `npm run deps:audit` shows `yaml` needs a range update, and the Astro 7/Vite 8 major upgrade blocker should be re-trialed against the current local audit suite.
- Test and documentation gaps: add status/preflight tests for data trust, SW tests for preload response and unsupported browsers, CSP/source-sink audit coverage for Trusted Types readiness, and visual baselines for the desktop hero evidence rail.

## Rejected Ideas
- Hosted analytics or real-user tracking from Framer/Webflow-style products: rejected because the repo's verified posture is static and privacy-first with no runtime tracking.
- CMS, comments, forms, accounts, or team workflows from commercial site builders: rejected because there is no backend, moderation, or multi-user product workflow in this repo.
- Full i18n/localization rollout: rejected for now because there is no multilingual content corpus; add only when translated project/resume content exists.
- Native mobile/app-store packaging: rejected because the current PWA manifest/service worker path is the correct platform investment; manifest screenshots are already blocked pending proper captures.
- Hosted/vector semantic search: rejected because Pagefind already fits the static privacy model and search audits exist.
- GitHub Actions dependency/build workflows: rejected because this repo intentionally removed workflows and current repo rules require local builds/audits.
- Badge-wall GitHub metrics: rejected because lowlighter/metrics is useful as a data-pipeline reference, but this project's proof pages should stay evidence-led rather than badge-led.
- Immediate Permissions-Policy headers: rejected because GitHub Pages cannot set custom HTTP headers and no equivalent meta policy exists.
- Immediate Trusted Types CSP enforcement: rejected until raw DOM sinks are wrapped or replaced.
- Publishing notes/TIL from research or changelog data: rejected by `NOTES_FEED_POLICY.md` until there is an intentionally curated public notes corpus.
- Broad proof-record expansion: valuable but blocked on human-authored case studies, already tracked in `Roadmap_Blocked.md`.

## Sources
Direct OSS and analogs:
- https://github.com/satnaing/astro-paper
- https://github.com/once-ui-system/magic-portfolio
- https://github.com/manuelernestog/astrofy
- https://github.com/arifszn/gitprofile
- https://github.com/timlrx/tailwind-nextjs-starter-blog
- https://github.com/lowlighter/metrics
- https://jsonresume.org/schema/
- https://github.com/jsonresume/resume-cli

Commercial and community:
- https://www.framer.com/pricing/
- https://webflow.com/pricing/
- https://read.cv/
- https://peerlist.io/
- https://contra.com/
- https://news.ycombinator.com/item?id=32113545

Standards and platform APIs:
- https://pagefind.app/docs/
- https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/navigationPreload
- https://web.dev/navigation-preload/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/screenshots
- https://developer.mozilla.org/en-US/docs/Web/Manifest/Reference/launch_handler
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/trusted-types
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
- https://www.w3.org/TR/WCAG22/

Dependencies and security:
- https://docs.astro.build/en/guides/upgrade-to/v7/
- https://github.com/withastro/astro/blob/main/packages/astro/CHANGELOG.md
- https://github.com/CloudCannon/pagefind/releases
- https://github.com/markedjs/marked/releases
- https://github.com/apostrophecms/sanitize-html/releases
- https://github.com/shikijs/shiki/releases
- https://github.com/microsoft/playwright/releases
- https://github.com/advisories/GHSA-jrpj-wcv7-9fh9

## Open Questions
None.
