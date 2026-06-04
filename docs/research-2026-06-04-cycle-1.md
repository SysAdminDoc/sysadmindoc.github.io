# Project Research and Feature Plan

Cycle: 1
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`
Current live artifact observed: `0.18.2` service worker cache name

## Executive Summary

`sysadmindoc.github.io` is a static Astro 6 portfolio and project catalog with generated GitHub metadata, Pagefind search, structured data, RSS/JSON feeds, service-worker offline behavior, and a profile-feed-backed data path introduced in v0.18.3. The strongest current shape is the data-driven catalog: 181 fallback/catalog projects, 177 rendered profile-feed projects locally after sync, strong validators, and a growing CI/test harness. The highest-value direction this cycle is release correctness: v0.18.3 has source committed but did not deploy because CI type checks cannot see the gitignored profile-feed cache. The next build pass should first restore deploy, then harden test/build execution so local Windows/VMware path issues cannot produce false signals.

Top opportunities, in priority order:

1. **P0: Restore v0.18.3 deploy** by generating or typing `src/data/_profile-projects.json` before `astro check` in `.github/workflows/deploy.yml`.
2. **P1: Make `npm test` cwd-safe** so the bare Node test runner cannot pass after discovering unrelated tests from `C:\Windows` or another fallback directory.
3. **P2: Add a Windows/VMware shared-folder runbook or guard** because raw UNC and mapped shared-folder paths are unsafe for npm/Astro validation on this machine.
4. **P2: Resolve the dev-only `yaml` advisory** in the Astro check chain without downgrading `@astrojs/check`.
5. **P2 existing item refinement: Finish Pagefind visible filters with the official component** (`<pagefind-filter-pane>` and faceted mode) before inventing a custom filter pane.

## Evidence Reviewed

Local files/directories inspected:

- `AGENTS.md`, `CLAUDE.md`, `README.md`, `PROJECT_CONTEXT.md`, `CHANGELOG.md`
- `package.json`, `package-lock.json`
- `.github/workflows/deploy.yml`, `.github/workflows/ci.yml`
- `ROADMAP.md`, `TODO.md`, `RESEARCH_FEATURE_PLAN.md`, `RESEARCH_2026-06-02.md`
- `src/data/portfolio.ts`, `scripts/sync-profile-feed.mjs`, `public/sw.js`, `scripts/stamp-sw.mjs`

Git and release history inspected:

- Initial `git pull --rebase`: already up to date.
- `git log --oneline -12`, including `9117f45 feat(data): render portfolio from profile feed` and `29c2b1d feat(catalog): add freshness and download views`.
- GitHub Actions deploy run `26941334995`: failure on `main` at commit `9117f451d66ffaef2e2815b6084f4945786e795e`.
- Recent GitHub Actions list: Dependabot Astro branch CI succeeded after the failed `main` deploy.

Commands and artifacts inspected:

- `cmd /d /s /c "pushd \"\\vmware-host\Shared Folders\repos\sysadmindoc.github.io\" && npm test"`: passed 12 repo tests.
- `npm run data:validate`: passed; observed 181 fallback/catalog projects and 177 rendered profile-feed projects locally after sync.
- `npm run assets:audit`: passed.
- `npm run images:audit`: passed on sequential rerun.
- `npm run check`: passed locally after `profile-feed:sync`.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- `npm audit --audit-level=moderate`: 5 moderate dev vulnerabilities through `yaml`.
- `npm run build` from the mapped VMware shared-folder path: failed locally with a Vite/Astro path corruption involving `Z:\repos\sysadmindoc.github.io\ Folders\repos\...`.
- Live `https://sysadmindoc.github.io/sw.js`: `const CACHE = 'portfolio-v0.18.2';`.
- Live `https://sysadmindoc.github.io/projects.json`: 181 projects, `source.data = src/data/projects.ts`, `profileFeedUrl = null`.

External sources reviewed:

- Node.js test runner docs: https://nodejs.org/api/test.html
- GitHub Advisory `GHSA-48c2-rrv3-qjmp`: https://github.com/advisories/GHSA-48c2-rrv3-qjmp
- Astro 6.4 release notes: https://astro.build/blog/astro-640/
- Pagefind filter pane docs: https://pagefind.app/docs/components/filter-pane/
- Pagefind Default UI filtering docs: https://pagefind.app/docs/ui-usage/
- Failed deploy run: https://github.com/SysAdminDoc/sysadmindoc.github.io/actions/runs/26941334995
- Live artifacts: https://sysadmindoc.github.io/sw.js and https://sysadmindoc.github.io/projects.json

