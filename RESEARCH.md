# Research - sysadmindoc.github.io

## Executive Summary
Verified: `sysadmindoc.github.io` is an Astro 6.4.8 static portfolio, GitHub-profile evidence layer, and project catalog for SysAdminDoc/Matt Parker. Its strongest current shape is not a generic portfolio theme; it is a source-backed, privacy-preserving, audited public artifact with Pagefind search, generated GitHub metadata, remote README rendering, strict CSP/public-source checks, PWA/offline behavior, machine-readable endpoints, and broad CI/deploy quality gates. Highest-value direction: keep the static/no-backend philosophy while making the remaining trust boundaries more resilient and visible. Priority opportunities: add GitHub REST conditional-request caching; audit light/system theme parity in rendered browser tests; verify service-worker lifecycle behavior in a browser; monitor live-app availability and screenshot drift; add Pages artifact provenance/SBOM output; make weekly quality issues concise and actionable; apply the Sharp 0.35.2 patch after image gates; decide when Node 24 can move from advisory to primary CI.

## Product Map
- Core workflows: browse homepage proof and Greatest Hits, search/filter the full project catalog, inspect project detail and README excerpts, use language/release/timeline/archive views, open command palette shortcuts, install/use offline fallback, and consume JSON/feed/sitemap/LLM endpoints.
- User personas: hiring/recruiting readers validating real impact; technical collaborators checking source, releases, and README evidence; open-source users looking for launchable projects; the site owner maintaining public/private boundaries.
- Platforms and distribution: Astro static output on GitHub Pages; Node `>=22`; browser-only scripts; no server runtime, database, analytics backend, hosted CMS, forms backend, or team editing workflow.
- Key integrations and data flows: GitHub API/profile feed populate generated caches; `marked`, `sanitize-html`, and Shiki render remote README excerpts; Pagefind indexes built HTML; GitHub Actions runs dependency review, generated-data refresh, build, link, accessibility, visual, CSP, schema, feed, sitemap, bundle, DOM, performance, and live smoke audits.

## Competitive Landscape
- Astro Nano, Astro Micro, Astro Erudite, Astrofy, and active Astro portfolio templates: do low-dependency static presentation, blog/CV/project sections, responsive hierarchy, search, and dark-mode ergonomics well. Learn from their lean static posture and polished scan paths. Avoid becoming a theme clone; this repo's advantage is evidence density, generated provenance, and custom public/private guardrails.
- GitProfile, DevB.io, GitHub profile README generators, and lowlighter/metrics: do GitHub-derived identity, dynamic badges, automated activity summaries, and low-maintenance public proof well. Learn from repeatable data refresh and shareable profile artifacts. Avoid image-only metric walls, badge sprawl, runtime AI-written claims, and unaudited generated copy.
- Pagefind and `astro-pagefind`: do private static search, metadata, filters, and no-backend discovery well. Learn from faceted search and metadata-rich result states. Avoid hosted search unless a concrete requirement exceeds Pagefind's static model.
- Framer, Webflow, Wix, and Squarespace: sell publishing confidence through CMS, localization, analytics, collaboration, form handling, and polished preview states. Learn from status clarity, preview confidence, and content governance. Avoid CMS/team/localization complexity without a content team, privacy model, or multilingual source corpus.
- ReadMe and GitBook: treat docs/search/provenance as product surfaces with branch previews, reusable content, AI search, OpenAPI flows, and quality instrumentation. Learn from concise operational summaries and traceable publishing state. Avoid SaaS docs complexity for a personal static portfolio.
- Docusaurus, Starlight, Nextra, and MkDocs Material: do structured docs navigation, versioning, content linting, and local-first publishing workflows well. Learn from docs-as-code guardrails. Avoid full documentation-site migration; the product is portfolio-first, not a docs portal.

## Security, Privacy, and Reliability
- Verified: `rtk npm audit --json` reports 0 vulnerabilities across production and development dependencies.
- Verified: `scripts/fetch-stars.mjs` fetches GitHub repos, releases, events, and README data without `ETag`/`If-None-Match` handling, while GitHub REST docs recommend conditional requests where appropriate. Missing guardrail: stale caches and rate-limit recovery depend on full refetches.
- Verified: `rtk npm run data:summary -- --out .tmp/research-data-summary` reported local `attention-required` because generated metadata was stale and unauthenticated/partial; deploy uses a token and strict summary, but local stale partial states remain easy to misread.
- Verified: `playwright.audits.config.mjs` runs rendered accessibility/visual coverage under `colorScheme: 'dark'` with `serviceWorkers: 'block'`; `src/styles/global.css` has extensive light-theme overrides and `public/sw.js` has update/offline behavior. Missing guardrail: light/system theme and service-worker lifecycle behavior are not exercised in the main browser audit.
- Verified: live-app screenshots are validated for presence by `scripts/audit-assets.mjs`, but no scheduled gate checks whether each external live app still responds or whether screenshots have drifted from current deployments.
- Verified: `.github/workflows/deploy.yml` uploads and deploys the Pages artifact, but no SBOM or artifact attestation is generated for the built static artifact. Supply-chain posture is strong through SHA-pinned actions, dependency review, npm audit, and Dependabot, but deploy provenance is not yet explicit.
- Verified: `.github/workflows/quality-gates.yml` opens/updates a quality issue by embedding long log tails. Recovery need: scheduled failures should summarize failing gates, exit codes, artifact names, and local reproduction commands before raw logs.

