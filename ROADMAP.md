# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Research-Driven Additions

Added 2026-08-20 from the research pass recorded in RESEARCH.md.

### P0

### P1

### P2

- [ ] P2 — AI-build colophon page (Willison pattern) scaffolded from public data
  Why: For a portfolio selling AI implementation, a colophon showing how the 22 live apps were actually built (commits, cadence, tooling, AI assistance disclosed) is proof-of-competence, marketing, and an honesty signal in one page — the strongest differentiator surfaced by the landscape research that isn't blocked on long-form human writing.
  Evidence: https://tools.simonwillison.net/colophon and https://simonwillison.net/2025/Mar/13/tools-colophon/; hiring-signal sources in RESEARCH.md (reviewers inspect commit history to distinguish real building from AI output).
  Touches: `npm run scaffold:route -- colophon` + the registration surfaces it names, a build-time generator deriving per-app records from existing `_meta.json`/`_releases.json`/`_stats.json` (first/last commit, release count, stack), a short `aiAssistance` note field in `src/data/projects.ts` per live app (one factual sentence each, owner-reviewable), Pagefind/sitemap/OG registration, tests.
  Acceptance: `/colophon/` renders a per-live-app provenance table from generated data plus the disclosure notes, passes all route audits, and is linked from the footer and `/ai/` proof block.
  Complexity: M

### P3

- [ ] P3 — Publish a deliberate AI-crawler policy in robots.txt
  Why: The current robots.txt is allow-all by default rather than by decision; a site selling AI services wants answer-engine and agent bots (citations) while the owner may want training-only bots excluded — either way the policy should be explicit and documented.
  Evidence: `public/robots.txt` (allow-all, 153 bytes); https://github.com/ai-robots-txt/ai.robots.txt taxonomy; llms.txt adoption evidence in RESEARCH.md.
  Touches: `public/robots.txt` (explicit sections: allow search/answer/agent bots; owner-decided stance on training-only crawlers), a sentence on the colophon page documenting the policy, `test/` robots assertion if one exists.
  Acceptance: robots.txt enumerates bot classes deliberately with a comment linking the policy rationale; the colophon states it in one line.
  Complexity: S

- [ ] P3 — Evaluate Astro native CSP against the hand-rolled meta-CSP pipeline
  Why: `security.csp` is stable and emits the same meta-tag-with-hashes the repo hand-builds, which could retire several bespoke audit scripts — but the current system works, is heavily test-pinned, and handles the CRLF subtlety, so this is an evaluation, not a migration mandate.
  Evidence: https://docs.astro.build/en/reference/experimental-flags/csp/ (stable guide); `scripts/audit-csp.mjs` + `test/csp-audit.test.mjs` (the largest test).
  Touches: a spike branch enabling `security.csp` with `styleDirective`/`scriptDirective` hashes for the hand-authored inline content; diff the emitted policy against the current one; write the adopt/decline decision into SEARCH_DECISION-style record or CLAUDE.md.
  Acceptance: A documented decision with the emitted-policy diff attached; if adopted, the bespoke hash-generation path is removed with all CSP tests green; if declined, the reason is recorded so it isn't re-investigated.
  Complexity: M

- [ ] P3 — First-party CSP report endpoint on the VPS (rides the intake handler)
  Why: The Reporting API was parked because the static site had no report sink; the intake-form handler (P1) gives it one for near-zero marginal cost, turning silent CSP breakage in the field into a signal.
  Evidence: Roadmap_Blocked.md P0 resolution note (2026-07-28) parking `Reporting-Endpoints`/`report-to`; the P1 intake endpoint above.
  Touches: the P1 handler binary (accept `application/reports+json` on `/api/reports`, log-rotate to disk), edge `Reporting-Endpoints` header in `deploy/vps/caddy-block.txt`, CSP `report-to`/`report-uri` addition, `smoke:live` header assertion.
  Acceptance: A deliberate CSP violation in a test page produces a stored report on the VPS; headers verified by `smoke:live`; no third-party involved.
  Complexity: S (after P1 intake endpoint lands)
