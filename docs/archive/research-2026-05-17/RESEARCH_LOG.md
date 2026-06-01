# Research Log

Date: 2026-05-17

## Phase 1: Local Instruction and Memory Intake

Actions:

- Read repo-local `AGENTS.md` and `CLAUDE.md`.
- Read global local instruction sources required by the session prompt.
- Read local portfolio memory and stack-web memory.
- Read the prior autonomous-roadmap workflow memory for process expectations.

Findings:

- Repo-local `CLAUDE.md` was useful but stale at v0.16.0.
- Tracked repo version is v0.16.1.
- Privacy/public-safe catalog handling is a recurring rule.
- Prior workflow memory emphasized source-backed roadmaps, live-state reconciliation, verification, and commit/push.

## Phase 2: Git and Repository Reconnaissance

Commands:

- `rtk git log -10` failed because `rtk` was unavailable.
- `git status --short --branch`.
- `git log -10 --oneline --decorate`.
- `rg --files`.
- Targeted `Get-Content`, `Select-String`, and `rg` reads over source/data/workflow files.

Files inspected:

- `README.md`
- `CHANGELOG.md`
- old `ROADMAP.md`
- `package.json`
- `astro.config.mjs`
- `src/data/*.ts`
- `src/layouts/Base.astro`
- `src/pages/projects/[slug].astro`
- `src/pages/og/[slug].png.ts`
- `public/scripts/*.js`
- `public/sw.js`
- `scripts/*.mjs`
- `.github/workflows/deploy.yml`
- ignored generated caches

Findings:

- Architecture is stable and coherent.
- Current largest risks are not new UI features; they are dependency advisories, live catalog drift, privacy boundaries, and stale generated data.

## Phase 3: Verification and Security Baseline

Commands:

- `npm run check`
- `npm audit --omit=dev --json`
- `npm outdated --json`
- broad secret-pattern scan with `rg`

Findings:

- `npm run check` passed.
- Production audit reported advisory buckets involving `astro`, `devalue`, `marked`, `postcss`, and `sanitize-html`.
- `sanitize-html` and `marked` are high-priority because the site renders remote README content.
- The broad secret scan found no hardcoded credential, only expected code, documentation, and package-name matches.

## Phase 4: Live GitHub Reconciliation

Commands:

- `gh repo list SysAdminDoc --limit 300 --visibility public --json ...`
- `gh repo view SysAdminDoc/RadAtlas --json ...`
- Targeted `gh repo view` checks for apparent stale catalog names.

Findings:

- Active public repos: 178.
- Active public non-forks: 170.
- Active public forks: 8.
- Public stars: 220.
- Missing newly public active repos in `src/data/projects.ts`: `OpenLumen`, `PhoneFork`, `AI-Usage_Tracker`.
- `Scripts` and `ChanPrep` remain intentional exclusions.
- Several apparent stale catalog entries are public forks, which explains why the stats script excludes them but the catalog may still include them.
- `RadAtlas` is public and X-ray-related; it should remain excluded until reviewed.

## Phase 5: External Ecosystem Research

Search classes:

- Astro official docs: content collections, view transitions, prefetch, image pipeline, Astro 6 upgrade.
- GitHub official docs: GitHub Pages custom workflows, Dependabot alerts.
- GitHub Advisory Database: Astro, marked, sanitize-html, devalue, postcss advisories.
- Static search: Pagefind, MiniSearch, Fuse.js, Lunr.
- Accessibility/performance: WCAG 2.2, Core Web Vitals, bfcache, service-worker update APIs.
- Competitor and adjacent personal sites: Lee Robinson, Simon Willison, Julia Evans, fasterthanli.me, Rauno Freiberg, Paco Coursey, Maggie Appleton, Brittany Chiang.
- Astro portfolio/template references: Astrofy, Astro boilerplate, Astroplate, automated GitHub portfolio article.

Representative queries:

- `Astro content collections docs defineCollection Zod schema official`
- `Astro 6 release notes official`
- `Astro image optimization docs official Image component`
- `GitHub Pages GitHub Actions deploy pages artifact official docs`
- `GitHub Dependabot alerts npm GitHub Actions documentation`
- `sanitize-html GHSA-rpr9-rxv7-x643 advisory`
- `marked GHSA-6v9c-7cg6-27q7 advisory`
- `MiniSearch JavaScript full text search official GitHub docs`
- `Pagefind static site search official docs`
- `WCAG 2.2 Focus Appearance target size official W3C`
- `web.dev Core Web Vitals INP LCP CLS guidance official`
- `personal developer portfolio TIL tools projects`

## Saturation Notes

After multiple passes, new sources repeated the same high-confidence opportunity families:

- Schema-checked project/content data.
- Public GitHub reconciliation automation.
- Static full-text search.
- TIL/notes or digital garden sections.
- Project timelines/year-in-review.
- Accessible and performant interaction polish.
- Dependency/security automation.
- Screenshot and asset freshness checks.

No additional source category displaced the Tier 0 priorities discovered locally. External research mostly refined Tier 1-Tier 4 implementation choices.

## Failed or Thin Searches

- No strong evidence supported adding hosted analytics or a backend service to this static portfolio.
- Model/dataset research was intentionally thin because the product is a public static portfolio, not an ML product.
- Screenshot refresh automation research did not need deep external sourcing because the repo already has a Playwright script.

## Completion Criteria Check

- Required root files written: `PROJECT_CONTEXT.md`, `ROADMAP.md`.
- Required research files written under `.ai/research/2026-05-17/`.
- Local repository reconnaissance completed.
- Project memory consolidated.
- External research completed across multiple passes.
- Source saturation tested.
- Roadmap rewritten and evidence-indexed.
- Limitations documented.
