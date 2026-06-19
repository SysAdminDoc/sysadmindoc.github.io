# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.18.5
Last normalized: 2026-06-17

## Research-Driven Additions

### P2

- [ ] P2 — Add proof coverage reporting for recommended and live projects
  Why: Competitor and hiring research favor explicit project context/outcome evidence, but authoring more case studies is blocked; coverage reporting can prioritize future human-written proof without fabricating content.
  Evidence: `src/data/proof.ts`, `src/data/curated.ts`, `scripts/validate-project-data.mjs`, `scripts/summarize-generated-data.mjs`, `Roadmap_Blocked.md`.
  Touches: `scripts/summarize-generated-data.mjs` or `scripts/validate-project-data.mjs`, `src/data/proof.ts`, tests for generated summary/validation output.
  Acceptance: A local command reports proof and case-study coverage by Greatest Hits, recommended, live, and language-lane buckets; it fails only for already-enforced promises and otherwise emits an actionable missing-proof list.
  Complexity: S

### P3

- [ ] P3 — Rehearse Playwright 1.61 after interaction smoke is stable
  Why: Playwright 1.61 is current, but the interaction suite must be deterministic before changing the browser test runtime.
  Evidence: `package.json`, `playwright.interactions.config.mjs`, Playwright 1.61 release notes, `npm outdated --json`.
  Touches: `package.json`, `package-lock.json`, Playwright configs, rendered audit baselines if output changes.
  Acceptance: A trial branch or local rehearsal records whether `@playwright/test` 1.61 can replace 1.60 with all Playwright audits passing; if not, the blocker is documented without changing the active dependency.
  Complexity: S

- [ ] P3 — Rehearse Sharp 0.35 and TypeScript 6 in isolated upgrade slices
  Why: `npm outdated --json` shows Sharp 0.35.1 and TypeScript 6.0.3 available, but both touch image-generation and type-checking surfaces where this repo has custom audits.
  Evidence: `package.json`, `package-lock.json`, `scripts/audit-image-pipeline.mjs`, `scripts/generate-screenshot-thumbnails.mjs`, `scripts/lib/`, Sharp 0.35 release notes, `npm outdated --json`.
  Touches: `package.json`, `package-lock.json`, image pipeline scripts, TS/AST helper scripts under `scripts/lib/`, `test/`, rendered/image baselines if output changes.
  Acceptance: Each major upgrade is attempted separately with `npm test`, `npm run check`, `npm run build:ci`, `npm run images:audit`, and browser audits where output changes; only dependency bumps with all gates green are merged.
  Complexity: S
