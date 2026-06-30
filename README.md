# sysadmindoc.github.io

![Version](https://img.shields.io/badge/version-0.20.6-blue)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-GitHub%20Pages-black)](https://sysadmindoc.github.io)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro%206-ff5d01)](https://astro.build)

Personal portfolio and project showcase at [sysadmindoc.github.io](https://sysadmindoc.github.io).

## Stack

- **Astro 6** — static site generator with focused client-side enhancements for the homepage experience
- **Schema-checked TypeScript** fallback data layer ([src/data/projects.ts](src/data/projects.ts))
- **Feed-backed portfolio adapter** ([src/data/portfolio.ts](src/data/portfolio.ts)) from the SysAdminDoc profile `projects.json`
- **Content collections**: featured (9), live apps (22), catalog (182 feed-backed / 189 local fallback), skills (8)
- **Portfolio stack metrics** — rendered project language metadata powers the homepage donut, and skill rings derive lane counts from the active catalog
- **Build-time GitHub API** — stars, repo metadata, release summaries, and cached READMEs
- **README rendering** — GFM through `marked`, sanitized remote HTML, class-based Shiki highlighting, reading-time metadata, and heading outlines
- **Generated timeline** — year-in-review page built from release and project-push evidence
- **Archive decisions** — public-safe anti-portfolio for retired, moved, or held-back project surfaces
- **Static full-text search** — Pagefind index over rendered project pages and README excerpts, with audited visible Category facets
- **Shared section navigation** — homepage and interior jump links reuse command-palette section data through `SectionJumpNav`
- **Interior freshness signals** — reviewed `/uses/`, `/resume/`, and `/healthcare-it/` timestamps with audited `WebPage.dateModified` schema
- **Catalog discovery** — build-time `Recommended` ranking plus URL-backed all/new/recently updated/has-download slices derived from GitHub metadata and release downloads
- **Machine-readable indexes** — audited static `projects.json` and `releases.json` feeds with bounded generated-endpoint cache policy
- **Performance, PWA, and update hygiene** — Lighthouse/bfcache audit, below-fold homepage render containment, Chromium/iOS install prompts, and sitewide service-worker update prompts
- **Image pipeline checks** — Sharp-generated 640x400 live-app thumbnails, Astro-managed AVIF/WebP card previews, and generated project/interior OG PNG validation
- **Local semantic audit** — advisory project similarity and category-drift review without hosted inference
- **Browser accessibility and visual baselines** — Playwright + axe coverage for hydrated shell interactions and key responsive routes
- **Public-safe notes policy** — `/til` stays parked until a reviewed note corpus exists
- **GitHub Pages deployment** — local build, audit, and smoke process for static Pages output

## Develop

```bash
npm install
npm run profile-feed:sync # optional: refresh ignored profile projects cache from raw GitHub
npm run generated:fixtures:check # audit tracked generated-data fixtures
npm run generated:fixtures # install fixture caches into ignored src/data/_*.json files
npm run fetch-stars   # optional: refresh star cache from GitHub
npm run build:ci      # build plus HTML structure, strict style CSP, endpoint, feed, DOM-size, search, and schema audits
npm run scripts:minify # minify copied dist/scripts output after Astro build
node scripts/fix-html-structure.mjs # verify built HTML structure; --repair is legacy recovery only
npm run catalog:audit # compare public GitHub repos with portfolio data
npm run audit:prod    # fail on high/critical production advisories
npm run data:validate # validate project data, screenshots, policy, and command palette coverage
npm run assets:audit  # detect stale screenshots and unreferenced source/public modules
npm run images:audit  # validate screenshot masters, public/Astro thumbnails, and OG PNG metadata
npm run screenshots:thumbs # regenerate 640x400 live-app thumbnail derivatives and Astro inputs
npm run csp:audit     # verify source CSP script/style inventory and strict script-src readiness
npm run csp:audit:style # report current style-src 'self' blockers without failing
npm run csp:audit:style:elem # report style-src-elem 'self' blockers without failing
npm run csp:audit:style:attr # verify style-src-attr 'none' is clean in source/runtime inventory
npm run csp:audit:browser # browser-check representative routes with candidate style-src-attr 'none'
npm run csp:audit:dist # verify rendered dist/ CSP inventory after a build
npm run csp:audit:dist:style:elem # fail on rendered style-src-elem drift or inconsistent CSP metas
npm run bundle:audit # verify JS, route CSS, shared global CSS, and total CSS budgets
npm run dom:audit     # verify built homepage/catalog DOM-size budgets
npm run semantic:audit # report similar-project and cross-category catalog review hints
npm run semantic:audit:strict # fail when production README corpus coverage is too low
npm run data:summary  # summarize GitHub metadata/profile-feed/ranking freshness and integrity
npm run data:summary:strict # fail on stale, partial, or low-coverage generated-data caches
npm run search:index   # build Pagefind static search index under dist/pagefind
npm run search:audit   # verify generated Pagefind Category filters and faceted project results
npm run endpoints:audit # verify built public JSON/text/script endpoint contracts
npm run feed:audit     # verify built JSON/Atom feed metadata and item contracts
npm run smoke:live -- --base-url https://sysadmindoc.github.io/ --expected-version 0.20.6 --expected-projects 182 --expected-releases 9 --expected-feed-items 182
npm run audit:perf     # run local Chromium performance/bfcache smoke checks against a preview URL
npm run forced-colors:audit # verify forced-colors SVG data visualizations after build
npm run lhci:audit     # run advisory Lighthouse budgets against the built dist/
npm run lhci:summary   # summarize LHCI filesystem warning reports
npm run a11y:audit     # static WCAG checks over the built dist/ (advisory; --strict to fail)
npm run audit:playwright # browser axe + visual baselines against fixture-built dist/
npm run audit:interactions # focused rendered interaction smoke against built dist/
npm test              # cwd-guarded node:test unit suite (pure data/script helpers)
npm run check         # project data + Astro + TypeScript validation
npm run dev           # http://localhost:4321
npm run build         # validate data, then output to dist/
npm run preview       # serve dist/
```

`npm run audit:playwright` and `npm run audit:interactions` require a built `dist/` and a Chromium browser (`npx playwright install chromium`; Linux runs can use `npx playwright install --with-deps chromium`; local Windows runs can set `CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"`). Visual baselines are fixture-backed: run `npm run generated:fixtures`, then `PROFILE_PROJECTS_OFFLINE=1 npm run build:ci`, then `npm run audit:playwright`. `npm run audit:playwright` starts its own built-preview server on port `4324` by default; set `PLAYWRIGHT_AUDIT_PORT` to override it. `npm run audit:interactions` runs focused rendered smoke tests over command palette lazy loading, filtering, no-results recovery, degraded search fallback, Escape close behavior, keyboard activation inside the dialog, pointer activation, and same-page section jumps; terminal navigation; catalog search; project share fallback; console errors; and horizontal overflow without screenshot assertions. The interaction smoke starts its own built-preview server on port `4325` by default so it does not reuse a stale Astro dev server; set `PLAYWRIGHT_INTERACTIONS_PORT` to override it. The visual/axe suite writes `.tmp/playwright-report` and `.tmp/playwright-results`; the interaction smoke writes `.tmp/playwright-interactions-report` and `.tmp/playwright-interactions-results`. `npm run capture-screenshots` uses the same Playwright browser dependency for screenshot capture.

`npm run fetch-stars` works best with `GITHUB_TOKEN` set; without it, local runs preserve the existing README cache instead of exhausting the anonymous GitHub rate limit.

`npm run lhci:audit` is the advisory Lighthouse budget check. On local Windows it exits cleanly by default because Chrome launcher cleanup can fail with `EPERM` after collection; set `LHCI_ALLOW_LOCAL_WINDOWS=1` to force a local attempt. `npm run lhci:summary -- --out .tmp/lhci/summary.md` reads LHCI filesystem reports and writes the advisory warning table for local review. Use `npm run audit:perf` for local Windows performance/bfcache smoke checks; it warms each sampled route once before measurement so route order and cold local preview startup do not dominate LCP, and `-- --no-warmup` keeps a cold-pass escape hatch. Release quality passes can also run `npm run audit:perf -- --strict --lcp 60000 --event 500` against a local preview and publish a compact route summary; LCP is recorded there but budgeted by LHCI.

### Windows / VMware shared folders

Use a normal local clone or worktree path, such as `C:\Users\--\repos\sysadmindoc.github.io`, for npm and Astro commands. Editing from a VMware shared folder is fine, but run `npm test`, `npm run check`, and `npm run build` from the local clone. Raw UNC paths like `\\vmware-host\Shared Folders\...` can make Windows fall back to `C:\Windows`, and mapped shared-folder paths have produced corrupted Astro/Vite paths during local builds.

## Edit content

Rendered project entries are adapted from the public SysAdminDoc profile feed into **[src/data/portfolio.ts](src/data/portfolio.ts)**. The ignored cache lives at `src/data/_profile-projects.json` and is refreshed by `npm run profile-feed:sync`, which runs automatically before `npm run check` and `npm run build`.

Offline fixture checks do not use GitHub metadata credentials. They install tracked schema-valid generated-data fixtures from `src/data/fixtures/generated/` with `npm run generated:fixtures`, then run checks and `build:ci` with `PROFILE_PROJECTS_OFFLINE=1` so the profile-feed sync preserves the fixture cache instead of replacing it over the network. Local release passes can also install Chromium, run the focused rendered interaction smoke and the blocking Playwright browser accessibility/visual-baseline suite against that fixture build, and keep both `.tmp/playwright-*` report/result sets for review.

The curated fallback and live-app screenshot overlays live in **[src/data/projects.ts](src/data/projects.ts)** and are validated by **[scripts/validate-project-data.mjs](scripts/validate-project-data.mjs)**. Add an entry -> `npm run data:validate` -> `npm run build` -> deploy. Live apps also need a tracked screenshot in `public/screenshots/<slug>.jpg`, a stable public thumbnail in `public/screenshots/thumbs/<slug>.jpg`, and a matching Astro thumbnail input in `src/assets/screenshots/thumbs/<slug>.jpg`.

- Featured: surface in the hero signature reel, command palette, and feeds
- Live Apps: for GitHub Pages demos
- Catalog: full searchable repo list with a build-time `Recommended` sort (categories: `ps|py|web|ext|kt|sec|media|cs|guide|fork|other|cpp`)
- Skills: animated ring charts in the Stack section
- Beyond Code: static creative overview cards, an internal SlunderStudio project route, and click-to-load drone videos with no Spotify embed

Category and catalog-view counts auto-compute from the feed-backed catalog plus generated GitHub metadata. The default `Recommended` sort blends stars, freshness, and release-download activity at build time; `npm run data:summary` reports top ranked rows, validates ranking weights/scores/ranks, labels fixture/unauthenticated/production generated-data modes, and `npm run data:summary:strict` fails on stale or low-coverage caches. `view=` URL state combines with `cat=`, `q=`, and explicit `sort=` overrides, and the homepage catalog search is also a no-JS `GET /search/?q=...` fallback. The `/search/` page uses the generated Pagefind index in faceted mode so full-text results can also be narrowed by Category; searchable routes tag intentional content with `data-pagefind-body` so repeated global UI stays out of the index, and `npm run search:audit` checks the built page/body and Category filter contract after indexing. `npm run bundle:audit` runs inside `build:ci` and budgets JS, route CSS chunks, the shared global shell, and total CSS before the rest of the build-output audits. `npm run dom:audit` guards the built homepage/catalog size budget before service-worker stamping. `/feed.json` is JSON Feed 1.1 with absolute icon metadata, `/atom.xml` mirrors the project feed for Atom clients, and both are guarded by `npm run feed:audit`. `/llms.txt` is a generated AI-readable site map covering reviewed pages, language lanes, feeds, machine endpoints, sitemap, and exact catalog counts.

Optional proof-oriented project detail sections live in **[src/data/proof.ts](src/data/proof.ts)**. Each proof record must point at an existing project route and include source URLs; `npm run data:validate` enforces the shape.

Public notes/TIL content is intentionally not published until a durable reviewed source corpus exists.

## Deploy

Deployment is local-first:
1. Run `npm ci` from a normal local worktree.
2. Refresh generated data when needed with `npm run fetch-stars` and `npm run profile-feed:sync`.
3. Run `npm test`, `npm run check`, and `npm run build`.
4. Preview `dist/` with `npm run preview` and run any relevant browser audits.
5. Publish the static output to GitHub Pages and verify the live URL with `npm run smoke:live`.

## Layout

```
src/
├── assets/
│   └── screenshots/thumbs/ # Astro <Picture> inputs for live-app card thumbnails
├── components/      # cards, tag cloud, dividers, greatest-hits modules
├── data/
│   ├── types.ts     # TypeScript schemas
│   ├── categories.ts
│   ├── endpoint-headers.ts # generated endpoint cache/content-type helpers
│   ├── interior-og-pages.ts # generated social-card metadata for interior routes
│   ├── page-freshness.ts # reviewed timestamps and WebPage schema helpers for interior routes
│   ├── portfolio.ts # feed adapter + local fallback/overlays
│   ├── project-ranking.mjs # build-time catalog and related-project scoring
│   ├── readme-rendering.mjs # sanitized README HTML + Shiki code, reading-time, and outline metadata
│   ├── projects.ts  # curated fallback, featured, live-app screenshots, skills
│   ├── proof.ts
│   ├── archive.ts
│   ├── catalog-policy.json
│   ├── generated.d.ts # type contracts for the _*.json caches
│   └── _*.json      # generated GitHub cache files (gitignored)
├── layouts/Base.astro
├── pages/
│   ├── index.astro
│   ├── now.astro · uses.astro · resume.astro · healthcare-it.astro · 404.astro
│   ├── projects.json.ts · releases.json.ts · feed.json.ts · atom.xml.ts
│   ├── search.astro · releases.astro · timeline.astro · archive.astro
│   ├── rss.xml.ts · releases.xml.ts · llms.txt.ts
│   ├── lang/[slug].astro · lang/_langs.ts
│   ├── og/[slug].png.ts
│   └── projects/[slug].astro
└── styles/
    ├── critical.css # inline first-viewport nav/hero CSS
    └── global.css   # full stylesheet, preloaded and applied asynchronously
public/
├── manifest.json · robots.txt · sw.js · humans.txt · llms is served from src
├── .well-known/security.txt
├── screenshots/      # public captured live-app masters plus stable thumbs/
└── scripts/          # shared.js, theme.js, main.js, cmdk-loader.js, cmdk.js
scripts/
├── fetch-stars.mjs        # GitHub data refresh (build-time, atomic writes)
├── sync-profile-feed.mjs  # raw profile projects.json cache for rendered catalog
├── install-generated-fixtures.mjs # audited generated fixture cache installer
├── audit-catalog.mjs      # public repo drift audit
├── validate-project-data.mjs
├── audit-assets.mjs · audit-performance.mjs · audit-image-pipeline.mjs
├── audit-csp.mjs          # source/built CSP inventory plus script/style candidate gates
├── audit-a11y.mjs         # static WCAG audit over dist/
├── audit-public-endpoints.mjs # built public JSON/text/script endpoint audit
├── audit-feed.mjs         # built JSON/Atom Feed metadata/item contract audit
├── audit-dom-size.mjs     # built homepage/catalog DOM-size budget audit
├── audit-search-index.mjs # generated Pagefind Category/filter contract audit
├── audit-forced-colors.mjs # CDP forced-colors SVG data-viz audit
├── smoke-live-site.mjs    # post-deploy live Pages artifact smoke check
├── audit-semantic-index.mjs
├── summarize-lhci.mjs     # LHCI filesystem warning summary
├── ensure-project-cwd.mjs  # refuses ambient test discovery outside repo root
├── generate-screenshot-thumbnails.mjs
├── summarize-generated-data.mjs
├── capture-screenshots.mjs
├── stamp-sw.mjs           # stamps the SW cache version at build
└── lib/                   # shared TS-AST + streak helpers
test/                  # node:test unit suite
tests/playwright/      # Playwright axe, visual-baseline, and interaction browser audits
playwright.audits.config.mjs # Playwright visual/axe audit server, snapshot, and report config
playwright.interactions.config.mjs # Interaction-smoke report/result config
SEARCH_DECISION.md    # Pagefind vs client-side search decision
PERFORMANCE_AUDIT.md  # Lighthouse, bfcache, and service-worker update review
IMAGE_PIPELINE.md     # screenshot, thumbnail, README image, and OG card policy
SEMANTIC_INDEX_DECISION.md # local semantic indexing decision and audit policy
NOTES_FEED_POLICY.md  # public-safe activation criteria for future notes/TIL
docs/archive/legacy.html # backup of pre-Astro single-file site
```

## Roadmap

Open work is tracked locally in `ROADMAP.md`; public delivery history lives in the Git commit log and deployed site behavior.

## License

MIT — see [LICENSE](LICENSE).
