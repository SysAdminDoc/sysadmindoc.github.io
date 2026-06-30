# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.21.6
Last normalized: 2026-06-29

## Research-Driven Additions

### P2

- [ ] P2 — Re-trial the Astro 7 and Vite 8 upgrade path
  Why: The blocked upgrade note says Astro 7 was not stable, but current dependency research reports Astro 7.0.3 and Vite 8.1.0 as latest majors, so the blocker needs fresh evidence.
  Evidence: `Roadmap_Blocked.md`, `npm run deps:audit`, Astro 7 upgrade guide.
  Touches: `package.json`, `package-lock.json`, `astro.config.mjs`, `scripts/*audit*.mjs`, `tests/playwright`, `Roadmap_Blocked.md`
  Acceptance: A local trial records pass/fail against `npm test`, `npm run check`, `npm run build:ci`, and interaction audits; compatible versions are adopted, or the blocked item is updated with the current concrete failure.
  Complexity: M