## Architecture Assessment
- Generated data: `scripts/fetch-stars.mjs`, `scripts/summarize-generated-data.mjs`, generated fixtures, and deploy/data-refresh workflows should share a clearer cache/reuse/refresh model so unauthenticated local work, token-backed deploy work, and rate-limited recoveries are distinguishable.
- Theme and accessibility: shared CSS tokens and light-theme overrides are mature, but rendered audits need explicit dark/light/system coverage instead of assuming dark-mode coverage proves all modes.
- PWA/offline: `test/offline-fallback.test.mjs` validates static offline assets and `public/sw.js` shape, but the browser suite intentionally blocks service workers. A dedicated SW-enabled audit should cover install, offline navigation fallback, waiting-worker update prompt, and reload behavior.
- Live-app evidence: `src/data/projects.ts`, `src/components/LiveCard.astro`, screenshot assets, and `scripts/capture-screenshots.mjs` are useful but need availability/staleness reporting to keep public demo claims trustworthy.
- CI observability: existing scripts already emit structured summaries for generated data and performance; the weekly quality-gate issue should reuse that pattern instead of copying raw log tails.
- Upgrade strategy: Playwright 1.61, TypeScript 6, and Sharp 0.35.1 are already shipped; npm now reports Sharp 0.35.2. CI has a non-blocking Node 24 canary, so promotion should wait for a recorded green browser and build pipeline.

## Rejected Ideas
- Runtime AI portfolio summaries from DevB.io-style tools - rejected because portfolio claims must remain conservative, source-backed, and locally auditable.
- Hosted analytics/RUM dashboards - rejected for now because the site intentionally avoids runtime tracking; lab and scheduled audits fit the privacy model better.
- Framer/Webflow-style CMS, team editing, hosted forms, and collaboration - rejected because the site is a personal static portfolio with no content team or workflow requiring SaaS editing.
- Full i18n/localization - rejected until there is a real multilingual source corpus and maintenance owner; commercial localization pricing confirms value but not fit.
- Widget-heavy GitHub metric walls - rejected because searchable project pages and proof records are more credible than image-only badge sprawl.
- Hosted search or vector/semantic search - rejected because Pagefind already matches the no-backend model and `SEMANTIC_INDEX_DECISION.md` keeps semantic analysis advisory/local.
- Public notes/TIL feed - rejected until `NOTES_FEED_POLICY.md` has a reviewed corpus and activation criteria.
- Immediate Astro 7 migration - rejected because `Roadmap_Blocked.md` already parks this until stable release.
- Active PWA manifest screenshot work - rejected from active roadmap because `Roadmap_Blocked.md` already tracks the screenshot-capture prerequisite.
- Plugin ecosystem or multi-user authoring - rejected as a product mismatch for a personal static portfolio.

## Sources
Direct OSS competitors and analogs:
- https://github.com/markhorn-dev/astro-nano
- https://github.com/trevortylerlee/astro-micro
- https://github.com/jktrn/astro-erudite
- https://github.com/manuelernestog/astrofy
- https://github.com/arifszn/gitprofile
- https://github.com/lowlighter/metrics
- https://github.com/sunithvs/devb.io
- https://github.com/rahuldkjain/github-profile-readme-generator
- https://github.com/shishkin/astro-pagefind

Commercial and adjacent products:
- https://www.framer.com/pricing
- https://webflow.com/pricing
- https://readme.com/
- https://www.gitbook.com/pricing
- https://starlight.astro.build/

Standards, dependencies, security, and performance:
- https://docs.github.com/rest/guides/best-practices-for-using-the-rest-api
- https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds
- https://docs.github.com/en/actions/concepts/security/artifact-attestations
- https://pagefind.app/docs/filtering/
- https://pagefind.app/docs/components/filter-pane/
- https://astro.build/blog/astro-640/
- https://docs.astro.build/en/reference/configuration-reference/#markdownprocessor
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/screenshots
- https://web.dev/learn/pwa/web-app-manifest
- https://playwright.dev/docs/release-notes
- https://github.com/lovell/sharp/releases
- https://github.com/markedjs/marked/releases
- https://github.com/apostrophecms/sanitize-html/releases
- https://github.com/shikijs/shiki/releases

Community and hiring signal:
- https://github.com/orgs/community/discussions/169760
- https://github.com/orgs/community/discussions/194180

## Open Questions
None that block prioritization or implementation.
