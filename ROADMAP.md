# Portfolio Roadmap

Open work only. Completed work is recorded in git history and CHANGELOG.md.
Blocked items are tracked in Roadmap_Blocked.md.

Current version: v0.36.0
Last normalized: 2026-07-26
Last researched: 2026-07-27 (RESEARCH.md)

## Research-Driven Additions

### P2

### P3

- [ ] P3 — Warm Pagefind with preload() on search-input focus
  Why: Pagefind 1.5.2 (already installed) exposes `preload()` to fetch the index before the first keystroke, shaving perceived search latency at no ongoing cost.
  Evidence: `node_modules/pagefind` is 1.5.2; `src/pages/search.astro` uses the component UI with no `preload()` warm-up; RESEARCH.md "Modern web platform features".
  Touches: `src/pages/search.astro`.
  Acceptance: The Pagefind index preloads on search-input focus/hover, first-query latency improves, and the relevance corpus, a11y/axe checks, and offline search parity are unregressed.
  Complexity: S
