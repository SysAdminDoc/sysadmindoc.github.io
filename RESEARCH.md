# Research — sysadmindoc.github.io

## Executive Summary
Verified: `sysadmindoc.github.io` is a static Astro 6 portfolio and project catalog for Matt Parker/SysAdminDoc, published to GitHub Pages with generated GitHub metadata, source-backed project evidence, remote README rendering, Pagefind search, strict CSP/public-source audits, schema/feed/search/sitemap checks, PWA/offline support, and Playwright-based rendered audits. Its strongest current shape is trustable static evidence: compared with portfolio templates, GitHub-profile generators, and commercial builders, this repo already treats public routes, generated data, privacy, accessibility, and search as audited product surfaces. Highest-value direction: keep those quality gates true and readable while reducing stale/partial data ambiguity. Top opportunities: make the CSS bundle budget pass and become enforceable; make generated-data freshness/coverage impossible to misread; expose route-scope filtering in Pagefind; report proof coverage before writing more case studies; rehearse Playwright 1.61 only after interaction smoke remains stable; rehearse Sharp 0.35 and TypeScript 6 in isolated upgrade slices.

## Product Map
- Core workflows: browse homepage proof, Greatest Hits, project catalog filters, project detail pages, README excerpts, language lanes, releases, timeline, archive decisions, search, command palette, installable/offline PWA fallback, and public machine-readable endpoints.
- User personas: hiring/recruiting readers validating impact, technical collaborators inspecting source/readme evidence, open-source users looking for install paths, and the site owner maintaining public/private boundaries.
- Platforms and distribution: static Astro output deployed by GitHub Actions to GitHub Pages; Node `>=22`; browser-only client scripts; no server runtime, database, analytics backend, hosted CMS, or form handling.
- Key integrations and data flows: GitHub API/profile-feed fixtures populate generated caches; Astro renders static pages; `marked`, `sanitize-html`, and Shiki render remote README content; Pagefind indexes `dist`; audit scripts validate public endpoints, search index, schema, feeds, sitemap, DOM size, CSP, assets, images, accessibility, forced colors, and live deployment.

## Competitive Landscape
- Astro Nano, Astro Micro, and Astro Erudite: lightweight Astro personal-site/blog templates with native CSS, search/comment options, Shiki, and recent Astro 6 compatibility work. Learn from their low-dependency static posture and scoped styling. Avoid replacing the custom README renderer unless sanitizer, link-rewrite, heading, and evidence contracts survive.
- Astrofy and Astro portfolio templates: polished portfolio/blog/CV/project templates with strong first-impression hierarchy and responsive presentation. Learn from their fast scan and section clarity. Avoid becoming a generic theme; this repo's advantage is verified project evidence.
- GitProfile and DevB.io: dynamic or AI-assisted portfolios generated from GitHub activity. Learn that low-maintenance GitHub-derived content and structured sharing matter. Avoid runtime AI-written claims or live widgets that bypass local validation and public/private suppression rules.
- lowlighter/metrics and GitHub Profile README template collections: rich GitHub evidence surfaces and repeatable README patterns. Learn that generated proof can be compelling when provenance is explicit. Avoid image-only metric walls, badge sprawl, and unsearchable proof.
- Pagefind and `astro-pagefind`: privacy-preserving static search with metadata, filtering, and localized UI patterns. Learn from metadata filters and search-state hardening. Avoid hosted search until there is a clear requirement that Pagefind cannot meet.
- Framer, Webflow, Squarespace, and Wix: commercial builders sell CMS, localization, forms, analytics, collaboration, preview, and polished publishing confidence. Learn from state clarity and editing/publishing guardrails. Avoid CMS/team/localization complexity without a content team, privacy model, or multilingual source corpus.
- ReadMe.com: adjacent documentation product with reusable content, GitHub sync, docs metrics, linting, branches, and AI-assisted workflows. Learn from its docs-as-product quality gates. Avoid SaaS documentation complexity for a personal static portfolio.

## Security, Privacy, and Reliability
- Verified: `rtk npm audit --json` reports 0 vulnerabilities across production and development dependencies on 2026-06-18.
- Verified: `rtk npm run bundle:audit` fails because `dist/_assets/global.BRKX-7AH.css` is 152.9 KB against the 120 KB per-file CSS budget in `scripts/audit-bundle-size.mjs`; JS totals remain within budget. Missing guardrail: the main build path can pass while this budget fails.
- Verified: `rtk npm run data:summary` exits 0 but reports `attention-required`: generated data is 343.69 hours old against a 36-hour freshness limit, while star/meta/README coverage is only 16/182 profile-feed projects. Missing guardrail: partial fixture/cache mode can look like authoritative production data.
- Verified: `rtk npm run semantic:audit` exits 0 but reports README corpus coverage of 8.7% (16/183). Recovery need: strict semantic/ranking reports should refuse low-coverage generated caches or clearly label fixture mode.
- Verified: `scripts/fetch-stars.mjs` fetches GitHub repo, release, event, and README data but does not use documented GitHub conditional requests/ETags. This increases rate-limit pressure and makes refresh recovery more brittle than necessary.
- Verified: `src/layouts/Base.astro` ships a strict CSP meta policy and self-hosted scripts; `test/readme-rendering.test.mjs` already contains adversarial sanitizer fixtures. Do not add duplicate sanitizer or CSP hardening work without a concrete failing case.
- Verified: `public/manifest.json` has icons, shortcuts, and launch handling but no screenshots; this is already blocked in `Roadmap_Blocked.md` because it requires screenshot capture dimensions, so it is intentionally not duplicated in the active roadmap.

## Architecture Assessment
- `src/styles/global.css` has accumulated enough shared styling to breach the repo's own per-file CSS budget. Refactor candidate: move page-specific blocks into Astro scoped styles or split intentional route/component bundles before raising the budget.
- `scripts/summarize-generated-data.mjs`, `scripts/audit-semantic-index.mjs`, and `scripts/fetch-stars.mjs` need one clearer contract for generated-data states: production-fresh, stale, partial fixture, unauthenticated fallback, and strict-fail modes.
- `src/pages/search.astro`, route metadata in page templates, `scripts/audit-search-index.mjs`, and Playwright interaction coverage remain the correct boundary for Pagefind route-scope filtering. Hosted search is not justified.
- `scripts/validate-project-data.mjs` enforces proof shape for existing records and Greatest Hits, but there is still no concise coverage report for recommended/live projects missing proof. Reporting should precede new case-study authoring because expanded proof content is human-judgment work.
- `package.json` needs separate upgrade lanes: patch dependency updates can stay routine, but Playwright 1.61, Sharp 0.35, and TypeScript 6 should each be rehearsed against the repo's custom browser, image, type, and audit scripts.
- Testing and documentation gaps are targeted, not systemic: bundle budget enforcement, strict generated-data labeling, semantic low-coverage failure behavior, route-scope search states, proof coverage reporting, and isolated major dependency rehearsals.

## Rejected Ideas
- Runtime AI portfolio summaries from DevB.io-style tools — rejected because portfolio claims must remain conservative, source-backed, and locally auditable.
- Framer/Webflow-style CMS, team editing, hosted forms, analytics, and localization — rejected because the site is a personal static portfolio with no content team, privacy model, or multilingual source corpus.
- Widget-heavy GitHub metrics walls from lowlighter/metrics — rejected because searchable project pages and proof records are more credible than image-only badge sprawl.
- Hosted search — rejected because Pagefind matches the no-backend privacy model and already supports metadata/filtering needed for the active search roadmap.
- Public notes/TIL feed — rejected until the existing notes-feed policy has a reviewed corpus and activation criteria.
- Immediate Astro 7 migration — rejected because it is already blocked pending stable release and compatibility review.
- Manifest screenshots as active work — rejected from this pass because `Roadmap_Blocked.md` already tracks the screenshot-capture prerequisite.
- New plugin ecosystem or multi-user authoring — rejected as a product mismatch for a static personal portfolio.

## Sources
Direct OSS competitors and analogs:
- https://github.com/markhorn-dev/astro-nano
- https://github.com/trevortylerlee/astro-micro
- https://github.com/jktrn/astro-erudite
- https://github.com/manuelernestog/astrofy
- https://github.com/arifszn/gitprofile
- https://github.com/lowlighter/metrics
- https://github.com/sunithvs/devb.io
- https://github.com/shishkin/astro-pagefind

Commercial and adjacent products:
- https://www.framer.com/cms/
- https://webflow.com/pricing
- https://www.squarespace.com/pricing
- https://www.wix.com/plans
- https://readme.com/pricing

Standards, dependencies, security, and performance:
- https://pagefind.app/docs/
- https://pagefind.app/docs/metadata/
- https://pagefind.app/docs/filtering/
- https://pagefind.app/docs/js-api-filtering/
- https://docs.astro.build/en/guides/styling/
- https://astro.build/blog/astro-640/
- https://playwright.dev/docs/release-notes
- https://github.com/lovell/sharp/releases
- https://docs.github.com/rest/guides/best-practices-for-using-the-rest-api
- https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/customize-dependency-review-action
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/screenshots
- https://developer.chrome.com/docs/lighthouse/performance/unused-css-rules
- https://web.dev/articles/defer-non-critical-css

Community and hiring signal:
- https://github.com/orgs/community/discussions/169760
- https://github.com/orgs/community/discussions/194180
- https://dev.to/kethmars/what-i-learned-after-reviewing-over-40-developer-portfolios-9-tips-for-a-better-portfolio-4me7
- https://news.ycombinator.com/item?id=14420802

## Open Questions
None that block prioritization or implementation.
