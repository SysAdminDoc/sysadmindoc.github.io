# Project Research and Feature Plan

Cycle: 3
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

The implementer drained additional performance/CI work after Cycle 2: critical first-viewport CSS is shipped, Lighthouse CI advisory budgets are wired into PR CI, and `PROJECT_CONTEXT.md` records successful CI evidence plus remaining Lighthouse warnings. Cycle 3 focuses on making advisory signals actionable instead of hidden: Lighthouse warnings should appear in job summaries, semantic-audit results should appear in weekly quality summaries/issues, and open Dependabot PRs should be triaged against current `main` before merge because one branch is stale enough to show `package.json` version `0.17.0`.

Top opportunities:

1. **T120 P2** - Publish LHCI warning summaries in PR/job output, not just artifacts.
2. **T121 P2** - Surface semantic-audit status in weekly quality summaries and issues.
3. **T122 P1** - Triage stale Dependabot PRs against current `main` before merge.

## Evidence Reviewed

Current repo state:

- `git pull --rebase` was up to date before this cycle.
- Worktree was clean except untracked local `AGENTS.md`.
- Latest relevant commits:
  - `ab5354d perf(css): inline critical first viewport styles`
  - `db5a958 ci: add advisory lighthouse budget`
  - `c6d26ff ci: bound lighthouse advisory runtime`
  - `aa2f014 ci: fix lighthouse chrome launch`
  - `f6b81fb docs: record lighthouse ci evidence`

