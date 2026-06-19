# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.18.6
Last normalized: 2026-06-19

## Research-Driven Additions

- [ ] P1 - Add an accessible screenshot viewer for project evidence
  Why: Live screenshots are currently static previews or links out to deployed apps; best image viewers make inspection fast with keyboard navigation, zoom, captions, and clear metadata.
  Evidence: `src/pages/projects/[slug].astro`, `src/components/LiveCard.astro`, `public/screenshots/`; PhotoSwipe, ImageGlass, XnView MP, Cogapp image-viewer accessibility guidance.
  Touches: `src/pages/projects/[slug].astro`, `src/components/LiveCard.astro`, `src/layouts/Base.astro`, `public/scripts/`, `src/styles/global.css`, `tests/playwright/interaction-smoke.spec.mjs`.
  Acceptance: Screenshot thumbnails and project previews open a native-dialog viewer with focus trap, Escape close, keyboard previous/next, fit/100% zoom, accessible caption/alt text, "open live" and "open source" actions, reduced-motion-safe transitions, and Playwright coverage for keyboard and mobile behavior.
  Complexity: M

- [ ] P2 - Add a visual evidence gallery route
  Why: The portfolio has 22 live-app screenshots but no dedicated way to scan, filter, and compare visual proof across the catalog.
  Evidence: `src/data/projects.ts`, `public/screenshots/`, `src/assets/screenshots/thumbs/`, `scripts/audit-live-apps.mjs`; XnView MP/FastStone contact-sheet workflows; Framer/Webflow portfolio gallery patterns.
  Touches: `src/pages/screenshots.astro`, `src/data/projects.ts`, `src/components/LiveCard.astro`, `src/pages/cmdk-data.js.ts`, `src/pages/llms.txt.ts`, `scripts/audit-public-endpoints.mjs`, `scripts/audit-search-index.mjs`, `scripts/audit-sitemap.mjs`.
  Acceptance: `/screenshots/` renders a responsive visual index with category/status filters, search, screenshot age/live-health badges, no-JS links to project pages, Pagefind metadata, command-palette entry, sitemap coverage, and mobile/desktop Playwright smoke coverage.
  Complexity: M

- [ ] P2 - Add a service-worker lifecycle browser smoke test
  Why: Static tests validate offline assets, but the main Playwright audit blocks service workers and does not verify installed offline fallback or update-prompt behavior in a browser.
  Evidence: `public/sw.js`; `public/offline.html`; `test/offline-fallback.test.mjs`; `playwright.audits.config.mjs`.
  Touches: `tests/playwright/`, `public/sw.js`, `public/scripts/main.js`, `package.json`, `.github/workflows/ci.yml`.
  Acceptance: A SW-enabled Playwright test installs the service worker, confirms offline navigation reaches `/offline.html`, simulates a waiting worker/update prompt path, and verifies no console errors or reload loops.
  Complexity: M

- [ ] P2 - Add screenshot capture provenance metadata
  Why: Current screenshot freshness relies on file timestamps; premium image managers and docs tools expose durable image metadata so viewers, audits, and public endpoints can explain when and how an image was captured.
  Evidence: `scripts/capture-screenshots.mjs`, `scripts/audit-image-pipeline.mjs`, `scripts/audit-live-apps.mjs`, `src/pages/projects.json.ts`; PhotoSwipe dimension requirements; ImageGlass/XnView metadata panels.
  Touches: `scripts/capture-screenshots.mjs`, `scripts/audit-image-pipeline.mjs`, `scripts/audit-live-apps.mjs`, `src/data/types.ts`, `src/pages/projects.json.ts`, `src/pages/releases.json.ts`, `test/`.
  Acceptance: Screenshot capture writes a tracked manifest with slug, URL, capture timestamp, viewport, color scheme, dimensions, bytes, hash, and capture result; audits validate manifest/image parity; public JSON exposes safe provenance fields; the screenshot viewer and gallery display captured-at and viewport metadata.
  Complexity: M

