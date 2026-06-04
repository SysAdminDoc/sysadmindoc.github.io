# Project Research and Feature Plan

Cycle: 12
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

Cycle 12 reviewed the performance quality surface after Cycle 11 pushed. The repo has two different performance tools: advisory Lighthouse CI in PR CI and a custom Chrome DevTools Protocol audit for bfcache, overflow, event timing, and route-specific failures. T120 already covers making LHCI warnings visible. The uncovered gap is that the custom `audit:perf` harness is still local/manual even though it is the only automated check for bfcache restore and mobile overflow.

Top opportunity:

1. **T136 P2** - Run the custom performance/bfcache audit in an automated quality workflow.

## Evidence Reviewed

Current repo state:

- Current head: `5b25d2a docs: add cycle 11 research queue`.
- Deploy run `26965493572` for `5b25d2a` completed successfully; both the build job and the post-deploy live smoke passed.
- The worktree still has implementer-owned source/search changes in progress. This research cycle avoided those files and updated only planning docs.

Local files inspected:

- `TODO.md`
- `ROADMAP.md`
- `PERFORMANCE_AUDIT.md`
- `PROJECT_CONTEXT.md`
- `README.md`
- `package.json`
- `scripts/audit-performance.mjs`
- `scripts/run-lhci.mjs`
- `lighthouserc.cjs`
- `.github/workflows/ci.yml`
- `.github/workflows/quality-gates.yml`

External sources reviewed:

- web.dev Web Vitals: https://web.dev/articles/vitals
- web.dev bfcache guidance: https://web.dev/articles/bfcache
- GitHub Actions job summaries: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary

## Current Product Map Delta

The repo now has strong build-output contract coverage, but performance coverage is split:

- PR CI runs `npm run lhci:audit` as an advisory step, uploads `.tmp/lhci`, and currently does not fail on Lighthouse warnings.
- Weekly quality gates run generated-data, local source checks, `build:ci`, endpoint/feed/search/schema audits, and semantic advisory output, but do not run `audit:perf`.
- `npm run audit:perf` is documented in README and `PERFORMANCE_AUDIT.md` as the canonical local Chromium audit.
- `scripts/audit-performance.mjs` already supports `--strict`, threshold arguments, JSON output, a configurable base URL, and representative route samples.
- The custom audit measures surfaces that LHCI does not fully cover in the current setup: bfcache restore after history navigation, horizontal overflow, console/network errors, route-specific query behavior, and local event/long-task probes.

The current performance baseline is healthy, but it is only preserved in documentation and manual verification notes. `PERFORMANCE_AUDIT.md` records that the custom harness already caught missing README image requests and mobile project-page overflow before the performance item closed, which makes the harness a proven regression detector rather than a one-off report.

## Highest-Value New Work

### T136 - Run the custom performance/bfcache audit in an automated quality workflow

- Priority: P2
- Impact: 3/5 because bfcache and overflow regressions directly affect repeated navigation and mobile usability, and recent project-page issues were already caught by this harness.
- Effort: 3/5 because CI needs a local built-output server, readiness wait, browser availability handling, and useful summary output.
- Risk: Medium if noisy lab metrics become blocking too early; mitigate with advisory rollout or route-specific thresholds before making failures hard gates.

Recommended implementation shape:

- Add a workflow step after `build:ci` that serves `dist/` locally with `npm run preview` or a stable static server command.
- Wait until the local URL responds before starting the audit.
- Run `npm run audit:perf -- --base <local-url> --strict --out .tmp/performance-audit-ci.json` in the weekly/manual quality workflow first, where generated data is refreshed and the full route set is closer to production.
- Upload `.tmp/performance-audit-ci.json` as an artifact.
- Publish compact Markdown rows to `$GITHUB_STEP_SUMMARY` with route, viewport, LCP, CLS, max event, max long task, bfcache yes/no, overflow yes/no, and issue count.
- If strict thresholds are too noisy on GitHub-hosted runners, start advisory while still publishing status, then promote to a blocking gate once the observed baseline is stable.
- Keep T120 separate: T120 should still summarize LHCI warnings because LHCI has different route coverage and category/resource-budget signals.

## Reliability, Security, Privacy, and Data Safety

- Run against local built output only; no live-site or GitHub API dependency is needed for this audit once `build:ci` has produced `dist/`.
- Do not install browsers at runtime inside the audit script. GitHub-hosted Ubuntu runners usually include Chrome, and the script already honors `CHROME_PATH`.
- Prefer workflow-owned server startup/teardown to embedding server management into `audit-performance.mjs`.
- Avoid strict global LCP thresholds until at least one runner baseline is captured; route-level thresholds or advisory-first reporting reduce false positives.

## Prioritized Roadmap

### Now

- [ ] P2 - Add automated custom performance/bfcache audit reporting.
  - Evidence: `audit:perf` is the only current bfcache/overflow/console-network regression harness and it is local/manual today.
  - Verify: `workflow_dispatch` run shows performance rows in the job summary and uploads `.tmp/performance-audit-ci.json`.

## Explicit Non-Goals

- Do not replace T120 or remove LHCI; LHCI still covers category and resource-budget warnings.
- Do not make new real-user monitoring or analytics changes.
- Do not require Playwright for this task; the existing CDP harness finds Chrome/Edge directly.
- Do not edit active implementer-owned search/Pagefind changes from this research lane.

## Appendix - Sources

Repository sources:

- `PERFORMANCE_AUDIT.md:6-44` - canonical command, measured fields, thresholds, and current v0.18.3 results.
- `PERFORMANCE_AUDIT.md:14-16` - the custom audit previously caught project-page README image and mobile overflow regressions.
- `scripts/audit-performance.mjs:6-23` - configurable base URL, output path, strict mode, thresholds, and route sample list.
- `scripts/audit-performance.mjs:299-310` - snapshot captures LCP, CLS, event timing, long tasks, overflow, console/network issues, and bfcache state.
- `scripts/audit-performance.mjs:398-406` - failure classification covers overflow, bfcache, LCP, CLS, event timing, and console/network issues.
- `scripts/audit-performance.mjs:431-449` - writes JSON and prints compact per-route PASS/WARN rows, with `--strict` converting warnings to failures.
- `package.json` - exposes `audit:perf`, `lhci:audit`, `build:ci`, and quality scripts.
- `.github/workflows/ci.yml:42-58` - runs advisory LHCI and uploads LHCI reports, then runs static a11y; no `audit:perf`.
- `.github/workflows/quality-gates.yml` - runs generated-data, local source checks, build-output audits, and summary/issue handling; no `audit:perf` output or artifact.
- `PROJECT_CONTEXT.md:66` - documents local performance smoke audit after starting preview.
- `PROJECT_CONTEXT.md:97-98` - records the latest local `audit:perf` baseline and the separate LHCI warning baseline.
- `README.md:47-61` - documents `audit:perf` as local Windows performance/bfcache smoke and LHCI as CI/Linux advisory.

External sources:

- web.dev Web Vitals defines Core Web Vitals around loading, interactivity, and visual stability, with thresholds for LCP, INP, and CLS: https://web.dev/articles/vitals
- web.dev bfcache guidance explains that bfcache improves back/forward navigation and recommends using `pageshow.persisted` to detect restores: https://web.dev/articles/bfcache
- GitHub Actions job summaries can display custom Markdown so important run information is visible without digging through logs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary
