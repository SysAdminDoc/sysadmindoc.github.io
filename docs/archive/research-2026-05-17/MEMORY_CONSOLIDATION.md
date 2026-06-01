# Memory Consolidation

Date: 2026-05-17

## Files and Sources Inspected

Repo-local:

- `AGENTS.md` ignored local agent file.
- `CLAUDE.md` ignored local Claude file.
- `README.md`.
- `CHANGELOG.md`.
- Previous `ROADMAP.md`.
- `package.json`.
- `src/data/projects.ts`.
- `src/data/curated.ts`.
- `src/data/derived.ts`.
- `src/data/types.ts`.
- `scripts/fetch-stars.mjs`.
- `scripts/capture-screenshots.mjs`.
- Ignored `CODEX_CHANGELOG.md`.
- Ignored generated files under `src/data/_*.json`.

Machine-local instruction and memory files were consulted because the session instructions required it. Their durable project facts are summarized here without copying private machine paths into the public repository.

## Durable Facts Extracted

- The site is the public portfolio for Matt Parker / SysAdminDoc.
- It is an Astro static site published through GitHub Pages.
- Public repository safety is a hard boundary. Private/internal repositories and unsafe medical-imaging work must not be promoted.
- Main source of catalog truth is currently `src/data/projects.ts`.
- Generated GitHub data under `src/data/_*.json` is ignored and can become stale.
- `Scripts` and `ChanPrep` are intentionally excluded even though they are public.
- Site counts and project lists need live GitHub reconciliation before large catalog updates.
- `GITHUB_TOKEN` is required for full generated metadata refreshes.

## Reconciled Version State

Current tracked public repo state:

- `package.json`: v0.16.1.
- `README.md`: v0.16.1 badge.
- `CHANGELOG.md`: v0.16.1 entry.
- Git baseline: `7817ea7 v0.16.1: drop TeamStation - repo went PRIVATE on GitHub`.

Stale local state:

- Ignored `CLAUDE.md` described v0.16.0.
- Ignored local portfolio memory described v0.15.0.
- Previous `ROADMAP.md` emphasized v0.7-v0.9 work that has largely shipped or been superseded.

Resolution:

- `PROJECT_CONTEXT.md` is now the canonical tracked project context.
- `ROADMAP.md` is now the canonical tracked improvement plan.
- Tool-local files may remain pointers or working notes, but should not be the sole source of durable facts.

## Instruction Reconciliation

`AGENTS.md`:

- Points to `CLAUDE.md` as the source of truth for repo-specific behavior.
- Is ignored locally and not tracked.

`CLAUDE.md`:

- Contains useful architecture, command, and gotcha notes.
- Is ignored locally and stale at v0.16.0.
- Should not be treated as canonical public project state.

Global local instructions:

- Required session-start repo inspection, recent git log, stack memory, verification, and commit/push behavior.
- Required no accidental publication of private X-ray or medical-imaging work.
- Required preserving ignored local agent files unless explicitly asked.

Conflict handling:

- Version conflict resolved in favor of tracked `package.json`, `README.md`, `CHANGELOG.md`, and git history.
- Catalog count conflict resolved in favor of live GitHub scan and documented drift from ignored generated caches.
- Agent-file canonicality resolved by creating tracked `PROJECT_CONTEXT.md` and leaving ignored tool files intact.

## Prior Roadmap Reconciliation

Previous roadmap ideas retained where still useful:

- Stronger project storytelling.
- `/til` or notes section.
- Year-in-review page.
- Project arcs/timeline.
- Screenshot refresh automation.
- Fuzzy/full-text search.
- Service-worker update toast.
- Content collections or schema migration.
- Dead-code and stale asset checks.

Previous roadmap items downgraded or reframed:

- Generic "modern polish" is now secondary to dependency advisories, catalog drift, and privacy boundaries.
- OG image compression remains useful, but not ahead of sanitizer and catalog correctness.
- Embedded tools should be treated as project-specific proof surfaces, not a broad default feature.

Previous roadmap items removed:

- Version-specific v0.7-v0.9 completion notes that no longer describe future work.
- Source references that were not directly tied to the new priorities.

## Open Conflicts

1. `RadAtlas` is public on GitHub but the local/global instruction set treats X-ray and medical-imaging repositories as privacy-sensitive. This repository cannot safely decide GitHub visibility. The portfolio should keep it excluded until reviewed.
2. Public forks are included in the portfolio catalog in some places, while `scripts/fetch-stars.mjs` intentionally filters forks out of core stats. The roadmap calls for a documented fork policy.
3. Ignored local `CLAUDE.md` is stale. It can be refreshed locally, but it is intentionally not part of this tracked change set.

## Canonicalization Decision

`PROJECT_CONTEXT.md` is the public, tracked memory file. It should be updated when durable facts change. Research-run details live under `.ai/research/2026-05-17/`. Local agent-specific files should remain local unless the user explicitly asks to publish or rewrite them.