Areas not verified this cycle:

- Browser rendering of the profile-feed-backed v0.18.3 deploy, because the deploy is currently blocked.
- A normal local-drive Windows clone/worktree build, because this pass was constrained to the VMware shared-folder worktree.
- Full visual/a11y audit of every route, because this research lane is planning-only and the current highest-value issue is deploy correctness.

## Current Product Map

Core workflows:

- Homepage portfolio presentation with hero stats, proof/career sections, featured/live app areas, and catalog entry points.
- Full project catalog with sort/view modes, freshness/download slices, live-app status text, generated project metadata, and search data.
- Project detail pages with per-project metadata, README rendering, Open Graph output, and structured-data coverage.
- Search workflow with Pagefind index generation and partial metadata/facet support.
- Feeds and discovery: RSS, JSON Feed, releases feed, sitemap, `llms.txt`, robots/humans/security text files.
- Offline/update path: service worker with stamped cache names, stale-while-revalidate navigation, update prompt, and bounded cross-origin cache TTL.
- Data refresh path: GitHub metadata fetch, profile-feed sync, validators, generated summaries, and static build.

Platforms/distribution:

- Astro static site deployed to GitHub Pages by GitHub Actions.
- Node/npm local build/test environment.
- Public-only GitHub profile/catalog data; no server-side runtime.

Important data flows:

- `scripts/sync-profile-feed.mjs` writes `src/data/_profile-projects.json` from the public profile feed or local fallback.
- `src/data/portfolio.ts` dynamically imports `./_profile-projects.json` and falls back to authored catalog data when the cache is missing at runtime.
- `package.json` local `build` and `check` scripts run `profile-feed:sync` before data audits and Astro checks.
- `.github/workflows/deploy.yml` currently does not run `profile-feed:sync` before `npx astro check`.

## Feature Inventory

| Feature | User value | Entry point | Main locations | Maturity | Coverage / improvement opportunity |
| --- | --- | --- | --- | --- | --- |
| Profile-feed-backed catalog | Keeps public portfolio aligned with current GitHub profile/repo data | Build/data sync | `scripts/sync-profile-feed.mjs`, `src/data/portfolio.ts` | Partial in release pipeline | Local checks pass, but deploy is broken until CI creates/types the cache before Astro check. |
| Catalog freshness/download views | Helps visitors scan current and downloadable projects | Homepage/catalog controls | `src/data/portfolio.ts`, catalog UI | Shipped v0.18.2 | Live site still shows this v0.18.2 artifact because v0.18.3 deploy failed. |
| Pagefind search facets | Lets visitors filter search/catalog results by category/type | `/search/` and generated index | Pagefind config/index output, project pages | Partial | T35 should use Pagefind's official filter pane/faceted mode and browser-verify it. |
| Service-worker update/cache versioning | Keeps returning visitors from seeing stale assets after releases | `public/sw.js`, build stamp | `public/sw.js`, `scripts/stamp-sw.mjs` | Complete, but deploy-blocked | Live cache still says `portfolio-v0.18.2`; fix deploy before judging SW behavior. |
| Node test runner data tests | Protects data transforms and helpers | `npm test` | `package.json`, `test/` | Functionally useful, script unsafe | Make explicit glob/cwd guard so false green runs cannot happen from UNC fallback. |
| GitHub Actions deploy | Publishes static site to Pages | `main` push | `.github/workflows/deploy.yml` | Broken on current source | Add profile-feed sync/type step before `astro check`; verify next deploy run. |
| Dev dependency security posture | Keeps audit output meaningful | `npm audit` | `package-lock.json`, Astro check stack | Mostly clean | Production high-severity audit is clean; dev moderate advisory remains. |

## Competitive and Ecosystem Research

This cycle focused on release, test, and search ecosystem sources rather than a broad portfolio-design competitor sweep, because the current `main` deploy failure is concrete and time-sensitive.