Files inspected:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/quality-gates.yml`
- `.github/workflows/data-refresh.yml`
- `lighthouserc.cjs`
- `scripts/run-lhci.mjs`
- `scripts/audit-semantic-index.mjs`
- `PROJECT_CONTEXT.md`
- `PERFORMANCE_AUDIT.md`
- `README.md`
- `TODO.md`

Validation/run evidence:

- Latest deploy for `f6b81fb` was in progress at initial inspection.
- Previous deploys for the performance/LHCI commits were green.
- Manual `ci.yml` run `26952960465` is recorded in `PROJECT_CONTEXT.md` as passing while LHCI warnings remained advisory: homepage performance score 0.7, TBT 1988.5ms, third-party count 3.
- Local `npm run lhci:audit` on Windows exits cleanly by design because Chrome cleanup can fail with `EPERM`; CI/Linux is the canonical LHCI runner.
- Local `semantic:audit` from the VMware mapped path failed resolving `typescript` from `Z:\repos\...`, reinforcing the already-documented safe-local-build path rather than creating a new source-code item.

GitHub PR evidence:

- PR #9: https://github.com/SysAdminDoc/sysadmindoc.github.io/pull/9
  - Branch: `dependabot/npm_and_yarn/content-safety-1c56996e79`
  - Last updated: 2026-06-01
  - Check: `verify` failed in run `26789217704`
  - Branch `package.json` reports version `0.17.0`.
- PR #12: https://github.com/SysAdminDoc/sysadmindoc.github.io/pull/12
  - Astro 6.4.4 branch; mergeable; `verify` passed in run `26950603757`.
- PR #13: https://github.com/SysAdminDoc/sysadmindoc.github.io/pull/13
  - GitHub Actions group branch; mergeable; `verify` passed in run `26952676058`.

External sources reviewed:

- Lighthouse CI configuration docs: https://googlechrome.github.io/lighthouse-ci/docs/configuration.html
- Lighthouse CI architecture docs: https://googlechrome.github.io/lighthouse-ci/docs/architecture.html
- GitHub workflow artifact docs: https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts

## Current Product Map Delta

The current release-quality surface now includes:

- PR CI with unit tests, validation, build, advisory Lighthouse CI, uploaded LHCI reports, and advisory static a11y.
- Weekly quality gates with production audit, catalog audit, semantic audit, local validation/checks, uploaded logs, and issue creation for production/catalog failures.
- A local performance audit that is canonical on Windows, with LHCI canonical in CI/Linux.

The gap is not that these tools are absent. The gap is that advisory results are too easy to miss: LHCI warnings are in uploaded files, and semantic-audit output is uploaded but not represented in the weekly summary or issue body.

## Feature Inventory Delta

| Feature | Current state | Gap |
| --- | --- | --- |
| Lighthouse CI advisory budget | Runs in PR/manual CI, warning-only, uploads filesystem reports | No parsed warning summary in GitHub job output. |
| Weekly semantic audit | Runs as `semantic_audit`, captures exit code and uploads log | Result omitted from summary, issue body, and fail condition. |
| Dependabot PR queue | Three open PRs: content-safety, Astro, GitHub Actions | PR #9 is stale/failing on a v0.17.0 branch while current source is v0.18.3. |

## Highest-Value New Work

### T120 - Publish Lighthouse CI warning summaries in PR/job output

- Priority: P2
- Why now: T27 shipped the budget, and real warnings already exist; artifacts alone are weak visibility.
- Impact: 3/5 because advisory budgets only help if reviewers can see the warnings quickly.
- Effort: 2/5 for a parser over `.tmp/lhci` assertion output or a wrapper that captures LHCI stderr/stdout into `$GITHUB_STEP_SUMMARY`.
- Risk: Low if warnings remain non-blocking.

### T121 - Include semantic-audit status in weekly quality summaries and issues

- Priority: P2
- Why now: The semantic audit is intentionally advisory, but hidden advisory output decays into no signal.
- Impact: 3/5 because category-drift and near-duplicate catalog hints are maintenance signals, not release blockers.
- Effort: 1/5 for workflow summary/issue-body wiring; 2/5 if adding JSON output to the script.
- Risk: Low if the fail condition remains focused on hard gates.

### T122 - Triage stale Dependabot PRs against current `main`

- Priority: P1
- Why now: PR #9 is stale and failing while still mergeable, which creates a realistic accidental-regression path.
- Impact: 4/5 because package/version/script regressions can undo recently shipped deploy/test hardening.
- Effort: 1/5 to close/recreate the stale branch or request Dependabot refresh; 2/5 to merge current passing PRs with full validation.
- Risk: Low if source changes happen in the build lane and each PR is validated from current `main`.

## Prioritized Roadmap

### Now

- [ ] P1 - Triage stale Dependabot PRs against current `main`.
  - Evidence: PR #9 branch still says version `0.17.0` and has a failing check; PR #12/#13 are current enough to have passing checks.
  - Verify: `gh pr view 9 --json statusCheckRollup,updatedAt,url`; inspect branch `package.json`; close/recreate or rebase before any merge.

### Next

- [ ] P2 - Publish LHCI warning summaries in CI job output.
  - Evidence: CI uploads `.tmp/lhci` but does not summarize warning assertions.
  - Verify: Manual/PR CI summary lists route, audit id, observed value, and threshold for warnings.

- [ ] P2 - Include semantic-audit status in weekly quality summaries and issues.
  - Evidence: `semantic_audit.exit_code` is captured but unused in summary/issue/fail sections.
  - Verify: Manual `quality-gates.yml` run summary includes semantic-audit status.

## Non-goals

- Do not turn LHCI warnings into blocking checks yet; T27 explicitly shipped an advisory budget.
- Do not turn semantic-audit category hints into automatic failures; the decision doc keeps them as local advisory maintenance prompts.
- Do not merge dependency PRs from this research lane. The build machine owns source/package changes.

## Appendix - Sources

Repository sources:

- `.github/workflows/ci.yml:46-55` - advisory LHCI run and artifact upload.
- `lighthouserc.cjs:17-34` - warning assertions and filesystem upload target.
- `PROJECT_CONTEXT.md:75` - actual LHCI warnings from run `26952960465`.
- `.github/workflows/quality-gates.yml:51-63` - semantic audit step captures output/exit code.
- `.github/workflows/quality-gates.yml:68-87` - summary omits semantic audit.
- `.github/workflows/quality-gates.yml:92-141` - issue/fail logic ignores semantic audit.
- `PROJECT_CONTEXT.md:144` - semantic audit is advisory catalog-maintenance signal.

GitHub sources:

- PR #9 stale/failing content-safety branch: https://github.com/SysAdminDoc/sysadmindoc.github.io/pull/9
- PR #12 passing Astro branch: https://github.com/SysAdminDoc/sysadmindoc.github.io/pull/12
- PR #13 passing GitHub Actions branch: https://github.com/SysAdminDoc/sysadmindoc.github.io/pull/13
- Failed PR #9 check run: https://github.com/SysAdminDoc/sysadmindoc.github.io/actions/runs/26789217704
- Passing PR #12 check run: https://github.com/SysAdminDoc/sysadmindoc.github.io/actions/runs/26950603757
- Passing PR #13 check run: https://github.com/SysAdminDoc/sysadmindoc.github.io/actions/runs/26952676058

External sources:

- Lighthouse CI configuration docs: https://googlechrome.github.io/lighthouse-ci/docs/configuration.html
- Lighthouse CI architecture docs: https://googlechrome.github.io/lighthouse-ci/docs/architecture.html
- GitHub workflow artifact docs: https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts
