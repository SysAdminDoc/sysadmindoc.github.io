# Portfolio Roadmap

Research refresh: 2026-05-17
Current repo version: v0.16.3 (`package.json`, `README.md`, `CHANGELOG.md`)
Current branch baseline: `main` at `7817ea7` before this research pass

This roadmap is evidence-backed and should be read with `PROJECT_CONTEXT.md` plus `.ai/research/2026-05-17/`. It replaces the older v0.7-v0.9 era roadmap, which no longer matched the current project state.

## Operating Principles

- Public-only portfolio: list only repositories that are intentionally public and safe to promote. Private/internal work can be represented as sanitized capability narratives, not repository links.
- GitHub Pages static-first: preserve the current Astro static output model and avoid adding runtime services unless the value is clear.
- Evidence over claims: project counts, catalog entries, security status, and feature claims should be generated or checked from source data where possible.
- Accessibility and performance are core product quality, not polish-only work. Changes must be tested with `npm run check`, `npm run build`, and targeted browser or accessibility checks when UI changes.
- Agent/tool-specific local instructions stay tool-specific. Durable project facts belong in `PROJECT_CONTEXT.md`.

## Tier 0: Correctness, Security, and Trust

### [x] 1. Fix production dependency advisories

Evidence: `package.json`, `package-lock.json`, `npm audit --omit=dev --json`, E08-E14.

Status: shipped 2026-05-17; see the Git history for the implementation commit.

`npm audit --omit=dev` previously reported five production advisory buckets, including critical `sanitize-html`, high `marked`, moderate Astro, high `devalue`, and moderate `postcss` exposure through the dependency graph. The production audit is now clean after upgrading Astro, `marked`, `sanitize-html`, and the affected transitive lockfile versions. Full audit still reports dev-only moderate findings in the `@astrojs/check` language-server chain, so the CI gate is intentionally scoped to production high/critical advisories.

Actions:

- [x] Upgrade `sanitize-html` from 2.17.2 to 2.17.4.
- [x] Upgrade `marked` from 18.0.0 to 18.0.3.
- [x] Upgrade Astro from 5.18.1 to 6.3.3 and verify the static build.
- [x] Resolve transitive `devalue` and `postcss` production advisories in the lockfile.
- [x] Re-run `npm audit --omit=dev`, `npm run check`, and `npm run build`.
- [x] Add an advisory gate to CI for high/critical production vulnerabilities.

Acceptance:

- [x] No high or critical production vulnerabilities remain in `npm audit --omit=dev`.
- [x] README rendering still sanitizes remote README HTML and the project pages build under Astro 6.

### [x] 2. Reconcile the live GitHub catalog against `src/data/projects.ts`

Evidence: `src/data/projects.ts`, `src/data/_stats.json`, GitHub CLI public repo scan C03-C05, L07.

Status: shipped 2026-05-17; see the Git history for the implementation commit.

The ignored cache reported 167 non-fork public repos and 204 stars from 2026-05-11. Live GitHub state on 2026-05-17 reported 178 active public repositories, 170 active public non-forks, and 8 public forks. The data file was missing newly public active repos including `OpenLumen`, `PhoneFork`, and `AI-Usage_Tracker`; those are now cataloged. `Scripts`, `ChanPrep`, `SysAdminDoc`, and `null` are documented intentional exclusions. `RadAtlas` is public but removed from the portfolio and remains held for privacy review before promotion.

Actions:

- [x] Add a checked exception list for intentionally skipped public repos.
- [x] Add a catalog audit script that compares live GitHub repos to `projects.ts` and fails when unreviewed public repos appear.
- [x] Decide how public forks should be counted because the current stats script excludes forks while the catalog includes some public fork entries.
- [x] Add `OpenLumen`, `PhoneFork`, and `AI-Usage_Tracker` to the catalog.
- [x] Refresh generated GitHub data with `GITHUB_TOKEN`.

Acceptance:

- [x] `npm run catalog:audit` reports no unreviewed public repos.
- [x] README/site count language matches catalog data.
- [x] Fork inclusion policy is explicit in `PROJECT_CONTEXT.md` and `src/data/catalog-policy.json`.

### [x] 3. Resolve the medical-imaging public boundary

Evidence: GitHub CLI scan C04, local privacy rule inventory in `MEMORY_CONSOLIDATION.md`, L07.

Status: shipped 2026-05-17; see the Git history for the implementation commit.