- **Node.js test runner**: The official runner supports passing explicit glob patterns to constrain discovery. This directly supports T114: the project should not rely on cwd-based discovery when Windows UNC fallback can change the cwd. Source: https://nodejs.org/api/test.html
- **GitHub Advisory Database / `yaml`**: Advisory `GHSA-48c2-rrv3-qjmp` marks `yaml` versions `<2.8.3` in the 2.x line as affected and `2.8.3` as patched. The repository's vulnerable instance is dev-only under `yaml-language-server@1.20.0`, pulled by the Astro check stack. Source: https://github.com/advisories/GHSA-48c2-rrv3-qjmp
- **Astro 6.4**: Astro 6.4 is already available, and the Dependabot Astro branch has passed CI. This is not a new standalone roadmap item because Dependabot already opened the update path, but the implementer should merge it only after the deploy/profile-feed regression is fixed. Source: https://astro.build/blog/astro-640/
- **Pagefind component UI**: Pagefind v1.5.2 documents `<pagefind-filter-pane>` and faceted mode via `<pagefind-config faceted preload>`. This sharpens existing T35: use the official component first, with browser validation, before creating bespoke filter UI. Source: https://pagefind.app/docs/components/filter-pane/

Explicit non-goals from this research pass:

- Do not add analytics/tracking to understand catalog behavior; the repository already parks analytics/visitor tracking.
- Do not add a hosted backend for search or profile data; the static-first GitHub Pages model remains a core constraint.
- Do not replace Pagefind with a heavier search stack while Pagefind's own component UI can close the visible-filter gap.
- Do not treat the dev-only `yaml` advisory as a production incident; production high-severity audit is clean.

## Highest-Value New Features

### T113 - Restore v0.18.3 deploy by generating the profile-feed cache before Astro type checks

- Priority: P0
- Fit: Directly preserves release quality and the static GitHub Pages deployment model.
- Impact: 5/5, because the current source version is not live.
- Effort: 2/5 if the deploy workflow simply runs `npm run profile-feed:sync` before `npx astro check`; 3/5 if a type-safe fixture or generated declaration is preferred.
- Risk: Low if the same sync script already used by local `npm run check` is reused; medium if a fake fixture masks real profile-feed failures.
- Evidence: `.github/workflows/deploy.yml:35-57`, `package.json:12-15`, `src/data/portfolio.ts:60`, failed run `26941334995`, live `/sw.js`.
- Acceptance: Next `Deploy portfolio` run on `main` succeeds and live `/sw.js` stamps v0.18.3 or newer.

### T114 - Make `npm test` explicit and current-working-directory safe

- Priority: P1
- Fit: Matches the repo's existing test-runner investment and two-machine workflow.
- Impact: 4/5, because false green tests undermine every later research/build decision.
- Effort: 2/5 for an explicit glob plus a simple cwd guard.
- Risk: Low; the valid sequential mapped run already reports 12 tests.
- Evidence: `package.json:18`, Node test docs, local UNC fallback behavior.
- Acceptance: Valid repo `npm test` still passes; mis-cwd launch fails fast.

### T115 - Document or guard the Windows/VMware shared-folder build workflow

- Priority: P2
- Fit: This repo is actively worked from `\\vmware-host\Shared Folders`, so local run ergonomics affect release confidence.
- Impact: 3/5, because it reduces false triage and protects future build/debug work on this two-PC setup.
- Effort: 1/5 for docs, 2/5 for a warning guard.
- Risk: Low if documented as an environment-specific runbook rather than a code-path change.
- Evidence: raw UNC npm fallback; mapped-drive `npm run build` Vite/Astro path corruption.
- Acceptance: `README.md`/`CLAUDE.md`/`PROJECT_CONTEXT.md` clearly say how to build from Windows: use a normal local clone/worktree path without spaces for npm/Astro commands.

### T116 - Resolve the dev-only `yaml` advisory in the Astro check dependency chain

- Priority: P2
- Fit: Keeps audit output clean for the static site without claiming a production exploit path.
- Impact: 3/5, because noisy audits hide real future advisories.
- Effort: 2/5 if an override works; 3/5 if the project must wait for `volar-service-yaml` or Astro language-server updates.
- Risk: Medium; overriding transitive language-server packages can break `astro check`.
- Evidence: `package-lock.json:106-128`, `package-lock.json:6456-6464`, `package-lock.json:6646-6663`, advisory `GHSA-48c2-rrv3-qjmp`.
- Acceptance: `npm audit --audit-level=moderate` and `npm run check` both pass.

## Existing Feature Improvements

