# sysadmindoc.github.io

[![Version](https://img.shields.io/badge/version-0.16.3-blue)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-GitHub%20Pages-black)](https://sysadmindoc.github.io)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro%206-ff5d01)](https://astro.build)

Personal portfolio and project showcase at [sysadmindoc.github.io](https://sysadmindoc.github.io).

## Stack

- **Astro 6** — static site generator with focused client-side enhancements for the homepage experience
- **Schema-checked TypeScript** data layer ([src/data/projects.ts](src/data/projects.ts))
- **Content collections**: featured (9), live apps (22), catalog (173), skills (8)
- **Build-time GitHub API** — stars, repo metadata, release summaries, and cached READMEs
- **GitHub Pages + GH Actions** — scheduled data refresh, type checking, build, and deploy

## Develop

```bash
npm install
npm run fetch-stars   # optional: refresh star cache from GitHub
npm run catalog:audit # compare public GitHub repos with portfolio data
npm run audit:prod    # fail on high/critical production advisories
npm run data:validate # validate project data, screenshots, policy, and command palette coverage
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

## Deploy

Pushes to `main` trigger [.github/workflows/deploy.yml](.github/workflows/deploy.yml) which:
1. Installs dependencies with `npm ci`
2. Audits high/critical production advisories
3. Audits public GitHub repo drift against the portfolio catalog
4. Validates project data, screenshots, policy exceptions, and command palette coverage
5. Refreshes generated GitHub data
6. Runs `npm run check`
7. Builds the Astro site
8. Publishes to GitHub Pages

A cron also runs daily to keep the generated GitHub data fresh without needing a push.

## Layout

```
src/
├── components/      # cards, tag cloud, dividers, greatest-hits modules
├── data/
│   ├── types.ts     # TypeScript schemas
│   ├── categories.ts
│   ├── projects.ts  # all content (EDIT THIS)
│   ├── catalog-policy.json
│   └── _*.json      # generated GitHub cache files (gitignored)
├── layouts/Base.astro
├── pages/
│   ├── index.astro
│   ├── now.astro
│   ├── releases.astro
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
├── capture-screenshots.mjs
└── generate-data.mjs      # one-off migration helper
legacy.html           # backup of pre-Astro single-file site
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned work, active roadmap tiers, and shipped items.

## License

MIT — see [LICENSE](LICENSE).