`RadAtlas` is public on GitHub and its description identifies it as an X-ray technique chart application. Existing local rules state that X-ray and medical-imaging repositories should be private unless explicitly approved. This repository now enforces the portfolio-side decision: `RadAtlas` stays excluded, is held in the privacy-review list, and cannot be reintroduced into portfolio data or screenshots without failing `npm run catalog:audit`. The roadmap still rejects automatic GitHub visibility changes from this site; changing the upstream repository visibility remains an explicit owner action outside this repo.

Actions:

- [x] Review whether `RadAtlas` should remain linked from this portfolio.
- [x] Document that it is not safe to list here without explicit public-safety approval.
- [x] Keep it excluded here and enforce that exclusion in `npm run catalog:audit`.
- [x] Remove stale screenshots for removed private-sensitive projects.

Acceptance:

- [x] The portfolio visibility decision is documented.
- [x] The portfolio does not link to unsafe or unintended public medical-imaging work.

### [x] 4. Make project memory canonical

Evidence: `AGENTS.md`, `CLAUDE.md`, ignored project memory, `PROJECT_CONTEXT.md`, `.ai/research/2026-05-17/MEMORY_CONSOLIDATION.md`.

Repo-local `CLAUDE.md` is ignored and currently says v0.16.0 while the tracked repo is v0.16.1. The old roadmap was also stale. `PROJECT_CONTEXT.md` is now the tracked canonical project memory.

Actions:

- Treat `PROJECT_CONTEXT.md` as the durable tracked context file.
- Keep tool-specific files (`AGENTS.md`, `CLAUDE.md`, local memory files) as pointers or working notes rather than canonical public documentation.
- When counts, version, exclusions, or privacy boundaries change, update `PROJECT_CONTEXT.md` in the same change set.

Acceptance:

- [x] Future sessions can start from `PROJECT_CONTEXT.md` and current Git state without relying on ignored local files.

## Tier 1: Data Model and Build Reliability

### [x] 5. Move project data behind a schema-checked content layer

Evidence: `src/data/projects.ts`, `src/data/types.ts`, Astro content collections docs E01.

Status: shipped 2026-05-17; see the Git history for the implementation commit.

The current TypeScript arrays are direct and simple, but catalog size and privacy constraints now justify stronger validation. The shipped path keeps the lightweight `projects.ts` source model and adds a schema-checked data gate instead of migrating to Astro content collections immediately. That preserves the current editing workflow while making invalid records fail before Astro check/build.

Actions:

- [x] Evaluate Astro content collections or a schema-checked data loader for project records.
- [x] Validate unique slugs, required descriptions, category/language enums, URL shape, screenshot existence for live apps, and public/private policy flags.
- [x] Add tests for derived counts and command palette data.

Acceptance:

- [x] Invalid catalog entries fail at check/build time.
- [x] Exceptions such as intentionally skipped public repos are explicit.

### [ ] 6. Split generated data refresh from deployment

Evidence: `scripts/fetch-stars.mjs`, `.github/workflows/deploy.yml`, README deployment docs, L06-L08.

Generated GitHub data is ignored and cached locally. The script has safe unauthenticated fallback behavior, but stale data can quietly ship.

Actions:

- Create a scheduled or manually dispatched GitHub data refresh workflow that requires `GITHUB_TOKEN`.
- Publish a data freshness summary artifact or issue comment.
- Keep deploys deterministic: site builds should use committed source plus generated caches from the workflow, not stale local files.

Acceptance:

- Stale metadata is visible before deployment.
- Failed GitHub API refresh does not corrupt existing cache.

### [ ] 7. Add stale asset and dead-code checks

Evidence: tracked screenshots, `src/data/projects.ts`, `CHANGELOG.md`, L05-L07.

The repo previously carried removed project screenshots such as `GeneratorSpecs.jpg` and `RadAtlas.jpg`; the privacy-sensitive examples were removed in the medical-imaging boundary pass. A general stale screenshot checker is still needed so future removals do not leave unreviewed assets behind.

Actions:

- Add a script that compares `public/screenshots/*.jpg` to live app slugs.
- Add an explicit archive folder or removal policy for stale visual assets.
- Evaluate `knip`, ESLint, or a lightweight custom script for unused source modules and data fields.

Acceptance:

- Removed projects do not leave unreviewed public assets behind.
- Stale assets are either intentionally archived or deleted.

### [ ] 8. Modernize CI quality gates

Evidence: `.github/workflows/deploy.yml`, `npm run check`, `npm audit`, GitHub Pages custom workflow docs E04, Dependabot docs E15.

