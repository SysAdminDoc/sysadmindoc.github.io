# Project Research and Feature Plan

Cycle: 7
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

The build machine drained more queue while this cycle was running: `021c037` completed T118 README refresh health, and `9070d4d` completed T126 rendered JSON-LD auditing. The latest deploys for both commits succeeded. The worktree currently has implementer-owned source changes for T124 ranking-rationale UI; those edits were left untouched.

Cycle 7 moves into the next reliability seam: public machine-readable endpoints and scheduled build-output monitoring. The site now has strong generated-data and JSON-LD checks, but `/projects.json`, `/releases.json`, `/cmdk-data.js`, `/llms.txt`, and feed discovery are still mostly protected by manual/live checks. Separately, the weekly quality workflow does not run the build-output audit path where `schema:audit` now lives.

Top opportunities:

1. **T130 P2** - Add a build-output contract audit for public machine-readable endpoints.
2. **T131 P2** - Bring build-output audits into the weekly quality-gates workflow.
3. **Sharpen T104/T125/T127** - Keep existing fixture, Pagefind, and JSON Feed items specific instead of duplicating them.

## Evidence Reviewed

Current repo state:

- Current head: `9070d4d test: add rendered schema audit`.
- Latest deploy for `9070d4d` completed successfully in run `26960045875`.
- `TODO.md` now marks T118 and T126 done.
- The worktree contains uncommitted source/CSS edits for T124 ranking-rationale UI in `public/scripts/main.js`, `src/components/CatalogEntry.astro`, `src/data/project-ranking.mjs`, `src/pages/index.astro`, `src/pages/projects/[slug].astro`, and `src/styles/global.css`; these are implementer-lane changes and were not staged.
- Untracked local `AGENTS.md` remains untracked and should not be staged.

Local files inspected:

