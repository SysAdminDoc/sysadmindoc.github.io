# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.24
Last normalized: 2026-06-29

## Research-Driven Additions

### P0

- [ ] P0 — Eliminate the current dependency advisories
  Why: The production dependency gate is red and the full tree contains one moderate and three high findings with patched versions available.
  Evidence: `package.json`, `package-lock.json`, GHSA-4g3v-8h47-v7g6, GHSA-2p49-hgcm-8545, GHSA-4c8g-83qw-93j6, GHSA-v2hh-gcrm-f6hx.
  Touches: `package.json`, `package-lock.json`, `scripts/audit-dependencies.mjs`, dependency-audit tests.
  Acceptance: Astro resolves to >=7.1.3, SVGO to >=4.0.2, and `fast-uri` to >=3.1.4; `npm audit`, `npm run deps:audit`, `npm test`, `npm run check`, and `npm run build` pass without advisory exceptions.
  Complexity: S

- [ ] P0 — Make publish readiness enforce current portfolio truth
  Why: The current deploy data is stale, four active repositories are unreviewed, eight catalog references are inactive, one advertised live app returns 404, and four featured downloads lack required provenance.
  Evidence: `package.json:27-30`, `scripts/summarize-generated-data.mjs`, `scripts/audit-catalog.mjs`, `scripts/audit-live-apps.mjs`, `src/data/projects.ts`; verified command failures on 2026-07-21.
  Touches: `package.json`, `src/data/projects.ts`, `src/data/catalog-policy.json`, generated `src/data/_*.json`, `scripts/summarize-generated-data.mjs`, `scripts/audit-live-apps.mjs`, preflight tests.
  Acceptance: Generated data is <=36 hours old; catalog policy resolves AIUsageTracker, Cataclysm, ForceBGTab, SurfaceMedic and the eight inactive references; ImageForge is removed/repaired; `data:summary:deploy` enables `--fail-on-unsigned-featured-releases`; `deploy:preflight` runs live-app health and fails on any recurrence.
  Complexity: M

- [ ] P0 — Complete the Operational Clarity migration across public assets
  Why: Search previews, installed-PWA chrome, icons, install screenshots, and offline recovery still show the retired terminal identity, stale counts, and removed claims.
  Evidence: `public/og.png`, `public/favicon.svg`, `public/icon-*.png`, `public/manifest.json`, `public/screenshots/install/*`, `public/offline.html`, `public/styles/offline.css`; W3C Web App Manifest screenshots guidance.
  Touches: `src/layouts/Base.astro`, `src/pages/og/[slug].png.ts`, `public/og.png`, favicon/app-icon assets, `public/manifest.json`, install screenshots, offline HTML/CSS, asset/PWA/OG tests.
  Acceptance: Every asset uses the MP/Operational Clarity system and current reviewed facts; wide/narrow install screenshots come from the current build; light-first splash colors match shell tokens; generated-card fixtures cover `constructor` and `toString`; audits fail on retired phrases, stale counts, or asset dates.
  Complexity: M

- [ ] P0 — Restore usable mobile navigation without JavaScript
  Why: At <=1080px the real links are hidden behind an inert script-only button, blocking the entire site for no-JS visitors and contradicting the catalog's advertised progressive enhancement.
  Evidence: `src/layouts/Base.astro:149-152`, `src/styles/critical.css:1394`, `src/styles/global.css:5634`, `src/components/InteriorNav.astro`, WCAG 2.2 Consistent Navigation and Keyboard criteria.
  Touches: `src/layouts/Base.astro`, `src/pages/index.astro`, `src/components/InteriorNav.astro`, `src/styles/critical.css`, `src/styles/global.css`, Playwright no-JS tests.
  Acceptance: With JavaScript disabled at 390px and 1080px, every primary route remains reachable, inert theme/search/menu controls are hidden or replaced with functional links, initial labels match the light markup, and keyboard/axe/overflow checks pass.
  Complexity: M

