# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Research-Driven Additions

Added 2026-08-20 from the research pass recorded in RESEARCH.md.

### P0

### P1

### P2

### P3

- [ ] P3 — First-party CSP report endpoint on the VPS
  Why: The Reporting API was parked in July because a static site had no report sink. The VPS removes that constraint, and CSP breakage in the field is currently invisible — the build-time audits prove the policy is well-formed, not that real browsers accept it.
  Evidence: Roadmap_Blocked.md P0 resolution note (2026-07-28) parking `Reporting-Endpoints`/`report-to`; the site now runs its own origin behind an edge Caddy that can serve arbitrary headers.
  Note (2026-08-20): this was written as riding on the P1 intake handler, which is now blocked on a notification channel. That dependency was never real — a report sink only appends to a rotated file and needs no delivery channel, so this can ship standalone.
  Touches: a small handler accepting `application/reports+json` (or a Caddy route writing the body to a rotated log), `Reporting-Endpoints` in `deploy/vps/caddy-block.txt`, a `report-to` directive in the meta CSP, and a `smoke:live` assertion for the header.
  Acceptance: A deliberate CSP violation produces a stored report on the VPS, the header is gated by `smoke:live`, and no third party is involved.
  Complexity: S