- `TODO.md`
- `ROADMAP.md`
- `PROJECT_CONTEXT.md`
- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/data-refresh.yml`
- `.github/workflows/quality-gates.yml`
- `scripts/audit-schema.mjs`
- `scripts/fetch-stars.mjs`
- `scripts/summarize-generated-data.mjs`
- `src/data/generated.d.ts`
- `src/layouts/Base.astro`
- `src/pages/projects.json.ts`
- `src/pages/releases.json.ts`
- `src/pages/feed.json.ts`
- `src/pages/rss.xml.ts`
- `src/pages/releases.xml.ts`
- `src/pages/llms.txt.ts`
- `src/pages/cmdk-data.js.ts`

External sources reviewed:

- GitHub Actions workflow-command docs for `GITHUB_STEP_SUMMARY`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- Pagefind filtering docs: https://pagefind.app/docs/filtering/
- JSON Feed 1.1 spec: https://www.jsonfeed.org/version/1.1/
- llms.txt proposal/spec: https://llmstxt.org/

## Current Product Map Delta

The generated-data path is now better instrumented:

- `fetch-stars` writes `_readme-refresh.json` telemetry.
- `data:summary` publishes README refresh health, profile-feed health, and ranking health.
- `generated.d.ts` documents the README refresh shape.

The rendered HTML path is now better protected:

- `build:ci` runs `schema:audit` after Astro build, HTML repair, SW stamping, and Pagefind indexing.
- `audit-schema.mjs` parses every built JSON-LD block and checks representative home, language, and project routes.

Remaining blind spots are now concentrated in build-output artifacts that are neither normal HTML pages nor generated-data source caches:

- `/projects.json`
- `/releases.json`
- `/cmdk-data.js`
- `/llms.txt`
- rendered feed/index discovery links

## Highest-Value New Work

### T130 - Build-output contract audit for public machine-readable endpoints

- Priority: P2
- Impact: 3/5 because these files are public integration surfaces for feed readers, scripts, LLM agents, and the command palette.
- Effort: 2/5 because the repo already has `audit-schema.mjs` as a pattern for scanning `dist`.
- Risk: Low if the audit validates shape, counts, and URL invariants without pinning exact full payloads.

Recommended implementation shape:

- Add `scripts/audit-public-endpoints.mjs`.
- Parse `dist/projects.json` and require `schemaVersion === 1`, parseable `generatedAt`, count consistency, non-empty projects, absolute detail/repository URLs, and category labels.
- Parse `dist/releases.json` and require `schemaVersion === 1`, count consistency, newest-first dates, release/repository URLs, and optional detail URL only for visible detail repos.
- Parse `dist/cmdk-data.js` by extracting the JSON payload from the `Object.assign` call, not by executing arbitrary JS.
- Validate `dist/llms.txt` against the llms.txt structural convention: H1 first, blockquote summary, H2 sections, and markdown list links with descriptions where useful.
- Confirm built `index.html` advertises the alternate RSS, release RSS, JSON Feed, project JSON, and release JSON links currently declared in `Base.astro`.

### T131 - Weekly build-output audit coverage

- Priority: P2
- Impact: 3/5 because scheduled checks should catch drift in the same output layer users and crawlers consume.
- Effort: 2/5 if `quality-gates.yml` runs `npm run build:ci` or a bounded build-output audit bundle and publishes compact logs.
- Risk: Medium because weekly jobs can get noisy; keep semantic audit advisory per T121 and make build-output failures explicit.

Recommended implementation shape:

- Add a build-output audit step after local source checks in `.github/workflows/quality-gates.yml`.
- Include `schema:audit`; after T125/T130 land, include `search:audit` and `endpoints:audit`.
- Publish a compact Markdown summary through `GITHUB_STEP_SUMMARY`.
- Upload logs and include failing build-output sections in the quality issue body.
- Avoid deploying or writing generated caches back to git.

## Existing Feature Improvements

### T104 refinement - Fixture caches

The existing T104 should absorb the current empty-stub finding. After T118/T126, realistic PR fixtures should include:

- `_stats.json`
- `_stars.json`
- `_meta.json`
- `_releases.json`
- `_readmes.json`
- `_readme-refresh.json`
- `_profile-projects.json`

The goal is not just to make imports exist, but to exercise realistic rendered shapes before merge.

### T125 refinement - Pagefind facet audit

Pagefind's docs confirm filters are built from `data-pagefind-filter` values. That supports the existing T125 direction: source markup is not enough; the audit needs to inspect the generated Pagefind index or JS API after `search:index`.

### T127 refinement - JSON Feed validation

The JSON Feed 1.1 spec defines `icon` and `favicon` as feed-level image URLs and requires stable item IDs plus at least one content field. T127 should keep validating those required fields rather than only adding optional images.

## Reliability, Security, Privacy, and Data Safety

- Do not execute built `cmdk-data.js` in Node just to parse it; extract the JSON literal or use a tightly bounded VM if there is no simpler parser.
- Keep endpoint audits structural. Full payload snapshots would make generated data updates brittle.
- Preserve the privacy-first static model. These checks should not add analytics, runtime services, or external deploy-time dependencies.

## UX, Accessibility, and Trust

Machine-readable endpoints are part of the trust surface: feed readers, search integrations, and automation depend on stable shape and discovery. The same principle that drove T126 JSON-LD validation applies here, but the validation should stay invisible to end users unless something fails in CI.

## Architecture and Maintainability

`audit-schema.mjs` is now the local pattern for post-build artifact audits. Reusing that shape for endpoint contracts keeps build-output checks discoverable and avoids overloading source validators with rendered artifact work.

## Prioritized Roadmap

### Now

- [ ] P2 - Add a public endpoint contract audit.
  - Evidence: `projects.json.ts`, `releases.json.ts`, `cmdk-data.js.ts`, `llms.txt.ts`, and `Base.astro` expose public machine-readable contracts without a pre-deploy audit.
  - Verify: `npm run build && npm run endpoints:audit`.

### Next

- [ ] P2 - Run build-output audits in weekly quality gates.
  - Evidence: `quality-gates.yml` does not run `build:ci`; `schema:audit` now only runs through build/deploy/CI.
  - Verify: Manual `quality-gates.yml` run shows schema/search/endpoint audit status in summary and artifacts.

## Quick Wins

- Add JSON Feed spec-backed `icon`/`favicon`/required-field checks to T127.
- Add Pagefind docs-backed filter expectations to T125.
- Add `_readme-refresh.json` and `_profile-projects.json` to the T104 fixture checklist.

## Explicit Non-Goals

- Do not implement T124 source changes from this research lane.
- Do not replace T119. Live post-deploy smoke still matters; T130 catches problems before upload, while T119 confirms what Pages actually serves.
- Do not add analytics or runtime monitoring.
- Do not snapshot every generated project/release row exactly.

## Appendix - Sources

Repository sources:

- `package.json` - `build:ci` runs `schema:audit`; no `endpoints:audit` exists.
- `.github/workflows/quality-gates.yml` - weekly local checks stop at `npm run check`.
- `scripts/audit-schema.mjs` - post-build audit pattern.
- `src/layouts/Base.astro` - alternate RSS/JSON Feed/project JSON/release JSON discovery links and `cmdk-data.js` script dependency.
- `src/pages/projects.json.ts` - public project index schema.
- `src/pages/releases.json.ts` - public release index schema.
- `src/pages/cmdk-data.js.ts` - page-independent command-palette data script.
- `src/pages/llms.txt.ts` - generated llms.txt convention file.
- `src/pages/feed.json.ts` - JSON Feed output missing icon/favicon and explicit validator.
- `TODO.md` - T104, T119, T125, T127 remain open; T118 and T126 are now done.

External sources:

- GitHub Actions workflow-command docs, job summaries and `GITHUB_STEP_SUMMARY`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- Pagefind filtering docs for `data-pagefind-filter`: https://pagefind.app/docs/filtering/
- JSON Feed 1.1 spec for `icon`, `favicon`, item IDs, content fields, and discovery: https://www.jsonfeed.org/version/1.1/
- llms.txt format proposal for root path, H1, blockquote, H2 file lists, and markdown links: https://llmstxt.org/