- **T35 Pagefind facets/metadata**: Keep the existing item; update its implementation note to use Pagefind's official `<pagefind-filter-pane>` plus faceted mode before custom UI. This avoids inventing a control that Pagefind already ships and keeps the work browser-verifiable.
- **T104/T105 CI gates**: The deploy failure strengthens the rationale for mirroring local `check` semantics into deploy. Do not add a duplicate item; T113 should fix the immediate root cause, then T105 can continue broadening deploy parity.
- **T111 Astro HTML repair**: The failed local build from the VMware path is not evidence of the existing Astro `</html>` issue. Keep T111 scoped to its prior Astro/compressHTML root cause; track shared-folder path corruption separately as T115.

## Reliability, Security, Privacy, And Data Safety

- Reliability risk is active: `main` deploy failed and public artifacts are stale at v0.18.2.
- Data safety posture remains reasonable: all profile/catalog data reviewed here is public GitHub portfolio data, and existing parked/rejected items keep private-repo listing out of scope.
- Security posture is split: production high-severity audit is clean, but full dev audit reports `yaml` moderate vulnerabilities through the Astro check language-server chain.
- Release safety issue: `package.json` local `check` and deploy `astro check` do not run the same setup steps, allowing local green and remote red.
- Test safety issue: `node --test` without explicit repo-local patterns can validate the wrong tests under Windows UNC fallback.

## UX, Accessibility, And Trust

No new UI/a11y regression was confirmed this cycle because the current v0.18.3 UI cannot be inspected live until deploy succeeds. The most important trust signal is version freshness: visitors and maintainers should not see source v0.18.3 in Git while the live service worker still advertises v0.18.2. Once T113 lands, the build machine should perform the full UX/a11y pass required by the standing roadmap instructions, especially across the newly profile-feed-backed catalog and Pagefind filter UI.

## Architecture And Maintainability

- The profile-feed cache is currently modeled as a generated, gitignored runtime input, but Astro type checking treats the dynamic import as a compile-time module requirement. Either generate it before every type check or add a stable type/fixture contract.
- The deployment workflow should call the same quality gate used locally (`npm run check`) or intentionally mirror every required setup step. Divergence between local and CI scripts caused the current release blocker.
- Test commands should be self-locating or explicit. A command that passes because the shell changed cwd is worse than no command.
- The Windows/VMware shared-folder environment should be treated as an edit/sync surface, not as the canonical npm/Astro execution path, unless the build toolchain is proven reliable there.

## Prioritized Roadmap

### Now

- [ ] P0 - Restore v0.18.3 deploy by generating the profile-feed cache before Astro type checks.
  - Why: Current `main` source did not publish; public artifacts remain v0.18.2.
  - Evidence: Failed deploy run `26941334995`; `.github/workflows/deploy.yml:55`; `src/data/portfolio.ts:60`; live `/sw.js`.
  - Touches: `.github/workflows/deploy.yml`; maybe generated cache typings/fixture policy.
  - Acceptance: Next deploy succeeds and live SW/projects JSON reflect v0.18.3 profile-feed output.
  - Verify: `gh run view <run> --json conclusion,url`; fetch live `/sw.js` and `/projects.json`.

### Next

- [ ] P1 - Make `npm test` explicit and cwd-safe.
  - Why: Prevent false green validation from unsafe Windows UNC execution.
  - Evidence: `package.json:18`; Node test docs; observed local UNC fallback.
  - Touches: `package.json`; optional cwd guard script.
  - Acceptance: Repo tests run from valid cwd; wrong cwd fails fast.
  - Verify: Valid mapped/local run reports 12 tests; wrong-cwd run fails.

- [ ] P2 - Document or guard Windows/VMware shared-folder build workflow.
  - Why: Build/test tooling is unreliable from the shared-folder path.
  - Evidence: UNC npm fallback and mapped-drive Vite/Astro path corruption.
  - Touches: `README.md`, `CLAUDE.md`, `PROJECT_CONTEXT.md`; optional warning guard.
  - Acceptance: Maintainers have a repeatable local-drive build path and clear unsafe-path warning.
  - Verify: Local normal path `npm run check` and `npm run build` pass.

### Later