- [ ] P2 - Generate SBOM and Pages artifact provenance
  Why: The deploy pipeline has strong dependency and action pinning, but the built Pages artifact has no emitted SBOM or GitHub artifact attestation for provenance.
  Evidence: `.github/workflows/deploy.yml`; `.github/workflows/ci.yml`; GitHub Artifact Attestations documentation.
  Touches: `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`, `package.json`, `README.md`.
  Acceptance: CI/deploy emits an npm SBOM or equivalent dependency inventory for the built artifact, creates a GitHub artifact attestation for the Pages upload, uploads both as artifacts, and documents the verification command.
  Complexity: M

- [ ] P2 - Normalize weekly quality-gate issue summaries
  Why: Scheduled failure issues currently paste long log tails, making the first actionable failure harder to identify.
  Evidence: `.github/workflows/quality-gates.yml`; `scripts/summarize-generated-data.mjs`; `scripts/summarize-performance-audit.mjs`.
  Touches: `.github/workflows/quality-gates.yml`, `scripts/`, `.github/workflows/ci.yml`.
  Acceptance: The quality-gate issue starts with a compact table of failing checks, exit codes, artifact names, and exact local reproduction commands, then links or collapses raw logs.
  Complexity: S

- [ ] P2 - Add a public portfolio health page and endpoint
  Why: Comparable docs and publishing platforms surface operational confidence clearly; this site already computes data freshness, live-app health, screenshot age, build version, and search/feed contracts but scatters them across CI logs.
  Evidence: `scripts/summarize-generated-data.mjs`, `scripts/audit-live-apps.mjs`, `scripts/smoke-live-site.mjs`, `.github/workflows/quality-gates.yml`; ReadMe, GitBook, Webflow, and Framer publishing/status patterns.
  Touches: `src/pages/status.astro`, `src/pages/status.json.ts`, `src/pages/cmdk-data.js.ts`, `src/pages/llms.txt.ts`, `scripts/audit-public-endpoints.mjs`, `scripts/audit-sitemap.mjs`, `.github/workflows/deploy.yml`.
  Acceptance: `/status/` and `/status.json` show deploy version, generated-data freshness, profile-feed source, live-app health summary, screenshot freshness, search/feed/sitemap contract status, and last successful verification time without exposing secrets or private repo names.
  Complexity: M

- [ ] P3 - Add screenshot viewer deep links and share targets
  Why: Mature viewers make a specific image state shareable; project reviewers should be able to link directly to a screenshot, zoom state, or gallery item without losing context.
  Evidence: `src/pages/projects/[slug].astro`, `public/scripts/project-page.js`, `src/pages/projects.json.ts`; PhotoSwipe hash/deep-link patterns; OpenSeadragon viewport-state conventions.
  Touches: `public/scripts/`, `src/pages/projects/[slug].astro`, `src/pages/screenshots.astro`, `src/pages/projects.json.ts`, `tests/playwright/interaction-smoke.spec.mjs`.
  Acceptance: Viewer URLs support stable `?shot=<slug>` or hash links, restore selected image and fit/zoom mode on load, copy a share URL through the existing share status pattern, and degrade to the project page when JavaScript is unavailable.
  Complexity: S

- [ ] P3 - Decide whether Node 24 can become the primary CI runtime
  Why: CI runs Node 22 as primary and Node 24 as non-blocking canary even though Node 24 is active LTS; runtime drift should be either promoted or explicitly deferred.
  Evidence: `.github/workflows/ci.yml`; `.github/workflows/deploy.yml`; `package.json` engines.
  Touches: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/data-refresh.yml`, `.github/workflows/quality-gates.yml`, `package.json`, `README.md`.
  Acceptance: A recorded trial runs the full Node 24 build, tests, browser audits, and deploy-equivalent checks; if green, workflows and docs promote Node 24, otherwise the canary failure reason stays actionable.
  Complexity: S
