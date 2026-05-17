# sysadmindoc.github.io

[![Version](https://img.shields.io/badge/version-0.16.11-blue)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-GitHub%20Pages-black)](https://sysadmindoc.github.io)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro%206-ff5d01)](https://astro.build)

Personal portfolio and project showcase at [sysadmindoc.github.io](https://sysadmindoc.github.io).

## Stack

- **Astro 6** — static site generator with focused client-side enhancements for the homepage experience
- **Schema-checked TypeScript** data layer ([src/data/projects.ts](src/data/projects.ts))
- **Content collections**: featured (9), live apps (22), catalog (173), skills (8)
- **Build-time GitHub API** — stars, repo metadata, release summaries, and cached READMEs
- **Generated timeline** — year-in-review page built from release, push, and changelog evidence
- **Archive decisions** — public-safe anti-portfolio for retired, moved, or held-back project surfaces
- **Static full-text search** — Pagefind index over rendered project pages and README excerpts
- **Public-safe notes policy** — `/til` stays parked until a reviewed note corpus exists
- **GitHub Pages + GH Actions** — split data refresh, type checking, build, and deploy

## Develop

```bash
npm install
npm run fetch-stars   # optional: refresh star cache from GitHub
npm run catalog:audit # compare public GitHub repos with portfolio data
npm run audit:prod    # fail on high/critical production advisories
npm run data:validate # validate project data, screenshots, policy, and command palette coverage
npm run assets:audit  # detect stale screenshots and unreferenced source/public modules
npm run data:summary  # summarize generated GitHub metadata freshness and integrity
npm run search:index   # build Pagefind static search index under dist/pagefind
npm run check         # project data + Astro + TypeScript validation
npm run dev           # http://localhost:4321
npm run build         # validate data, then output to dist/
npm run preview       # serve dist/
```

`npm run fetch-stars` works best with `GITHUB_TOKEN` set; without it, local runs preserve the existing README cache instead of exhausting the anonymous GitHub rate limit.

## Edit content

All project entries live in **[src/data/projects.ts](src/data/projects.ts)** and are validated by **[scripts/validate-project-data.mjs](scripts/validate-project-data.mjs)**. Add an entry -> `npm run data:validate` -> `npm run build` -> deploy. Live apps also need a tracked screenshot in `public/screenshots/<slug>.jpg`.

- Featured: show on the bento grid at the top
- Live Apps: for GitHub Pages demos
- Catalog: full searchable repo list (categories: `ps|py|web|ext|kt|sec|media|cs|guide|fork|other|cpp`)
- Skills: animated ring charts in the Stack section

Category filter counts auto-compute from the catalog array.

Optional proof-oriented project detail sections live in **[src/data/proof.ts](src/data/proof.ts)**. Each proof record must point at an existing project route and include source URLs; `npm run data:validate` enforces the shape.

Public notes/TIL content is intentionally not published until a durable reviewed source corpus exists. See **[NOTES_FEED_POLICY.md](NOTES_FEED_POLICY.md)** before adding a `/til`, `/notes`, or notes RSS feed.

## Deploy

Pushes to `main` trigger [.github/workflows/deploy.yml](.github/workflows/deploy.yml) which:
1. Installs dependencies with `npm ci`
2. Audits high/critical production advisories
3. Audits public GitHub repo drift against the portfolio catalog
4. Validates project data, screenshots, policy exceptions, and command palette coverage
5. Audits stale screenshots and unreferenced source/public modules
6. Requires the workflow `GITHUB_TOKEN`
7. Refreshes generated GitHub data for that workflow run
8. Uploads a generated-data freshness summary artifact
9. Runs `npm run check`
10. Builds the Astro site
11. Publishes to GitHub Pages

The scheduled metadata refresh is split into [.github/workflows/data-refresh.yml](.github/workflows/data-refresh.yml). It runs daily and on demand, refreshes generated GitHub data without deploying, writes the same freshness summary to the job summary, and uploads `github-data-refresh-summary`.

[.github/workflows/quality-gates.yml](.github/workflows/quality-gates.yml) runs weekly and on demand. It reports production dependency audit status, public catalog drift, data validation, asset/reference checks, and Astro diagnostics. If production audit or catalog drift fails, it opens or updates a GitHub issue with the relevant logs. [.github/dependabot.yml](.github/dependabot.yml) keeps npm and GitHub Actions dependencies moving weekly.

## Layout

```
src/
├── components/      # cards, tag cloud, dividers, greatest-hits modules
├── data/
│   ├── types.ts     # TypeScript schemas
│   ├── categories.ts
│   ├── projects.ts  # all content (EDIT THIS)
│   ├── proof.ts
│   ├── archive.ts
│   ├── catalog-policy.json
│   └── _*.json      # generated GitHub cache files (gitignored)
├── layouts/Base.astro
├── pages/
│   ├── index.astro
│   ├── now.astro
│   ├── search.astro
│   ├── releases.astro
│   ├── timeline.astro
│   ├── archive.astro
│   ├── rss.xml.ts
│   ├── lang/[slug].astro
│   ├── og/[slug].png.ts
│   └── projects/[slug].astro
└── styles/global.css
public/
├── manifest.json
├── robots.txt
├── sw.js
├── screenshots/      # captured live-app thumbnails
└── scripts/          # theme.js, main.js, cmdk.js
scripts/
├── fetch-stars.mjs        # GitHub data refresh (build-time)
├── audit-catalog.mjs      # public repo drift audit
├── validate-project-data.mjs
├── audit-assets.mjs
├── summarize-generated-data.mjs
├── capture-screenshots.mjs
└── generate-data.mjs      # one-off migration helper
SEARCH_DECISION.md    # Pagefind vs client-side search decision
NOTES_FEED_POLICY.md  # public-safe activation criteria for future notes/TIL
legacy.html           # backup of pre-Astro single-file site
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned work, active roadmap tiers, and shipped items.

## License

MIT — see [LICENSE](LICENSE).