- [ ] P0 — Bind service-worker cache writes to fetch-event lifetime
  Why: Stale-while-revalidate and network-first cache updates can be terminated after a cached response returns, making offline freshness nondeterministic.
  Evidence: `public/sw.js:81-102`, `public/sw.js:137-160`; Service Workers `ExtendableEvent.waitUntil()` specification and MDN guidance.
  Touches: `public/sw.js`, `test/offline-fallback.test.mjs`, `tests/playwright/sw-lifecycle.spec.mjs`.
  Acceptance: Every background cache mutation is awaited by the response path or passed to `FetchEvent.waitUntil()`; delayed-write tests prove completion after an immediate cached response; navigation preload, TTL fallback, and offline behavior remain green.
  Complexity: M

### P1

- [ ] P1 — Make the dark audit lane exercise dark theme
  Why: The current dark project renders light, so its screenshots, axe assertions, and theme regressions are falsely reported as covered.
  Evidence: `playwright.audits.config.mjs:31-60`, `public/scripts/theme-toggle.js:54-61`, `tests/playwright/portfolio-audits.spec.mjs:280-308`; 26/48 light/dark baseline pairs are byte-identical.
  Touches: Playwright audit configuration/specs, theme bootstrap tests, dark/light baseline images.
  Acceptance: The dark project seeds `theme-pref=dark` before navigation and asserts the resolved theme; the light project asserts light; both run axe/layout/visual checks and a guard fails if either project resolves the wrong theme.
  Complexity: S

- [ ] P1 — Pin and verify the local release toolchain
  Why: `.nvmrc` selects Node 22 while the declared engine requires Node 24+, and npm behavior is unpinned in a local-only publishing workflow.
  Evidence: `.nvmrc`, `package.json:6-8`; npm registry-signature documentation; `npm audit signatures` verified 319 packages on 2026-07-21.
  Touches: `.nvmrc`, `package.json`, `scripts/ensure-project-cwd.mjs` or a focused toolchain audit, unit tests, deploy preflight.
  Acceptance: `.nvmrc` and `engines.node` agree on Node 24+, `packageManager` pins the validated npm 11 line, a test rejects future mismatch, and publish preflight verifies dependency registry signatures/attestations with an actionable network-failure message.
  Complexity: S

- [ ] P1 — Create one source of truth for public facts and design identity
  Why: Role, version, project counts, live-app counts, and light/dark positioning currently contradict each other across public pages and maintainer documentation.
  Evidence: `src/pages/index.astro:119-152`, `src/data/curated.ts:93`, `src/data/uses.ts:67-71`, `src/data/page-freshness.ts`, `README.md`, `CLAUDE.md`, `IMAGE_PIPELINE.md`.
  Touches: shared site metadata/tokens, homepage, `/now/`, `/uses/`, page freshness, docs, schema/OG/manifest generation, consistency tests.
  Acceptance: Public role/version/theme copy is derived or validated from one contract; catalog/profile counts are named by denominator; tests fail on v0.21 copy, dark-first copy, hardcoded stale counts, or undocumented count semantics.
  Complexity: M

- [ ] P1 — Remove pre-click third-party video requests
  Why: Privacy-enhanced iframes are click-to-load, but YouTube thumbnail images and DNS prefetch still contact Google before the visitor chooses playback.
  Evidence: `src/pages/index.astro:642`, `src/layouts/Base.astro:54,145`, `public/scripts/home-media.js`; web.dev third-party privacy guidance.
  Touches: locally authored poster assets or placeholder UI, homepage media markup, CSP, preload hints, media interaction tests.
  Acceptance: Loading or scrolling the homepage produces no YouTube/Google request; a clearly labeled user action creates only the `youtube-nocookie.com` iframe; CSP removes `img.youtube.com` and the DNS prefetch.
  Complexity: S

- [ ] P1 — Make resume exports schema-valid and reading-order tested
  Why: The JSON claims JSON Resume compatibility but omits structured work dates, while the generated PDF has no machine-readable order check.
  Evidence: `src/pages/resume.json.ts`, `src/data/career.ts`, `scripts/generate-resume-pdf.mjs`; JSON Resume schema; WCAG PDF3.
  Touches: `src/data/career.ts`, resume HTML/JSON/PDF generators, schema validation and PDF text-extraction tests.
  Acceptance: Work and education records expose ISO `startDate`/`endDate`; the JSON validates against the documented JSON Resume version; HTML/JSON/PDF share the same career source; extracted PDF text contains headings and roles in logical order.
  Complexity: M

