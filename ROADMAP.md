# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Research-Driven Additions

Added 2026-09-04 from the research pass recorded in RESEARCH.md. The 2026-08-20 additions under this heading were all completed and have been removed per the ROADMAP hygiene rule.

### P0

### P1

### P2

### P3

- [ ] P3 — Evaluate declarative WebMCP on the search form during the Chrome origin trial
  Why: Lighthouse now ships an Agentic browsing audit category covering llms.txt, registered WebMCP tools, declarative WebMCP on forms and agent accessibility. A site that sells AI implementation and already invites agent crawlers in `robots.txt` is the natural place to dogfood it. Chrome runs the public origin trial from Chrome 149 to 156.
  Evidence: https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt ; https://developer.chrome.com/blog/ai-webmcp-origin-trial ; https://www.spronta.com/blog/state-of-webmcp-july-2026/ (no mainstream agent consumes WebMCP tools yet, and the API surface still changes between drafts).
  Touches: `src/pages/search.astro`, `src/layouts/Base.astro` (origin-trial token), `deploy/vps/Caddyfile`, `scripts/audit-public-endpoints.mjs`.
  Acceptance: the search form exposes a declarative tool that Chrome's WebMCP surface registers, the origin-trial token is scoped and dated, no runtime JavaScript is added to non-search routes, and the change is reverted cleanly if the trial lapses without adoption.
  Complexity: M
