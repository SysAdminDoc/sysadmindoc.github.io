# Changeset Summary

Date: 2026-05-17

## Files Created or Modified

Root files:

- `PROJECT_CONTEXT.md`: new canonical tracked project context.
- `ROADMAP.md`: replaced stale roadmap with a 2026-05-17 evidence-backed prioritized plan.

Research-run files:

- `.ai/research/2026-05-17/STATE_OF_REPO.md`: local repository reconnaissance memo.
- `.ai/research/2026-05-17/MEMORY_CONSOLIDATION.md`: instruction and memory reconciliation.
- `.ai/research/2026-05-17/SOURCE_REGISTER.md`: local, command, and external source index.
- `.ai/research/2026-05-17/RESEARCH_LOG.md`: process, queries, tools, and saturation notes.
- `.ai/research/2026-05-17/COMPETITOR_MATRIX.md`: competitor and adjacent pattern matrix.
- `.ai/research/2026-05-17/FEATURE_BACKLOG.md`: raw harvested opportunities.
- `.ai/research/2026-05-17/PRIORITIZATION_MATRIX.md`: scored roadmap candidates.
- `.ai/research/2026-05-17/SECURITY_AND_DEPENDENCY_REVIEW.md`: dependency advisories and hardening plan.
- `.ai/research/2026-05-17/DATASET_MODEL_INTEGRATION_REVIEW.md`: data/search/integration opportunities.
- `.ai/research/2026-05-17/CHANGESET_SUMMARY.md`: this summary.

No `CONTINUE_FROM_HERE.md` was created because the required research pass completed.

## Main Findings Converted Into Plan

1. Production dependency advisories are the highest-priority engineering issue.
2. Live GitHub public repo state has drifted from local generated caches and catalog data.
3. Medical-imaging public/private boundaries need explicit review before any promotion.
4. Project memory needed a tracked canonical context file.
5. Static search, content/schema validation, generated data freshness, and proof-oriented project pages are the best follow-on roadmap themes.

## Verification Performed Before Artifact Write

- `npm run check`: passed.
- `npm audit --omit=dev --json`: identified production advisories and failed as expected.
- `npm outdated --json`: identified dependency deltas.
- Live GitHub public repo scans with `gh`.
- Broad secret-pattern scan with `rg`: no hardcoded credential found.

## Verification Performed After Artifact Write

- `git diff --check`: passed.
- `npm run check`: passed, 24 files checked with 0 errors, 0 warnings, 0 hints.
- `npm run build`: passed, 181 pages built.

## Notes

- Ignored local `AGENTS.md`, `CLAUDE.md`, `CODEX_CHANGELOG.md`, and generated `src/data/_*.json` files were not modified.
- No runtime source code was changed in this pass.
