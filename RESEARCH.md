# Research - sysadmindoc.github.io

## Executive Summary

`sysadmindoc.github.io` v0.20.2 is a static Astro 6 portfolio, evidence catalog, search surface, screenshot gallery, resume, and public endpoint set for SysAdminDoc. Verified: the strongest current shape is not template breadth; it is a privacy-preserving, locally audited proof system with Pagefind search, strict CSP, screenshot provenance, service-worker offline support, generated GitHub/catalog data, and no remote CI/CD workflows. The highest-value direction is runtime trust and maintainability: make PWA update/offline behavior sitewide, harden service-worker installation, remove orphaned terminal runtime left after homepage simplification, add WCAG 2.2 target-size regression gates, expose build identity in public status checks, and add a local dependency freshness report now that updates are intentionally manual.

## Product Map

- Core workflows: scan the homepage proof hierarchy, browse live app screenshots, search/facet the catalog, open project detail pages with README/release evidence, view resume/uses/status/timeline/archive pages, install/use the PWA, and consume JSON/RSS/Atom/sitemap/LLM endpoints.
- User personas: hiring reviewers validating real project evidence; collaborators checking source/release history; users finding launchable tools; the site owner protecting privacy boundaries while keeping public data fresh.
- Platforms and distribution: Astro 6 static output on GitHub Pages, Node >=24 local build/audit runtime, browser-only JavaScript, Pagefind static search, service worker offline shell, no backend/database/accounts/analytics.
- Key integrations and data flows: GitHub/profile feed data flows into generated catalog caches; `marked`, `sanitize-html`, and Shiki render README evidence; Satori/resvg generate OG images; screenshot scripts write tracked public previews and provenance; local Playwright/node audits validate accessibility, CSP, endpoints, feeds, schema, DOM, bundle size, screenshots, and live smoke.

## Competitive Landscape

- AstroPaper: Does lightweight Astro content, Pagefind search, tags, and dark/light theming well. Learn from its constrained template ergonomics and documented accessibility posture. Avoid becoming a generic blog template; this site's project-evidence model is more distinctive.
- Once UI Magic Portfolio: Does config-driven portfolio sections, generated OG imagery, and protected-page options well. Learn from schema-driven content toggles and consistent visual primitives. Avoid adopting a heavy design-system layer that would dilute the existing local audit surface.
- Astrofy and GitProfile: Do fast GitHub-profile-based setup and theme customization well. Learn from low-friction data-driven onboarding. Avoid theme-gallery sprawl; SysAdminDoc benefits from one opinionated, audited identity.
- lowlighter/metrics: Does repeatable GitHub data collection and plugin-style artifact generation well. Learn from deterministic refresh outputs. Avoid badge-wall presentation; evidence pages and case-study records are higher signal.
- Pagefind and static-search peers: Validate the no-backend search choice. Learn from filter metadata, static bundles, and degraded/no-JS fallbacks. Avoid hosted/vector search until there is a real private corpus problem.
- Framer and Webflow: Commercial platforms sell CMS, staging, SEO tooling, forms, analytics, and team workflows. Learn from preview/status/SEO polish and screenshot-rich presentation. Avoid hosted analytics, forms, and collaboration features that conflict with the static privacy model.
- read.cv, Peerlist, Contra, and JSON Resume: Emphasize proof-of-work, resume export, social proof, and structured career profiles. Learn from concise case-study framing and portable resume data. Avoid social-network, messaging, or marketplace mechanics.
- PWA Builder and web-platform guidance: Emphasize manifest screenshots, robust install/update flows, and service-worker lifecycle clarity. Learn from install/update resilience. Avoid native mobile forks while the PWA remains the right mobile surface.

## Security, Privacy, and Reliability

- Verified: `npm audit --omit=dev --audit-level=high` from `Z:\sysadmindoc.github.io` on 2026-06-30 reported 0 vulnerabilities across 515 dependencies.
- Verified: `src/layouts/Base.astro` loads `/scripts/main.js` only on the homepage, while the service-worker registration/update toast lives in `public/scripts/main.js`. Direct visits to `/search/`, `/projects/.../`, or `/status/` therefore do not register the PWA or surface update recovery until the user later visits `/`.
- Verified: `public/sw.js` installs with `cache.addAll(PRECACHE)`. MDN documents `Cache.addAll()` as rejecting when any request fails, so one bad precache URL can fail the whole install.
- Verified: `public/sw.js` does not use `registration.navigationPreload`; MDN/web.dev recommend navigation preload to reduce service-worker startup latency for navigations.
- Verified: strict CSP is already strong, including self-hosted scripts and hashed style surfaces. Trusted Types remains a blocked hardening candidate until `innerHTML` renderers in `public/scripts/cmdk.js`, `public/scripts/main.js`, `public/scripts/shot-viewer.js`, and `public/scripts/theme-toggle.js` are wrapped or rewritten.
- Verified: GitHub Pages prevents custom security headers such as `Permissions-Policy`; there is no reliable meta-equivalent for that header. Keep that item blocked unless hosting changes.
- Verified: no runtime tracking, comment system, hosted form, or user account surface exists. That privacy posture is a competitive advantage and should remain a constraint.

