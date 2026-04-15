# sysadmindoc.github.io v0.2.1

## Overview
Personal portfolio and project showcase site hosted on GitHub Pages.

## Tech Stack
Single-file HTML/CSS/JS. Inline everything. Google Fonts (JetBrains Mono, Outfit). GitHub API for live repo/star counts.

## Build / Run
No build step — just push index.html. GitHub Pages serves it automatically.

## Key Files
- `index.html` — The entire site (~200KB single file)
- `manifest.json` — PWA manifest
- `sw.js` — Service worker for offline caching
- `og.png` — Open Graph preview image
- `robots.txt` / `sitemap.xml` — SEO

## Architecture
- **Hero**: Animated terminal, live repo/star counts from GitHub API, last-active indicator
- **Featured Projects**: Hardcoded bento grid with live star counts via data-repo attributes
- **Live Apps**: 23 GitHub Pages apps with LIVE badges and status checks
- **Catalog**: Full repo listing with search, sort, category filters. Entries are hardcoded HTML. Stars fetched live from API (paginated, cached).
- **Skills**: Animated ring charts
- **About**: Bio + terminal
- **Beyond Code**: Video cards (VEO), Spotify music section with album grid
- **Connect**: Contact links

## Catalog Entry Format
```html
<a href="https://github.com/SysAdminDoc/REPO" target="_blank" rel="noopener" class="ca" data-f="CATEGORY" data-repo="REPO" data-name="REPO" data-desc="DESC"><span class="cdo CATEGORY"></span><span class="cna">REPO</span><span class="cds">DESC</span></a>
```
Categories: ps, py, web, ext, kt, sec, media, cs, guide, fork, other

## Gotchas
- Only list PUBLIC repos — private repos won't return star counts from API
- Category filter counts are hardcoded in HTML — must update manually when adding/removing entries
- statLive count is hardcoded in hero section — update when adding live apps
- File is ~200KB — read with offset/limit, never try to read all at once

## Status
- Version: v0.2.1
- Last updated: 2026-04-14
