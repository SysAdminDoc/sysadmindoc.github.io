# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.28.0
Last normalized: 2026-07-24

## Research-Driven Additions

### P2

## Deep audit follow-ups (2026-07-25 pass)

### Not audited in the 2026-07-25 pass

These areas were not exercised and may still hold defects:

- Playwright visual-regression baselines — they are Linux-generated and cannot be
  compared on this Windows worktree (see the P2 entries in `Roadmap_Blocked.md`).
- `scripts/audit-csp.mjs` (~34 KB) and `scripts/audit-public-endpoints.mjs`
  (~30 KB) internals — both were run and pass, but their logic was not reviewed.
- `src/pages/og/[slug].png.ts` satori/resvg rendering — output was not visually
  inspected (a redesign of it is already tracked as P0 in `Roadmap_Blocked.md`).
- `scripts/publish-pages.mjs` and the live deploy path — not executed.
- The `/resume/` print stylesheet — not verified in a print preview.
- Pagefind result relevance — already covered by the shipped search corpus spec.
