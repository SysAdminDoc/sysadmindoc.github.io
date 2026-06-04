# Project Research and Feature Plan

Cycle: 2
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

The Cycle 1 queue was drained quickly on `main`: deploy now generates the profile-feed cache before Astro checks, `npm test` is cwd-safe, the Windows/VMware build-path guidance is documented, and the `yaml` audit chain is overridden to patched `yaml@2.8.3`. Live artifacts now show `portfolio-v0.18.3` and a profile-feed-backed `projects.json` with 177 projects. Cycle 2 should harden the release observability around that new data path: scheduled health checks need to exercise profile-feed sync, generated-data summaries need README refresh quality signals, and successful deploys should run a live smoke check rather than relying on manual post-push verification.

## Evidence Reviewed

Local repository evidence:

- `TODO.md` now marks T113-T116 complete on `main`.
- Latest local/remote commits reviewed: `bf28a9f fix(deploy): generate profile feed before typecheck`, `83dc893 test: make node runner cwd safe`, `b3c3ee6 docs: document safe Windows build path`, `652ddde fix(deps): override vulnerable yaml transitive`.
- `.github/workflows/deploy.yml` now runs `npm run profile-feed:sync` before `npx astro check`.
- `.github/workflows/data-refresh.yml` still says it exercises the production data path but only runs `npm run fetch-stars` before `npm run data:summary`.
- `scripts/fetch-stars.mjs` refreshes README cache with a token but preserves existing entries on no-token runs, misses, and rate-limit fallback.
- `scripts/summarize-generated-data.mjs` reports README entry count only; it does not report refresh successes, misses, preserved entries, or rate-limit status.
- `src/pages/projects/[slug].astro` imports `_readmes.json` for project README rendering.
- `scripts/audit-semantic-index.mjs` weights cached README text in the semantic index.

Validation evidence:

- Deploy run `26950341482` for T113 succeeded.
- Deploy run `26950472784` for T114 succeeded.
- Deploy run `26950638219` for T115 succeeded.
- Deploy run `26950831851` for T116 succeeded.
- `npm audit --audit-level=moderate` now reports 0 vulnerabilities.
- Live `https://sysadmindoc.github.io/sw.js` reports `const CACHE = 'portfolio-v0.18.3';`.
- Live `https://sysadmindoc.github.io/projects.json` reports 177 projects and `source.profileFeedUrl = https://raw.githubusercontent.com/SysAdminDoc/SysAdminDoc/main/projects.json`.

External sources reviewed:

- GitHub Pages deploy action (`page_url` output): https://github.com/actions/deploy-pages
- GitHub Actions deployments/environments docs: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- GitHub Actions workflow events docs: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows

## Current Product Map Delta

The product is now live on v0.18.3 with the profile-feed-backed catalog path. The important changed data path is:

1. Deploy workflow refreshes GitHub metadata via `fetch-stars`.
2. Deploy workflow syncs `src/data/_profile-projects.json` via `profile-feed:sync`.
3. `src/data/portfolio.ts` renders visible profile-feed projects with local overlays/suppression policy.
4. `/projects.json` exposes profile-feed source metadata under `source`.
5. Service worker cache is stamped to `portfolio-v0.18.3`.

The scheduled data-health workflow has not caught up with step 2, and the generated-data summary has not caught up with the richer README/profile-feed data quality questions created by the new architecture.

## Feature Inventory Delta

| Feature | Current state | Gap |
| --- | --- | --- |
| GitHub Pages deploy | Green after profile-feed sync fix | No automated live artifact smoke check after `actions/deploy-pages`. |
| Daily data-health workflow | Still fetches stars/metadata and summarizes generated data | Does not sync or summarize profile-feed health despite v0.18.3 depending on that feed. |
| Generated data summary | Checks totals, freshness age, metadata/star counts, non-empty README cache | Does not report README refresh quality or preserved stale cache risk. |
| README rendering/search | Project pages and semantic index consume `_readmes.json` | Cache degradation can remain invisible if total entries are non-zero. |

## Competitive And Ecosystem Research

- GitHub's Pages deploy action exposes the deployment URL as `page_url`, which can feed a post-deploy smoke step without hardcoding the live host. This supports T119.
- GitHub Actions deployment records include environment URLs/status, so a deploy workflow can separate build validation from live artifact validation. This supports adding post-deploy checks without changing the static-site model.
- GitHub Actions event docs allow workflow chaining patterns, but this project can keep the simpler model: add a smoke job after the existing deploy job rather than introducing a separate workflow unless permissions/concurrency require it.

