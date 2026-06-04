# Project Research and Feature Plan

Cycle: 13
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

Cycle 13 narrowed the older T104 CI-fixture concern into an implementable researcher item. PR CI currently writes empty generated-cache files just to satisfy dynamic imports. That keeps type-check/build green, but it under-exercises data-dependent surfaces that the production and weekly workflows now care about: README rendering, release streams, language metadata, ranking inputs, JSON/feed timestamps, and public endpoint shapes.

Top opportunity:

1. **T137 P2** - Replace PR CI empty generated-cache stubs with schema-valid fixtures.

## Evidence Reviewed

Current repo state:

- Current head after the implementer pass: `cdf87fd test: add forced-colors data viz audit`.
- Weekly quality-gates run `26966906202` passed after T136, including the new advisory performance/bfcache step and uploaded quality reports.
- Deploy run `26967133780` for `6580f02` completed successfully.
- The implementer-owned T134 forced-colors changes landed in `cdf87fd`. This research cycle avoided those files and updated only planning docs.

Local files inspected:

- `TODO.md`
- `ROADMAP.md`
- `.github/workflows/ci.yml`
- `src/data/generated.d.ts`
- `scripts/summarize-generated-data.mjs`
- `scripts/validate-project-data.mjs`
- `scripts/audit-public-endpoints.mjs`
- `scripts/audit-feed.mjs`
- `scripts/audit-schema.mjs`
- `scripts/audit-search-index.mjs`
- `src/pages/index.astro`
- `src/pages/projects/[slug].astro`
- `src/pages/releases.astro`
- `src/pages/timeline.astro`
- `src/pages/projects.json.ts`
- `src/pages/releases.json.ts`
- `src/pages/feed.json.ts`

External sources reviewed:

- GitHub Actions secure-use guidance: https://docs.github.com/en/actions/reference/security/secure-use

## Current Product Map Delta

Production and weekly quality workflows now exercise rich generated-data paths:

- Deploy runs refresh stars, metadata, releases, README cache, and the profile-feed cache.
- Weekly quality gates refresh generated data and run build-output audits.
- `scripts/summarize-generated-data.mjs` checks stars/meta cardinality, stats shape, README refresh telemetry, README coverage, profile-feed active state, ranking rows, finite scores, and contiguous ranks.

PR CI still uses a weaker path:

- `.github/workflows/ci.yml` writes empty `_stars.json`, `_meta.json`, `_readmes.json`, `_stats.json`, and `_releases.json`.
- `npm run check` does run `profile-feed:sync`, so profile feed may become realistic when the network is available, but the other generated metadata remains empty.
- Empty stubs make release streams, project README excerpts, language metadata, release-download ranking parts, and date freshness branches render as fallback/empty states.
- The current endpoint/feed/search/schema audits can still pass because they validate structural output, not whether the PR run exercised realistic generated-data branches.

This leaves a meaningful pre-merge blind spot: a change can break cache-field consumers and still pass PR CI if the affected field is absent from the empty stub path.

## Highest-Value New Work

### T137 - Replace PR CI empty generated-cache stubs with schema-valid fixtures

- Priority: P2
- Impact: 4/5 because generated metadata now feeds visible product surfaces, search/ranking behavior, public APIs, and SEO artifacts.
- Effort: 3/5 because the implementation needs fixture curation, copy/install mechanics, a fixture audit, and CI wiring without making PR workflows depend on live GitHub credentials.
- Risk: Medium if fixtures are too large or become stale; keep them minimal, public-safe, and contract-focused.

Recommended implementation shape:

- Add tracked public-safe fixture caches under a clear path such as `src/data/fixtures/generated/`.
- Include schema-valid fixtures for `_stars.json`, `_meta.json`, `_readmes.json`, `_releases.json`, `_stats.json`, `_readme-refresh.json`, and `_profile-projects.json`.
- Prefer a curated subset of real public repos already used in featured/live/catalog data, with at least one release row, one README row, multiple languages, nonzero stars, and enough metadata to exercise ranking.
- Add a small install script, for example `scripts/install-generated-fixtures.mjs`, that copies fixtures into the ignored `src/data/_*.json` cache paths for CI.
- Add a fixture audit, or extend the install script with `--check`, to verify non-empty counts, cardinality consistency, parseable dates, profile-feed shape, release row shape, README refresh telemetry, and ranking inputs.
- Replace the inline CI `printf` stubs with the fixture install/audit command.
- Keep live generated-data refresh in deploy/weekly workflows separate; fixtures are a PR fallback, not a production data source.

## Reliability, Security, Privacy, and Data Safety

- Do not require a GitHub token for PR CI. GitHub's security guidance emphasizes least-privilege token use; public-safe tracked fixtures are more appropriate for untrusted or forked PR contexts than live credentials.
- Use only public repository names and public README/release snippets already acceptable for the portfolio.
- Keep fixtures small enough to review in diffs.
- Make fixture timestamps deterministic or explicitly fixture-labeled so they do not pretend to be live freshness data.
- Do not commit the ignored live `_*.json` generated caches directly; commit fixtures in a separate tracked fixture path.

## Prioritized Roadmap

### Now

- [ ] P2 - Add generated-data fixtures and wire PR CI to install them instead of empty stubs.
  - Evidence: PR CI currently writes empty generated-cache JSON files while consumers expect richer cache shapes.
  - Verify: `ci.yml` workflow_dispatch passes without `GITHUB_TOKEN`, no empty-stub writes appear in logs, and build-output audits still pass with non-empty fixture-backed generated-data branches.

## Explicit Non-Goals

- Do not replace deploy or weekly live generated-data refresh.
- Do not add private repos or private README content to fixtures.
- Do not make PR CI call authenticated GitHub metadata APIs.
- Do not edit active implementer-owned forced-colors files from this research lane.

## Appendix - Sources

Repository sources:

- `.github/workflows/ci.yml:32-39` - writes empty generated-cache stubs before test/check/build.
- `src/data/generated.d.ts` - documents expected generated cache shapes for stats, metadata, releases, readmes, README refresh telemetry, and profile feed.
- `src/pages/index.astro:22-66` - loads stars, stats, metadata, releases, and ranking inputs for homepage UI.
- `src/pages/index.astro:102-109` - language donut derives from `_meta.json`.
- `src/pages/projects/[slug].astro:59-78` - project detail pages load stars and README cache.
- `src/pages/projects/[slug].astro:180-202` - project detail pages load release, metadata, and stats caches.
- `src/pages/releases.astro:7-49` - release stream derives from `_releases.json` and stats.
- `src/pages/timeline.astro:46-123` - timeline release/push events derive from releases and metadata caches.
- `src/pages/projects.json.ts:15-115` - public project index exposes generated metadata fields and source timestamps.
- `src/pages/releases.json.ts:20-67` - release index shape derives from `_releases.json`.
- `src/pages/feed.json.ts:8-15` - JSON Feed item dates fall back through metadata and stats.
- `scripts/summarize-generated-data.mjs:211-318` - checks generated-data cardinality, README refresh telemetry, profile-feed status, and ranking health.
- `scripts/audit-public-endpoints.mjs`, `scripts/audit-feed.mjs`, `scripts/audit-schema.mjs`, and `scripts/audit-search-index.mjs` - build-output audits validate rendered artifacts but do not require PR CI to use realistic metadata fixtures.

External sources:

- GitHub Actions secure-use guidance recommends least-privilege token handling and careful secret use in workflows, supporting a no-token PR fixture path for public metadata: https://docs.github.com/en/actions/reference/security/secure-use