- [ ] P2 - Resolve dev-only `yaml` advisory in the Astro check dependency chain.
  - Why: Keep audit output meaningful without downgrading type-check tooling.
  - Evidence: `npm audit --audit-level=moderate`; GitHub Advisory `GHSA-48c2-rrv3-qjmp`; package-lock transitive chain.
  - Touches: `package.json`, `package-lock.json`.
  - Acceptance: Full moderate audit and `npm run check` both pass.
  - Verify: `npm audit --audit-level=moderate`; `npm ls yaml @astrojs/check @astrojs/language-server yaml-language-server`.

### Under Consideration

- Upgrade to Astro 6.4.4 via the existing Dependabot branch after T113. CI for the Dependabot branch is green, but merging it before deploy is restored would mix a release blocker with a dependency update.

### Rejected

- Hosted backend search/profile service: conflicts with the static-first GitHub Pages model and duplicates existing parked items.
- Analytics-based prioritization: conflicts with the project's existing no-tracking posture.
- Custom Pagefind filter UI before trying Pagefind's official components: unnecessary complexity until the official filter pane is browser-tested.

## Quick Wins

- In `deploy.yml`, add `npm run profile-feed:sync` before `npx astro check`, or replace the current ad hoc sequence with `npm run check` if runtime and logging remain acceptable.
- Change `npm test` from bare `node --test` to an explicit repo-local glob and add a quick cwd sentinel.
- Add a short "Windows shared-folder execution" note to `CLAUDE.md` or `PROJECT_CONTEXT.md`.
- Run the existing Dependabot Astro branch after deploy is healthy; do not conflate it with T113.

## Larger Bets

- Promote deploy parity with local checks: make CI, deploy, and local commands share one audited validation entry point.
- Convert generated cache contracts into typed fixtures/declarations so type checks are resilient even when generated JSON is absent.
- Finish the Pagefind search page as a faceted browsing surface using official components and then baseline it in browser/a11y checks.

## Open Questions

- Should `_profile-projects.json` be generated in every CI/deploy job, or should the repo include a typed fixture/declaration so clean type checks never depend on a generated JSON file?
- Should the Windows shared-folder path be officially unsupported for npm/Astro execution, or should the repo invest in a guard that redirects maintainers to a local worktree?
- Is a transitive npm override for `yaml-language-server` acceptable if `astro check` still passes, or should the project wait for upstream `volar-service-yaml`/Astro language-server changes?

## Appendix - Sources

Repository evidence:

- `package.json:4` - source version `0.18.3`.
- `package.json:12-15` - local `build`/`check` run `profile-feed:sync` before validation and Astro check.
- `package.json:18` - bare `node --test`.
- `.github/workflows/deploy.yml:35-57` - deploy runs validation/fetch-stars/`npx astro check`/`build:ci` without profile-feed sync.
- `src/data/portfolio.ts:60` - dynamic import of `./_profile-projects.json`.
- `scripts/sync-profile-feed.mjs:18` - generated cache path.
- `public/sw.js:1` and `scripts/stamp-sw.mjs:11-27` - cache version placeholder/stamping.
- `package-lock.json:106-128`, `6456-6464`, `6646-6663` - Astro check -> language-server -> yaml-language-server -> yaml chain.

GitHub/live sources:

- Failed deploy run: https://github.com/SysAdminDoc/sysadmindoc.github.io/actions/runs/26941334995
- Live site service worker: https://sysadmindoc.github.io/sw.js
- Live projects JSON: https://sysadmindoc.github.io/projects.json

External primary sources:

- Node.js test runner docs: https://nodejs.org/api/test.html
- GitHub Advisory Database `GHSA-48c2-rrv3-qjmp`: https://github.com/advisories/GHSA-48c2-rrv3-qjmp
- Astro 6.4 release notes: https://astro.build/blog/astro-640/
- Pagefind filter pane docs: https://pagefind.app/docs/components/filter-pane/
- Pagefind Default UI filtering docs: https://pagefind.app/docs/ui-usage/

Validation command outcomes captured this cycle:

- `npm test` via sequential `cmd pushd` mapping: passed 12 repo tests.
- `npm run data:validate`: passed.
- `npm run assets:audit`: passed.
- `npm run images:audit`: passed on sequential rerun.
- `npm run check`: passed locally after `profile-feed:sync`.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- `npm audit --audit-level=moderate`: failed with five moderate dev vulnerabilities through `yaml`.
- `npm run build` from VMware mapped shared-folder path: failed locally due path corruption, treated as an environment/runbook finding rather than a confirmed source regression.
