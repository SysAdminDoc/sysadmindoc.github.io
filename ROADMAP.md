# Portfolio Roadmap

Living plan for [sysadmindoc.github.io](https://sysadmindoc.github.io/). Ordered by fit × impact × effort. Move items down to **Shipped** as they land.

**Legend:** `S` ≤ 30 min · `M` ≤ 2 hr · `L` ≤ 1 day · `XL` > 1 day

---

## Next up — v0.7.0 (see below)

> v0.6.0 shipped — all Tier A items and the two highest-impact Tier B items (/now, /healthcare-it) are now live. See [ROADMAP-COMPLETED.md](ROADMAP-COMPLETED.md).

## Next up — v0.9.0 (see below)

> v0.8.0 shipped — Project detail pages now render each repo's README at build time, show the 5 most recent releases inline, display inferred tech-stack chips, and rank related projects by stars × freshness. `/til` still deferred.

### Deferred from v0.7.0

- [ ] **`/til` stream** (~`L`) — markdown-backed Today-I-Learned notes. Needs a content source; the pipeline is trivial once there's material to index. Inspired by simonwillison.net.

## v0.8.0 — creative depth

- [ ] **Year-in-Review template** (~`L` first one) — repos shipped, major releases, lines written, download counts (where available). Annual static post. Inspired by jvns.ca.
- [ ] **Series / multi-part arcs with completion bars** (~`M`) — group related repos (e.g. "Windows debloat suite: 7 of 9 shipped"). Inspired by fasterthanli.me.
- [ ] **Yearly archive snapshots** (~`XL`) — `sysadmindoc.github.io/2024`, `/2025` as frozen portfolio snapshots. Needs build-pipeline rework. Inspired by rauno.me.
- [ ] **Tools gallery with embedded live demos** (~`XL` per tool) — WASM RegEx tester, DICOM tag inspector, PowerShell snippet runner. Inspired by simonwillison.net's Tools.
- [ ] **Anti-portfolio / Graveyard** (~`M`) — archived/abandoned repos with one-line post-mortems. Inversion play. Inspired by maggie's Antilibrary.

## Technical debt & polish (parallel track)

- [ ] **OG card file size** — current 139 PNGs total ~15 MB. Try WebP or smaller gradient detail to halve.
- [ ] **Screenshot refresh cadence** — `npm run capture-screenshots` is manual. Add monthly CI cron that runs in a container with chromium pre-installed, commits diffs.
- [ ] **Dark/light theme: complete light palette** — currently only color-vars override; nav gradient, hero glow, section backgrounds still show dark-tuned values. Either finish the light theme or remove the toggle.
- [ ] **Fuzzy search upgrade** — command palette uses a simple subsequence matcher. Fine for now, but Fuse.js or MiniSearch would handle typos better.
- [ ] **Sitemap** — verify `/projects/<slug>/` routes are all in sitemap-0.xml.
- [ ] **sw.js**: after major content changes, old users may need `Clear site data`. Consider a visible "Site updated — reload" toast when new SW activates.
- [ ] **Content collections** — current data layer is a TS array. Astro's content collections with Zod schema would catch typos and dupes at build time.
- [ ] **Dead-code lint in CI** — stylelint for unused CSS selectors, knip for unused JS exports.
- [x] ~~**Per-project release feed embed** — on `/projects/<slug>/`, show the latest 3 releases from the GitHub API at build time.~~ (v0.8.0, up to 5)
- [ ] **Activity ticker** — currently runtime-fetched from `/events/public`; could be baked in at build.

## Rejected / parked

Not planned unless context changes. Revisit only if the portfolio's purpose shifts.

- **Chiang-style sticky-left / scrolling-right two-pane layout** — clashes with terminal/hacker aesthetic.
- **Ambient music player (à la chris.lu)** — gimmicky for sysadmin brand; Slunder section already owns "music" surface.
- **Mascot / Cool-Bear-style callouts** — too cute; doesn't match voice.
- **Tardis/time-travel easter egg (Chiang)** — Ctrl+K command palette is already the playful surface.
- **Blog** — Matt primarily ships code, not prose. Adding a blog would create maintenance debt without a content source. (TILs at `/til` may replace this if ever needed.)

---

## Shipped

> Moved to ROADMAP-COMPLETED.md.
## Methodology

Ideas enter the roadmap only if they pass three filters:
1. **Fit**: does it match the terminal/sysadmin aesthetic and the "senior shipper" positioning?
2. **Novelty**: is it already covered by existing capability?
3. **Story**: does it tell the viewer something they couldn't learn from my GitHub profile alone?

Research sources (Apr 2026): leerob.io, brittanychiang.com, rauno.me, paco.me, simonwillison.net, jvns.ca, rsms.me, maggieappleton.com, fasterthanli.me, chris.lu.

## Open-Source Research (Round 2)

### Related OSS Projects
- https://github.com/manuelernestog/astrofy — Astro + TailwindCSS portfolio with blog/CV/projects/RSS, 30 themes via `data-theme`
- https://github.com/ixartz/Astro-boilerplate — Astro + TS + React + Tailwind boilerplate (DX tooling: ESLint/Prettier/Husky/Commitlint)
- https://github.com/zeon-studio/astroplate — Astro 5 + Tailwind + TS starter with content collections out of the box
- https://github.com/Gothsec/Astro-portfolio — Astro + React + TS + Tailwind, Figma-handcrafted
- https://github.com/veranikabarel/astro-portfolio — Astro 4 + Tailwind, uses `src/content/*` collections for blog + docs
- https://github.com/uzzii-21/astro-portfolio — Minimal responsive/SEO-friendly Astro portfolio, GH Pages reference deploy
- https://casraf.dev/2024/08/create-an-automated-portfolio-using-github-and-astro/ — Reference post: `defineCollection` with a `GitHubProjectSchema`, fetch repos+READMEs, JSON-cache responses
- https://github.com/topics/astro-portfolio — Topic index (1,445+ repos under portfolio tag)

### Features to Borrow
- Per-theme `data-theme` attribute on `<html>` for instant 30-preset theme switching — Astrofy
- JSON response cache on the GitHub data layer so `npm run fetch-stars` is resumable after rate-limit hits — casraf.dev automated portfolio pattern
- `GitHubProjectSchema` with `defineCollection` validation so malformed `projects.ts` entries fail at `astro check` — casraf.dev
- MDX + Shiki + Expressive Code for syntax-highlighted project write-ups (shadcn/ui Astro template)
- i18n (EN/DE) pattern via Astro's `astro:i18n` — `astro-theme` topic, multilingual portfolio templates
- Terminal-style variant config: all content driven by a single config file for a "Warp terminal" aesthetic (matches your existing sysadmin positioning)
- RSS feed autogen for the "notes" or CHANGELOG section — Astrofy
- Opinionated bento hero grid using Tailwind `grid-cols-subgrid` (2026 Tailwind feature) instead of hand-rolled CSS grid
- Repo + stars aggregation of *starred* repos (not just owned) to surface influences/toolbelt — `astro-theme` topic "auto-gen from your own + starred repos"
- Cloudflare Workers/Pages deploy target as an alternative to GH Pages (faster cold starts, free analytics) — dailynest reference

### Patterns & Architectures Worth Studying
- Build-time GitHub API → JSON cache → content collection (three-stage pipeline) so the site builds offline after first fetch
- `getCollection('project')` + `.sort((a,b)=>a.data.order-b.data.order)` as the single source of truth — lets you delete hand-maintained "featured" arrays
- Astro islands + `client:visible` for the star-ring charts so the main bundle stays <10 KB JS
- GH Actions matrix: scheduled `fetch-stars` job (cron) separate from the PR-triggered `astro check` + `build` — keeps star data fresh without blocking deploys
- Content Collections with Zod for type-safe repo metadata → gives autocomplete in `projects.ts` and catches drift against the GitHub schema
