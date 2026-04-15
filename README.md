# sysadmindoc.github.io

[![Version](https://img.shields.io/badge/version-0.8.0-blue)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-GitHub%20Pages-black)](https://sysadmindoc.github.io)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro%205-ff5d01)](https://astro.build)

Personal portfolio and project showcase at [sysadmindoc.github.io](https://sysadmindoc.github.io).

## Stack

- **Astro 5** — static site generator with focused client-side enhancements for the homepage experience
- **TypeScript** data layer ([src/data/projects.ts](src/data/projects.ts))
- **Content collections**: featured (9), live apps (22), catalog (138), skills (8)
- **Build-time GitHub API** — stars, repo metadata, release summaries, and cached READMEs
- **GitHub Pages + GH Actions** — scheduled data refresh, type checking, build, and deploy

## Develop

```bash
npm install
npm run fetch-stars   # optional: refresh star cache from GitHub
npm run check         # Astro + TypeScript validation
npm run dev           # http://localhost:4321
npm run build         # output to dist/
npm run preview       # serve dist/
```

`npm run fetch-stars` works best with `GITHUB_TOKEN` set; without it, local runs preserve the existing README cache instead of exhausting the anonymous GitHub rate limit.

## Edit content

All project entries live in **[src/data/projects.ts](src/data/projects.ts)**. Add an entry → `npm run build` → deploy. No hardcoded HTML.

- Featured: show on the bento grid at the top
- Live Apps: for GitHub Pages demos
- Catalog: full searchable repo list (categories: `ps|py|web|ext|kt|sec|media|cs|guide`)
- Skills: animated ring charts in the Stack section

Category filter counts auto-compute from the catalog array.

## Deploy

Pushes to `main` trigger [.github/workflows/deploy.yml](.github/workflows/deploy.yml) which:
1. Refreshes generated GitHub data
2. Runs `npm run check`
3. Builds the Astro site
4. Publishes to GitHub Pages

A cron also runs daily to keep the generated GitHub data fresh without needing a push.

## Layout

```
src/
├── components/      # cards, tag cloud, dividers, greatest-hits modules
├── data/
│   ├── types.ts     # TypeScript schemas
│   ├── projects.ts  # all content (EDIT THIS)
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
├── capture-screenshots.mjs
└── generate-data.mjs      # one-off migration helper
legacy.html           # backup of pre-Astro single-file site
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned work — Tier A/B/C ideas, tech debt, and already-shipped releases.

## License

MIT — see [LICENSE](LICENSE).
