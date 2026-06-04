# Project Research and Feature Plan

Cycle: 6
Date: 2026-06-04
Project: `SysAdminDoc/sysadmindoc.github.io`
Source of truth for open work: `TODO.md`
Current source version: `0.18.3`

## Executive Summary

The implementer lane continued draining the queue after Cycle 5: Dependabot triage is complete, `marked` is at 18.0.4, Astro is at 6.4.4, T123 ranking summary guards are shipped, and the latest deploy for `aa82885` succeeded. At research time, the worktree contained uncommitted source/CSS edits for T97, adding an above-the-fold proof strip fed by `projectProof`. Those source edits were implementer-owned and were not staged by this research pass.

Cycle 6 focuses on guardrails around that proof-strip direction and the first-viewport CSS split. The proof strip is valuable, but hardcoding its selected claims in `index.astro` would make claim maintenance harder than the existing `projectProof` data contract. Likewise, every first-viewport feature now needs duplicated critical/global CSS, and there is no audit that catches missing or stale parity.

Top opportunities:

1. **Refine T111** - Astro is now 6.4.4, so the `fix-html-structure` reassessment should happen on the new version.
2. **T128 P2** - Move homepage proof-strip highlight selection into validated data.
3. **T129 P2** - Add a critical/global CSS parity audit for first-viewport selectors.

## Evidence Reviewed

Current repo state:

- Current head: `aa82885 feat: add ranking summary guard`.
- Latest deploy for `aa82885` completed successfully in run `26957729879`.
- At research time, the worktree was dirty with implementer-owned source edits in `src/pages/index.astro`, `src/styles/critical.css`, and `src/styles/global.css`; untracked local `AGENTS.md` remained untracked and should not be staged.
- `TODO.md` now marks T122 and T123 done. Open nearby work includes T97, T118-T121, T124-T127.

Files inspected:

- `src/pages/index.astro`
- `src/styles/critical.css`
- `src/styles/global.css`
- `src/data/proof.ts`
- `src/data/types.ts`
- `scripts/validate-project-data.mjs`
- `TODO.md`
- `PROJECT_CONTEXT.md`

Relevant in-progress source observations:

- `src/pages/index.astro` imports `projectProof` and defines a local `heroProofItems` array with three hardcoded proof cards.
- Those proof cards duplicate short metrics and copy near the render site: `80% IOPS`, `67 checks`, and `40+ effects`.
- `scripts/validate-project-data.mjs` validates generic `projectProof` record fields and source URLs, but it does not validate homepage-specific highlight fields, selected slugs, short metrics, card copy length, or source-label availability.
- `.hero-proof-*` rules are duplicated in both `src/styles/critical.css` and `src/styles/global.css`, plus mobile overrides in both files.

## Current Product Map Delta

If T97 lands in the current shape, the homepage will gain source-backed proof cards above the stat counters. That improves visitor trust and addresses the highest-priority experience item. The remaining risk is maintainability: the homepage-specific values become page-local constants instead of typed data beside the proof records and validator.

The CSS architecture also now depends on a manual first-viewport split:

- `critical.css` must contain above-the-fold styles so first paint is stable.
- `global.css` must contain the full interactive/hover/focus version.
- New first-viewport components can drift between the two files unless an audit makes the intended overlap explicit.

## Highest-Value New Work

### T128 - Move homepage proof-strip highlight selection into validated data

- Priority: P2
- Why now: The proof strip is being implemented from `projectProof`, but selected proof metrics/copy are local to `index.astro`, so future proof edits can drift away from the homepage claims.
- Impact: 3/5 because homepage proof claims are trust-sensitive and should have the same validation posture as project detail proof records.
- Effort: 2/5 to add a typed highlight array and extend the existing data validator.
- Risk: Low if the current UI stays unchanged and only the data source moves.

Recommended implementation shape:

- Add `homepageProofHighlights` or equivalent to `src/data/proof.ts`.
- Define typed fields: `repo`, `label`, `value`, `copy`, and a source selector or source note.
- Validate that each selected repo exists in `projectProof`, each value/copy is non-empty and short enough for mobile, and each card resolves to a valid proof source or evidence string.
- Keep the `index.astro` render loop simple and data-driven.

### T129 - Add critical/global CSS parity audit for first-viewport selectors

- Priority: P2
- Why now: T16 split first-viewport CSS, and T97 adds another first-viewport component with duplicated critical/global selectors. Missing one side can create first-paint layout shifts, unstyled content, or hover/focus behavior that only appears after the async stylesheet loads.
- Impact: 3/5 because the critical CSS path is now a release-quality lever for the homepage.
- Effort: 2/5 for a selector-level audit with an allowlist for intentionally critical-only or global-only selectors.
- Risk: Medium if implemented too strictly; keep it structural instead of comparing every declaration byte-for-byte.

Recommended implementation shape:

- Add a CSS audit that extracts class selectors from `critical.css` and `global.css`.
- Assert first-viewport selectors listed in a small allowlist/prefix set exist in both files when they are expected to be shared.
- Flag missing mobile override parity for selected components such as hero stats, hero signals, and proof strip.
- Do not require identical declarations; global CSS can include richer hover/focus transitions while critical CSS stays minimal.

## Prioritized Roadmap

### Now

- [ ] P2 - Move proof-strip selections into validated data once T97 lands.
  - Evidence: Current T97 worktree hardcodes proof card selections/metrics in `index.astro`; validator only checks generic proof records.
  - Verify: `npm run data:validate && npm run build`.

### Next

- [ ] P2 - Add critical/global selector parity audit for first-viewport components.
  - Evidence: Current proof-strip styles are duplicated in both CSS files with no guard.
  - Verify: `npm run assets:audit` or a new `npm run css:audit` catches a deliberately missing shared first-viewport selector.

- [ ] P2 - Re-test T111 on Astro 6.4.4.
  - Evidence: Dependabot triage merged/regenerated Astro 6.4.4 after the original T111 was written.
  - Verify: `npm run build`; inspect whether `scripts/fix-html-structure.mjs` is still mutating output; convert to assert-or-noop if upstream output is fixed.

## Non-goals

- Do not modify the in-progress T97 source implementation from this research lane.
- Do not require identical critical/global CSS declarations.
- Do not create a second proof data model unrelated to `projectProof`.

## Appendix - Sources

Repository sources:

- `src/pages/index.astro` worktree diff - in-progress T97 proof strip and local `heroProofItems`.
- `src/styles/critical.css` worktree diff - duplicated `.hero-proof-*` first-paint rules.
- `src/styles/global.css` worktree diff - duplicated `.hero-proof-*` full stylesheet rules.
- `src/data/proof.ts:3-159` - existing source-backed project proof records.
- `scripts/validate-project-data.mjs:373-386` - existing proof-record validation.
- `TODO.md:143` - T97 proof strip remained open while source work was in progress during this research pass.
- `TODO.md:155` - T109 refinement after Cycle 5.
- `TODO.md:247` - T123 now done.
