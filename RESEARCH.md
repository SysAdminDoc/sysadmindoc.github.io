# Research — sysadmindoc.github.io

Date: 2026-07-21 — replaces all prior research.

## Executive Summary

[Verified] `sysadmindoc.github.io` v0.22.0 is a static Astro 7 portfolio/PWA that turns a reviewed GitHub catalog into hiring proof, live-app links, search, releases, machine feeds, and resume exports. Its strongest shape is privacy-first evidence with unusually strong local build, CSP, accessibility, screenshot, and Pages-publishing gates. The highest-value direction is to restore trust in those gates and finish the Operational Clarity migration across every public surface; adding more portfolio-template features would dilute the product.

Top opportunities, in priority order:

1. Remove the live Astro, SVGO, and `fast-uri` advisory findings.
2. Make publish readiness cover fresh generated data, exact catalog membership, live-app health, and featured-download provenance.
3. Replace the stale OG image, app icons, install screenshots, manifest colors, and offline presentation with current reviewed assets.
4. Fix mobile navigation when JavaScript is disabled.
5. Bind every service-worker background cache write to the fetch-event lifetime.
6. Make the dark Playwright lane actually load and assert dark theme.
7. Centralize public role, version, theme, and count facts so `/now/`, `/uses/`, docs, and generated media cannot drift independently.
8. Validate the resume JSON against JSON Resume and verify PDF reading order/text extraction.
9. Expand first-install offline coverage and state-based visual/accessibility testing.

## Product Map

- [Verified] Core workflows: scan selected work and live evidence; filter/sort the 190-entry reviewed catalog; search indexed pages with Pagefind; inspect releases, timeline, screenshots, status, language lanes, and archive decisions; download HTML/JSON/PDF resume forms.
- [Verified] User personas: hiring reviewers with short attention windows, technical peers validating source and release evidence, mobile/offline visitors, crawlers consuming feeds and machine endpoints, and the maintainer running local release gates.
- [Verified] Platforms and distribution: static Astro output on GitHub Pages, installable PWA, Node 24+ Windows-first local tooling, Chromium/Playwright QA, direct GitHub project links, no runtime backend, accounts, or hosted analytics.
- [Verified] Key data flow: ignored GitHub/profile caches → `src/data/portfolio.ts` reviewed intersection and local fallbacks → Astro pages/JSON/RSS/Atom/LLM endpoints → Pagefind index and stamped service worker → locally verified `gh-pages` publication.

## Competitive Landscape

- [Verified] **AstroPaper** does Astro-native search, RSS/sitemap, generated OG media, typed content, themes, and accessibility well. Learn its small, testable content boundaries; avoid importing blog/MDX, lightbox, callout, or email-obfuscation features without a corpus or spam problem.
- [Verified] **Accessible Astro Starter** provides strong semantic, contrast, reduced-motion, skip-link, and manual-check patterns. Learn its explicit accessibility contract; avoid adding preference panels or an accessibility statement as substitutes for testing actual states.
- [Verified] **GitProfile** proves GitHub-derived portfolios can remain configurable and Pages-friendly. Learn its source-driven generation and base-path discipline; avoid becoming a multi-user generator, theme gallery, or hosted-workflow product.
- [Verified] **minimalist-portfolio-json** demonstrates one JSON Resume-compatible source for web and print output. Learn its cross-output contract; avoid replacing this repo's existing Astro resume UI with another theme.
- [Verified] **Peerlist** frames projects as ordered proof with role, context, tools, outcome, and source. Learn the evidence hierarchy for selected work; avoid feeds, verification accounts, discussions, jobs, or network mechanics. A related proof-expansion item already exists in `Roadmap_Blocked.md` and must not be duplicated.
- [Verified] **Carrd** paywalls canonical metadata, share images, icons, local fonts, redirects, and static export, confirming that polished external metadata is table-stakes. Learn to version and validate those assets; avoid forms, payments, embeds, and analytics hooks.
- [Verified] **Webflow** monetizes CMS scale, localization, faster search indexing, page branching, targeted publishing, and behavioral analytics. Learn previewable, explicit publishing and search validation; avoid CMS, A/B, conversion, and behavioral-tracking surfaces.
- [Verified] **Framer** treats CMS relationships, localization/RTL/`hreflang`, and cookieless analytics as product layers. Learn structured relationships and localization readiness; avoid locale machinery or analytics until authored translations or a decision need exists.

## Security, Privacy, and Reliability

- [Verified] `npm run deps:audit` fails on `svgo@4.0.1` (high; fixed in 4.0.2). Full `npm audit` additionally finds `astro@7.0.6` (moderate; fixed in 7.1.0) and `fast-uri@3.1.2` through two high advisories (the complete fix is 3.1.4). `package.json` already permits patched Astro and transitive versions.
- [Verified] `npm run data:summary:deploy` fails because cached GitHub data is 154.56 hours old against a 36-hour limit. It also reports four unsigned featured ClearCut releases while printing `Featured release provenance required: no`; `package.json` does not pass the existing `--fail-on-unsigned-featured-releases` option.
- [Verified] `npm run catalog:audit` finds four active non-forks absent from review policy and eight catalog references no longer present as active public repositories. `npm run liveapps:audit` separately finds `ImageForge` returning HTTP 404. The publish preflight runs the catalog audit but not live-app health.
- [Verified] `public/sw.js:81-102`, `:137-145`, and `:149-160` start cache writes that are not awaited by the response path or attached with `FetchEvent.waitUntil()`. Browsers may terminate those writes after a cached response is returned.
- [Verified] `src/pages/index.astro:642` loads YouTube thumbnails before consent/click, and `Base.astro:54,145` permits and prefetches that third party. Cross-origin images disclose the visitor IP and referrer and may send existing third-party cookies.
- [Verified] `public/scripts/service-worker.js:40-48` does not remember “Not now,” so a waiting worker reopens the update toast on the next page. `public/scripts/home-github.js:302-329` can leave live status at “checking” indefinitely when offline.
- [Verified] `npm audit signatures` currently verifies registry signatures for 319 packages and attestations for 82. Preserve that result as a local publish-time supply-chain check; do not add code signing.
- [Verified] Permissions-Policy and Trusted Types already exist in `Roadmap_Blocked.md`; do not create duplicate active items. Its Trusted Types rationale is stale because current browser scripts have no runtime HTML sinks and the CSP audit reports trial readiness.

## Architecture Assessment

- [Verified] Public brand artifacts have no common release contract. `public/og.png`, `public/favicon.svg`, PNG icons, `public/manifest.json`, install screenshots, and `public/offline.html`/`styles/offline.css` still encode the retired terminal/dark identity, outdated counts, and removed claims; current tests mostly validate presence and dimensions.
- [Verified] Public facts are split across `src/pages/index.astro`, `src/data/curated.ts`, `src/data/uses.ts`, `src/data/page-freshness.ts`, docs, manifest media, and static OG copy. This produces v0.21/v0.22, dark-first/light-first, and 183/186-project contradictions.
- [Verified] `.nvmrc` pins Node 22 while `package.json` and repo docs require Node 24+. `package.json` has no `packageManager` pin, despite a local-only release process whose reproducibility depends on Node/npm behavior.
- [Verified] The “chromium” audit project emulates `prefers-color-scheme: dark`, but `public/scripts/theme-toggle.js` defaults unsaved sessions to light and the test never seeds a dark preference. Twenty-six of 48 light/dark baseline pairs are byte-identical; the dark lane is false coverage.
- [Verified] At widths ≤1080px, `critical.css`/`global.css` hide navigation links and show a JavaScript-only menu button. `Base.astro`'s `<noscript>` block does not restore the links, and static theme labels claim a light theme switch while markup starts light.
- [Verified] The service-worker precache in `scripts/stamp-sw.mjs:64-81` covers home, offline, search, releases, and now, but not the generated public route inventory. Tests prove opportunistically cached pages, not deterministic first-install offline access across key routes.
- [Verified] `src/pages/resume.json.ts` declares JSON Resume 1.0.0 while `src/data/career.ts` stores employment dates only in display strings. There is no official schema validation or PDF text/reading-order assertion.
- [Verified] The built homepage is about 400 KB and 2,254 catalog DOM nodes, above Chrome's historical 1,400-node excessive-DOM threshold. Preserve direct links, no-JS access, and SEO through static pagination or an equivalent measured boundary rather than client-only virtualization.
- [Verified] Playwright captures only the first viewport of major routes and omits 404, offline, most language lanes, open menus, catalog no-result/sort/view combinations, command failures, timeline empty, update, print, and offline-recovery states.
- [Likely] `global.css`/`critical.css` token roots and their documentation have drifted, but the existing blocked CSS split covers the remediation path. Refresh that blocked item's evidence before execution instead of adding another roadmap row.
- [Needs live validation] Current Pagefind excerpts appear repetitive for broad language queries. Build a frozen query/expected-result corpus before changing weights or sub-result presentation.

## Rejected Ideas

- [Verified] Hosted analytics, A/B testing, conversion overlays, forms, CRM, and behavioral replay from Webflow/Framer/Contra: no decision need justifies violating the no-tracking, backend-free model.
- [Verified] CMS, blog scaffolding, local project-detail pages, and multi-author content from Magic Portfolio/Astrofy/Squarespace: the repository deliberately removed local project pages and uses direct GitHub proof.
- [Verified] Accounts, social feeds, endorsements, messaging, payments, collaboration, and plugin marketplaces from Peerlist/Contra/GitProfile: a single-owner static portfolio has no authorization or shared-data model.
- [Verified] Full localization or machine translation from Framer/Astro i18n: no authored translated resume/project corpus exists; plumbing alone would create stale duplicate surfaces.
- [Verified] Immediate TypeScript 7 adoption: 7.0.2 is stable, but `@astrojs/check@0.9.9` still peers on TypeScript 5/6 and Astro template tooling cannot yet use the native API. Keep the existing blocked item.
- [Verified] Email XOR/JavaScript obfuscation from AstroPaper issue #622: it breaks no-JS contact access and is unsupported by current spam evidence.
- [Verified] Share-target, file-handler, protocol-handler, push, background-sync, or native-store PWA features: the portfolio has no inbound-document, queued-write, or notification workflow.
- [Verified] GitHub Actions build/deploy: local-only publication is an explicit repository decision; improve local gates rather than reversing it.
- [Verified] Client RUM SDKs or a public SBOM feature: field tracking conflicts with privacy, and the deployed static artifact contains no Node runtime. Aggregate CrUX and `npm sbom` remain optional maintainer tools, not product work.
- [Verified] Theme galleries, splash loaders, animation showcases, AI-generated portfolio copy, or tutorial-identical projects: community and competitor evidence favors fast, authentic proof over template spectacle.

## Sources

Direct OSS, commercial, and research:
- https://github.com/satnaing/astro-paper
- https://github.com/incluud/accessible-astro-starter
- https://github.com/arifszn/gitprofile
- https://github.com/midudev/minimalist-portfolio-json
- https://peerlist.io/
- https://carrd.co/docs/pro/features
- https://help.webflow.com/hc/en-us/articles/51059955082387-Updated-pricing-and-simplified-plans-for-May-2026
- https://www.framer.com/help/localization/
- https://conf.researchr.org/details/saner-2025/saner-2025-papers/47/Improving-Evidence-Based-Tech-Hiring-with-GitHub-Supported-Resume-Matching

Community signal:
- https://www.reddit.com/r/webdev/comments/1sf7jrm/what_do_hiring_managers_look_for_in_portfolio/
- https://news.ycombinator.com/item?id=41656015
- https://lobste.rs/s/b7lt29/show_your_personal_websites

Standards and platform guidance:
- https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent/waitUntil
- https://web.dev/articles/service-worker-lifecycle
- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/TR/appmanifest/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/screenshots
- https://web.dev/learn/privacy/third-parties
- https://web.dev/articles/dom-size-and-interactivity
- https://pagefind.app/docs/filtering/
- https://jsonresume.org/schema
- https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF3

Dependencies and security:
- https://astro.build/blog/astro-710/
- https://github.com/advisories/GHSA-4g3v-8h47-v7g6
- https://github.com/advisories/GHSA-2p49-hgcm-8545
- https://github.com/advisories/GHSA-4c8g-83qw-93j6
- https://github.com/advisories/GHSA-v2hh-gcrm-f6hx
- https://docs.npmjs.com/cli/v9/commands/npm-audit/
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://docs.github.com/en/actions/concepts/security/artifact-attestations

## Open Questions

- None.
