# Competitor and Adjacent Pattern Matrix

Date: 2026-05-17

This matrix uses "competitor" broadly: direct personal portfolio sites, adjacent developer worklogs, digital gardens, and Astro portfolio templates. The goal is pattern harvesting, not imitation.

| Source | Type | Relevant pattern | Lesson for this repo | Priority impact |
|---|---|---|---|---|
| Lee Robinson, https://leerob.com/ | Developer personal site | Clear current role, writing, code, videos, concise homepage. | Keep the portfolio's public narrative direct; avoid burying the primary identity under too many widgets. | Medium |
| Simon Willison, https://simonwillison.net/ | Worklog, TIL, tools, releases | Public TILs, tools, release notes, tags, frequent dated entries. | A `/til`, `/tools`, or year-in-review page is valuable only if generated from durable source content. | High |
| Julia Evans, https://jvns.ca/ | Writing-first technical site | Clear educational positioning and persistent article archive. | Project pages can teach with short "what this solved" narratives instead of only catalog metadata. | Medium |
| fasterthanli.me, https://fasterthanli.me/ | Long-form technical series | Deep series organization and progress-oriented reading. | Project arcs/timelines could help visitors understand multi-repo systems and long-running rebuilds. | Medium |
| Rauno Freiberg, https://rauno.me/ | Interaction/design portfolio | Strong craft positioning, minimal surface, selected projects. | Keep visual craft consistent, but prioritize proof and catalog trust before another restyle. | Low |
| Paco Coursey, https://paco.me/ | Design-engineer portfolio | Compact Projects/Writing/Now structure. | The existing `/now` data should stay current and could become a lightweight activity signal. | Medium |
| Maggie Appleton, https://maggieappleton.com/ | Digital garden | Essays, notes, patterns, library, now, RSS. | Notes/garden structure can work if there is a review policy and content source. | Medium |
| Brittany Chiang, https://brittanychiang.com/ | Accessible frontend portfolio | About, experience, projects, accessibility-forward positioning. | Project detail pages should include accessibility and platform support facts where available. | Medium |
| Astrofy, https://github.com/manuelernestog/astrofy | Astro portfolio template | Astro-based portfolio conventions. | Useful comparison for metadata, layout, and project structure, but this repo is already more data-rich. | Low |
| Astro Boilerplate, https://github.com/ixartz/Astro-boilerplate | Astro starter | Quality gates, TypeScript, project hygiene conventions. | Borrow CI/dependency hygiene patterns, not the app structure wholesale. | Medium |
| Astroplate, https://github.com/zeon-studio/astroplate | Astro template | Content-heavy Astro site pattern. | Confirms content/schema discipline is common in Astro sites. | Low |
| Automated GitHub portfolio article, https://casraf.dev/2024/08/create-an-automated-portfolio-using-github-and-astro/ | Implementation article | GitHub-powered Astro portfolio generation. | Supports the roadmap direction toward generated catalog audits and public repo reconciliation. | High |

## Cross-Source Patterns

High-confidence patterns:

- Dated worklogs or release feeds make momentum legible.
- TIL/notes sections work when the author has a steady input stream.
- Project pages should explain evidence and decisions, not just list links.
- Public portfolios benefit from strong curation, but catalog-rich portfolios need search and filters.
- Static-site architectures can support high-quality search without hosted services.

Patterns not adopted as roadmap priorities:

- Full redesign around a minimal homepage. This repo's distinctive value is breadth plus evidence.
- Hosted backend search. Static search is a better fit for GitHub Pages.
- Visitor analytics as a primary roadmap item. Build-time and public GitHub evidence answer more immediate trust questions.