Actions:

- Keep `npm run check` and `npm run build` as required deploy gates.
- Add production audit reporting after remediation.
- Add dependency update automation, at minimum Dependabot for npm and GitHub Actions.
- Consider a weekly catalog audit that opens an issue when public GitHub state drifts.

Acceptance:

- Security and catalog drift are visible without manual local sessions.

## Tier 2: Portfolio Experience and Storytelling

### [ ] 9. Add proof-oriented project detail sections

Evidence: `src/pages/projects/[slug].astro`, `src/data/projects.ts`, competitor patterns E20-E27.

The site already renders project pages, README excerpts, release metadata, and related projects. The next trust step is structured proof: what problem was solved, what changed, what is verified, and what a user can try.

Actions:

- Add optional fields for "problem", "build evidence", "platform support", "install path", and "known limitations".
- Prefer facts that can be sourced from README, releases, screenshots, or local repository docs.
- Keep private/internal work sanitized.

Acceptance:

- High-value projects can tell a full story without overclaiming.

### [ ] 10. Build a year-in-review and project timeline layer

Evidence: `CHANGELOG.md`, `_releases.json`, GitHub release metadata, Simon Willison and fasterthanli.me timeline patterns E21, E23.

Actions:

- Generate a yearly page from releases, pushes, and changelog highlights.
- Show "what shipped" without requiring manual narrative for every repo.
- Add filters by platform, language, and category.

Acceptance:

- A visitor can understand current momentum and historical breadth without scanning 150+ entries.

### [ ] 11. Create a public-safe `/til` or notes feed only if there is durable source content

Evidence: old roadmap, Simon Willison TIL/tools pattern E21, Maggie Appleton garden/notes pattern E26.

Actions:

- Start only after choosing a content source and review policy.
- Keep it separate from the repo catalog.
- Include RSS if the section becomes active.

Acceptance:

- Notes are maintainable and public-safe.

### [ ] 12. Add an archive or anti-portfolio section for retired public projects

Evidence: `CHANGELOG.md`, removed project screenshots, existing roadmap, competitor digital-garden patterns E26.

Actions:

- Capture why projects were removed, renamed, privatized, or superseded.
- Keep entries short and non-sensitive.
- Link to public repos only when safe.

Acceptance:

- The portfolio explains evolution without resurrecting unsafe links.

## Tier 3: Discovery, Search, and Performance

### [ ] 13. Upgrade search beyond the current command palette dataset

Evidence: `public/scripts/cmdk.js`, `Base.astro`, Pagefind docs E16, MiniSearch/Fuse/Lunr sources E17-E19.

Actions:

- Compare Pagefind, MiniSearch, and the existing custom command palette against static GitHub Pages constraints.
- Include README excerpts and project detail pages in the index if size remains acceptable.
- Keep keyboard search accessible and no-JS fallback links intact.

Acceptance:

- Search finds projects by name, description, language, category, and README keywords.

### [ ] 14. Audit Core Web Vitals, bfcache, and service-worker update UX

Evidence: `public/sw.js`, `public/scripts/main.js`, web.dev Core Web Vitals E28, bfcache E29, MDN service worker docs E30-E31.

Actions:

- Run Lighthouse/PageSpeed checks for homepage, catalog, and project pages.
- Add a service-worker update toast if cached assets can go stale across deploys.
- Test bfcache eligibility after view transitions or more client JavaScript changes.

Acceptance:

- The site has documented LCP, INP, CLS, and bfcache status for representative pages.

### [ ] 15. Review image and OG generation pipeline

Evidence: `src/pages/og/[slug].png.ts`, `public/screenshots`, `scripts/capture-screenshots.mjs`, Astro image docs E03.

Actions:

- Keep OG output PNG-compatible for social platforms.
- Compress internal screenshots and thumbnails separately.
- Evaluate Astro image tooling for static builds, but avoid a migration that makes GitHub Pages deploy brittle.

Acceptance:

- Visual assets are current, smaller, and traceable to active projects.

## Tier 4: Longer-Term Data, Automation, and Integrations

### [ ] 16. Add public portfolio feeds and machine-readable index files

Evidence: existing RSS pages, `src/pages/releases.xml.ts`, search/source needs in this roadmap.

Actions:

- Add `projects.json`, `releases.json`, or category feeds generated from the same source data.
- Include freshness timestamps and schema versioning.

Acceptance:

- External consumers and future tooling can use project data without scraping HTML.

### [ ] 17. Evaluate local semantic indexing for project organization

