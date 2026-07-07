# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.19
Last normalized: 2026-06-29

## Research-Driven Additions

### P1

### P2

- [ ] P2 — Synchronize ignored maintainer docs and version metadata
  Why: Maintainer-facing ignored docs still mention older versions/status while package and README are at v0.21.8, which can mislead future autonomous runs.
  Evidence: `ROADMAP.md`, maintainer notes, `PERFORMANCE_AUDIT.md`, `IMAGE_PIPELINE.md`, `package.json`, `README.md`.
  Touches: maintainer notes, `ROADMAP.md`, `PERFORMANCE_AUDIT.md`, `IMAGE_PIPELINE.md`, `README.md` only if public setup text changes.
  Acceptance: Maintainer docs reflect the current shipped version, Astro 7/Vite 8 state, current audit commands, and no stale "blocked Astro 7" or mismatched status claims remain.
  Complexity: S