- [ ] P1 — Guarantee first-install offline access to the public route set
  Why: Only home, search, releases, and now are deterministic shell routes; other key pages work offline only after a prior online visit.
  Evidence: `scripts/stamp-sw.mjs:64-81`, `tests/playwright/sw-lifecycle.spec.mjs`; web.dev service-worker lifecycle/offline guidance.
  Touches: route inventory, `scripts/stamp-sw.mjs`, `public/sw.js`, service-worker unit and Playwright tests, cache-size audit.
  Acceptance: A fresh service-worker install can open resume, status, timeline, screenshots, healthcare, archive, 404/offline, and one representative language lane while offline; the route list is generated from reviewed public routes and stays within an explicit cache budget.
  Complexity: M

- [ ] P1 — Make update and live-status recovery states truthful
  Why: “Not now” immediately returns on the next page for the same waiting worker, and offline live-app status can remain stuck at “checking.”
  Evidence: `public/scripts/service-worker.js:40-48`, `public/scripts/home-github.js:302-329`.
  Touches: service-worker registration UI, homepage GitHub status logic, interaction and SW lifecycle tests.
  Acceptance: Dismissal is remembered per waiting worker for the session, a newer worker can prompt again, offline state reads “unavailable offline,” and the status retries and resolves on the `online` event.
  Complexity: S

### P2

- [ ] P2 — Cover complete routes and high-risk interaction states visually
  Why: First-viewport snapshots miss most long-page content and no baseline combines visual and axe checks for 404/offline, open navigation, empty/error, update, recovery, or print states.
  Evidence: `tests/playwright/portfolio-audits.spec.mjs:5-96,442-462`, `tests/playwright/interaction-smoke.spec.mjs`; competitor responsive/ARIA issue queues.
  Touches: Playwright route/state matrix, deterministic mocks, visual baselines, audit documentation.
  Acceptance: Both themes cover full pages or named section slices for every public route family at desktop/mobile; state fixtures include open navigation, catalog no-results/sort/view, command empty/error, timeline empty, SW update, offline recovery, 404, and print; each applicable state runs axe and overflow checks.
  Complexity: L

- [ ] P2 — Reduce homepage catalog DOM cost without losing static access
  Why: The built homepage carries about 400 KB and 2,254 catalog nodes, increasing parse, style, memory, and interaction cost as the portfolio grows.
  Evidence: built `dist/index.html`, `scripts/audit-dom-size.mjs`, Chrome/web.dev excessive-DOM guidance.
  Touches: homepage/catalog route architecture, `CatalogEntry.astro`, catalog URL state, Pagefind indexing, sitemap/feed links, DOM/bundle/interaction tests.
  Acceptance: The homepage stays below a measured <=1,400-node budget; all reviewed projects remain reachable with JavaScript disabled and indexable through static pagination or an equivalent static boundary; direct GitHub links and filter/search URL semantics remain intact.
  Complexity: L

- [ ] P2 — Remove the redundant screenshots filter
  Why: The gallery currently offers “All” and “Web” with the same 23 items, so it adds controls without a meaningful choice and its empty state is unreachable.
  Evidence: `src/pages/screenshots.astro:27-90`, current screenshot manifest.
  Touches: `src/pages/screenshots.astro`, screenshot metadata, filter script/styles, interaction tests.
  Acceptance: The page exposes no facet until at least two non-identical reviewed categories exist, or uses documented product dimensions with distinct counts; empty/reset behavior is reachable and tested.
  Complexity: S

- [ ] P2 — Add a deterministic Pagefind relevance corpus
  Why: Broad language queries currently produce repetitive keyword-heavy excerpts, but tuning without expected results would trade one opaque ranking for another.
  Evidence: `src/pages/search.astro:37-149`, current Python visual baseline; Pagefind filtering and sub-result documentation.
  Touches: searchable-page metadata/body boundaries, Pagefind configuration, search audit fixtures, search UI.
  Acceptance: A versioned corpus of representative role, platform, project, release, and healthcare queries asserts expected first-page results, unique useful excerpts, facets, direct links, and offline parity before any weighting/sub-result changes are accepted.
  Complexity: M