## Highest-Value New Work

### T117 - Scheduled data-health profile-feed coverage

- Priority: P1
- Why now: The daily health check says it exercises the production data path, but production now includes profile-feed sync.
- Impact: 4/5 because it catches feed outages/staleness before the next deploy.
- Effort: 2/5 if `data-refresh.yml` runs `profile-feed:sync` and `data:summary` adds profile-feed fields.
- Risk: Low; deploy already runs the sync script successfully.

### T118 - README-cache refresh quality summary

- Priority: P2
- Why now: README text feeds project pages and semantic search, but only non-empty cache is checked.
- Impact: 3/5 because stale README cache can mislead search/detail content while all existing checks pass.
- Effort: 3/5 because `fetch-stars` needs to persist enough refresh telemetry for `data:summary` to report it.
- Risk: Medium; summary should surface degraded refreshes without failing normal no-token local workflows too aggressively.

### T119 - Post-deploy live smoke check

- Priority: P2
- Why now: Cycle 1 required manual live checks to prove v0.18.3 actually deployed.
- Impact: 3/5 because successful deploy status should also prove live version/source artifacts are coherent.
- Effort: 2/5 for a small script or inline Node fetches after the deploy job.
- Risk: Low if checks are limited to deterministic static artifacts with short retry/backoff for Pages propagation.

## Prioritized Roadmap

### Now

- [ ] P1 - Make the scheduled GitHub data health check exercise the profile-feed path.
  - Evidence: `.github/workflows/data-refresh.yml` omits `profile-feed:sync`; deploy now includes it.
  - Verify: Manual `data-refresh.yml` run summary includes profile-feed status and passes.

### Next

- [ ] P2 - Add README-cache refresh quality signals to generated-data summary.
  - Evidence: `fetch-stars` preserves cache on misses/rate limits; `data:summary` only checks non-empty cache.
  - Verify: Summary JSON/Markdown includes README refresh attempts, successes, misses, preserved entries, and rate-limit state.

- [ ] P2 - Add post-deploy live artifact smoke check.
  - Evidence: Deploy currently ends after `actions/deploy-pages`; manual live checks were needed to confirm v0.18.3 artifacts.
  - Verify: Deploy logs assert SW version and profile-feed-backed projects JSON.

## Quick Wins

- Add `npm run profile-feed:sync` to `.github/workflows/data-refresh.yml` before `npm run data:summary`.
- Extend `summary.json` with `profileFeed` fields already available from `_profile-projects.json`.
- Add a small live-smoke script that reads `package.json` and fetches `${page_url}/sw.js` plus `${page_url}/projects.json`.

## Non-goals

- Do not commit generated `_readmes.json` or `_profile-projects.json`; they remain deploy/runtime cache outputs.
- Do not make local no-token README refresh fail by default; local fallback is useful, but summary output should label it clearly.
- Do not add analytics or visitor tracking to validate deploy behavior.

## Appendix - Sources

Repository sources:

- `.github/workflows/deploy.yml:42-45` - production deploy refreshes stars and profile feed.
- `.github/workflows/data-refresh.yml:8-13` - scheduled job claims to exercise the production data path.
- `.github/workflows/data-refresh.yml:39-43` - scheduled job currently runs `fetch-stars` and `data:summary`.
- `scripts/fetch-stars.mjs:288-338` - README cache refresh and fallback behavior.
- `scripts/summarize-generated-data.mjs:71-95` - README summary currently checks only non-empty cache.
- `src/pages/projects/[slug].astro:65-71` - project pages import cached README text.
- `scripts/audit-semantic-index.mjs:108-115` - semantic index weights README text.

Live/GitHub sources:

- T113 deploy success: https://github.com/SysAdminDoc/sysadmindoc.github.io/actions/runs/26950341482
- T114 deploy success: https://github.com/SysAdminDoc/sysadmindoc.github.io/actions/runs/26950472784
- T115 deploy success: https://github.com/SysAdminDoc/sysadmindoc.github.io/actions/runs/26950638219
- T116 deploy success: https://github.com/SysAdminDoc/sysadmindoc.github.io/actions/runs/26950831851
- Live service worker: https://sysadmindoc.github.io/sw.js
- Live project JSON: https://sysadmindoc.github.io/projects.json

External sources:

- GitHub Pages deploy action: https://github.com/actions/deploy-pages
- GitHub Actions deployments/environments docs: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- GitHub Actions workflow events docs: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows
