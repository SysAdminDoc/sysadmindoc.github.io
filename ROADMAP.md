# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Research-Driven Additions

Added 2026-08-20 from the research pass recorded in RESEARCH.md.

### P0

### P1

### P2

### P3

- [ ] P3 — Evaluate Astro native CSP against the hand-rolled meta-CSP pipeline
  Why: `security.csp` is stable and emits the same meta-tag-with-hashes the repo hand-builds, which could retire several bespoke audit scripts — but the current system works, is heavily test-pinned, and handles the CRLF subtlety, so this is an evaluation, not a migration mandate.
  Evidence: https://docs.astro.build/en/reference/experimental-flags/csp/ (stable guide); `scripts/audit-csp.mjs` + `test/csp-audit.test.mjs` (the largest test).
  Touches: a spike branch enabling `security.csp` with `styleDirective`/`scriptDirective` hashes for the hand-authored inline content; diff the emitted policy against the current one; write the adopt/decline decision into SEARCH_DECISION-style record or CLAUDE.md.
  Acceptance: A documented decision with the emitted-policy diff attached; if adopted, the bespoke hash-generation path is removed with all CSP tests green; if declined, the reason is recorded so it isn't re-investigated.
  Complexity: M

- [ ] P3 — First-party CSP report endpoint on the VPS
  Why: The Reporting API was parked in July because a static site had no report sink. The VPS removes that constraint, and CSP breakage in the field is currently invisible — the build-time audits prove the policy is well-formed, not that real browsers accept it.
  Evidence: Roadmap_Blocked.md P0 resolution note (2026-07-28) parking `Reporting-Endpoints`/`report-to`; the site now runs its own origin behind an edge Caddy that can serve arbitrary headers.
  Note (2026-08-20): this was written as riding on the P1 intake handler, which is now blocked on a notification channel. That dependency was never real — a report sink only appends to a rotated file and needs no delivery channel, so this can ship standalone.
  Touches: a small handler accepting `application/reports+json` (or a Caddy route writing the body to a rotated log), `Reporting-Endpoints` in `deploy/vps/caddy-block.txt`, a `report-to` directive in the meta CSP, and a `smoke:live` assertion for the header.
  Acceptance: A deliberate CSP violation produces a stored report on the VPS, the header is gated by `smoke:live`, and no third party is involved.
  Complexity: S