Evidence: README corpus in `_readmes.json`, project descriptions, dataset review.

Actions:

- Keep any model work offline/generated and committed only as derived metadata if useful.
- Evaluate embeddings or classification for duplicate category detection, similar-project linking, and stronger search.
- Do not add user tracking or hosted inference for a static portfolio.

Acceptance:

- Model usage improves maintainability or discovery without adding privacy or runtime complexity.

## Rejected or Parked

- Hosted backend search: parked unless static search cannot cover the catalog.
- Analytics-heavy visitor tracking: rejected for now; the portfolio can improve with build-time and public GitHub evidence.
- Listing private/internal repositories: rejected. Use sanitized capability narratives instead.
- Automatic public/private visibility changes from this repo: rejected. GitHub visibility decisions happen outside this site and require explicit human action.

## Source Index

Local sources:

- L01 `README.md`
- L02 `CHANGELOG.md`
- L03 `package.json`
- L04 `package-lock.json`
- L05 `ROADMAP.md` before replacement
- L06 `CLAUDE.md` and `AGENTS.md` local ignored instruction files
- L07 `src/data/projects.ts`
- L08 `src/data/curated.ts`
- L09 `src/data/derived.ts`
- L10 `src/data/types.ts`
- L11 `src/pages/projects/[slug].astro`
- L12 `src/pages/og/[slug].png.ts`
- L13 `public/scripts/main.js`
- L14 `public/scripts/cmdk.js`
- L15 `public/sw.js`
- L16 `scripts/fetch-stars.mjs`
- L17 `scripts/capture-screenshots.mjs`
- L18 `.github/workflows/deploy.yml`
- L19 ignored generated caches under `src/data/_*.json`

Command evidence:

- C01 `git log -10 --oneline --decorate`
- C02 `npm run check`
- C03 `npm audit --omit=dev --json`
- C04 `npm outdated --json`
- C05 `gh repo list SysAdminDoc --limit 300 --visibility public ...`
- C06 `gh repo view SysAdminDoc/RadAtlas ...`
- C07 secret-pattern scan with `rg`

External sources:

- E01 Astro content collections: https://docs.astro.build/en/guides/content-collections/
- E02 Astro v6 upgrade guide: https://docs.astro.build/en/guides/upgrade-to/v6/
- E03 Astro image docs: https://docs.astro.build/en/guides/images/
- E04 GitHub Pages custom workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- E05 GitHub Dependabot alerts: https://docs.github.com/en/code-security/concepts/supply-chain-security/about-dependabot-alerts
- E06 Astro view transitions: https://docs.astro.build/en/guides/view-transitions/
- E07 Astro prefetch: https://docs.astro.build/en/guides/prefetch/
- E08 Astro define:vars advisory: https://github.com/advisories/GHSA-j687-52p2-xcff
- E09 Astro server islands advisory: https://github.com/advisories/GHSA-xr5h-phrj-8vxv
- E10 devalue advisory: https://github.com/advisories/GHSA-77vg-94rm-hx3p
- E11 marked advisory: https://github.com/advisories/GHSA-6v9c-7cg6-27q7
- E12 postcss advisory: https://github.com/advisories/GHSA-qx2v-qp2m-jg93
- E13 sanitize-html allowedTags advisory: https://github.com/advisories/GHSA-9mrh-v2v3-xpfm
- E14 sanitize-html raw-text advisory: https://github.com/advisories/GHSA-rpr9-rxv7-x643
- E15 Pagefind docs: https://pagefind.app/docs/
- E16 MiniSearch: https://github.com/lucaong/minisearch
- E17 Fuse.js: https://www.fusejs.io/
- E18 Lunr.js: https://lunrjs.com/
- E19 Lee Robinson: https://leerob.com/
- E20 Simon Willison: https://simonwillison.net/
- E21 Julia Evans: https://jvns.ca/
- E22 fasterthanli.me: https://fasterthanli.me/
- E23 Rauno Freiberg: https://rauno.me/
- E24 Paco Coursey: https://paco.me/
- E25 Maggie Appleton: https://maggieappleton.com/
- E26 Brittany Chiang: https://brittanychiang.com/
- E27 WCAG 2.2: https://www.w3.org/TR/WCAG22/
- E28 Core Web Vitals: https://web.dev/articles/vitals
- E29 bfcache: https://web.dev/articles/bfcache
- E30 ServiceWorker `updatefound`: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updatefound_event
- E31 ServiceWorker `skipWaiting`: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