## Architecture Assessment

- Runtime boundary: service-worker registration belongs in a small sitewide script or shared runtime, not in homepage-only `main.js`.
- Dead UI code: `public/scripts/main.js` still contains the interactive `heroTerm` terminal implementation, `src/styles/global.css`/`src/styles/critical.css` still contain `.hero-terminal-*` selectors, and `test/terminal-commands.test.mjs` still asserts terminal commands, but no `id="heroTerm"` or `id="termBody"` exists in `src/`.
- Service worker: navigation fetches are stale-while-revalidate and offline-aware, but install is all-or-nothing and no test simulates a failed precache entry.
- Accessibility: static and Playwright axe audits are strong, but there is no WCAG 2.2 2.5.8 target-size gate; `scripts/audit-a11y.mjs` intentionally checks only static rules that can be detected without a browser.
- Observability: `src/pages/status.json.ts` exposes version, generated time, catalog counts, profile-feed source, stars, and README counts; it does not expose git commit/build identity, so `scripts/smoke-live-site.mjs` cannot prove the live site is serving the exact pushed commit.
- Upgrade strategy: `npm outdated` shows Astro 7.0.3 is available while the repo remains on Astro 6.4.8; Vite 8.1.0 and Shiki 4.3.0 are available by registry. Because dependency bots and remote workflows are intentionally absent, a local freshness/advisory report is the right guardrail.
- Test and docs gaps: add direct-interior-page PWA lifecycle coverage, failed-precache simulation, target-size browser checks, and status commit verification. Current docs are sufficient once stale `RESEARCH.md` claims are replaced.

## Rejected Ideas

- Hosted analytics/RUM dashboards (Framer/Webflow/marketing-site pattern): rejected because the site deliberately avoids runtime tracking; local and live smoke audits cover quality without visitor surveillance.
- CMS, team editing, hosted forms, comments, guestbooks, or accounts: rejected because there is no multi-author workflow, backend, moderation model, or user-data need.
- Full i18n/l10n: rejected until there is a maintained multilingual source corpus; translating one personal evidence site would create drift without proven audience value.
- Plugin ecosystem or multi-user authoring: rejected as product mismatch; this is an owner-maintained static evidence site, not a platform.
- Native mobile app: rejected because the PWA already covers mobile install/offline needs with less distribution burden.
- Hosted/vector/semantic search: rejected because Pagefind fits the static/no-backend model and avoids private-query handling.
- Password-protected pages: rejected because the public portfolio should not imply hidden hiring evidence.
- Badge-wall GitHub metric pages: rejected because project pages, screenshots, releases, and proof records are more credible than dense badge widgets.
- Immediate Astro 7 migration: rejected until blocked upgrade checks in `Roadmap_Blocked.md` clear and Astro/Pagefind/TypeScript compatibility is validated locally.
- Immediate Trusted Types enforcement: rejected until current `innerHTML` renderers are policy-wrapped or rewritten; enforcing first would risk breaking audited UI.

## Sources

Direct OSS competitors and analogs:
- https://github.com/satnaing/astro-paper
- https://github.com/once-ui-system/magic-portfolio
- https://github.com/manuelernestog/astrofy
- https://github.com/arifszn/gitprofile
- https://github.com/lowlighter/metrics
- https://github.com/jktrn/astro-erudite
- https://github.com/chronark/chronark.com
- https://github.com/jsonresume/resume-cli

Commercial and adjacent products:
- https://www.framer.com/pricing
- https://webflow.com/pricing
- https://read.cv
- https://peerlist.io
- https://contra.com
- https://jsonresume.org
- https://www.pwabuilder.com/

Standards, platform, and dependencies:
- https://pagefind.app/docs/
- https://developer.mozilla.org/en-US/docs/Web/API/Cache/addAll
- https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/navigationPreload
- https://web.dev/navigation-preload/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/screenshots
- https://developer.mozilla.org/en-US/docs/Web/Manifest/Reference/launch_handler
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/trusted-types
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
- https://www.w3.org/TR/WCAG22/
- https://docs.astro.build/en/guides/upgrade-to/v7/

Community and discovery:
- https://news.ycombinator.com/item?id=32113545
- https://github.com/one-aalam/awesome-portfolio-websites
- https://github.com/withastro/astro/blob/main/CHANGELOG.md

## Open Questions

None.
