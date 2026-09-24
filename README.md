# sysadmindoc.github.io

![Version](https://img.shields.io/badge/version-0.45.2-blue)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Contabo%20VPS%20%2F%20Caddy-black)](https://portfolio.getparkerai.com)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro%207-ff5d01)](https://astro.build)

<p align="center">
  <a href="https://ko-fi.com/X8K126YVER">
    <img height="42" src="https://storage.ko-fi.com/cdn/kofi2.png?v=3" alt="Buy me a coffee on Ko-fi" />
  </a>
</p>

<p align="center">
  <sub><em>If this project helps you, a coffee helps me keep working on it.</em></sub>
</p>

Personal portfolio and project showcase at [portfolio.getparkerai.com](https://portfolio.getparkerai.com).

## Stack

- **Astro 7**: static site generator with focused client-side enhancements for the homepage experience
- **Schema-checked TypeScript** fallback data layer ([src/data/projects.ts](src/data/projects.ts))
- **Feed-backed portfolio adapter** ([src/data/portfolio.ts](src/data/portfolio.ts)) from the SysAdminDoc profile `projects.json`, reconciled against the locally reviewed visibility catalog
- **Content collections**: featured (9), live apps (22), catalog (206 feed-backed / 209 local fallback), skills (8)
- **Technical Service Bureau design system**: a mineral-paper independent-practice publication with civic-blue rules, vermilion signals, restrained diagnostic surfaces, and a complete dark-theme counterpart
- **Shared career dossier**: résumé-backed profile, expertise, proof, education, and role data reused by the homepage, AI services, healthcare track, printable résumé, and JSON Resume export
- **Minimal homepage evidence sequence**: concise positioning, three proof points, three selected systems, two live previews, three practice lanes, and direct archive/search handoffs
- **Focused AI implementation track**: three concrete offer types, a map-to-handoff delivery path, and inspectable Parker AI/public-project proof without a generic card wall
- **Build-time GitHub API**: stars, repo metadata, release summaries, and cached README telemetry
- **Generated timeline**: year-in-review page built from release and project-push evidence
- **Archive decisions**: public-safe anti-portfolio for retired, moved, or held-back project surfaces
- **Static full-text search**: Pagefind index over portfolio routes, language lanes, releases, timeline entries, and archive decisions, with an audited Scope facet
- **Shared interior navigation**: five primary routes stay visible while long-page section
  indexes remain available in a compact `SectionJumpNav` disclosure
- **Interior freshness signals**: visible review dates on `/uses/`, `/resume/`, `/healthcare-it/`, `/ai/` and `/colophon/`. The build fails when any reviewed page's `WebPage.dateModified` differs from its sitemap `lastmod`
- **Catalog discovery**: build-time `Recommended` ranking plus URL-backed all/new/recently updated/has-download slices derived from GitHub metadata and release downloads
- **Machine-readable indexes**: audited static `projects.json` and `releases.json` feeds with bounded generated-endpoint cache policy
- **Performance, PWA, update, and CSP hygiene**: Lighthouse/bfcache audit, below-fold homepage render containment, Chromium/iOS install prompts, navigation preload, Trusted Types-ready DOM rendering, and sitewide service-worker update prompts
- **Image and brand pipeline checks**: Sharp-generated live-app thumbnails, Astro-managed card previews, reproducible MP app icons/install captures, and data-backed homepage/interior OG PNG generation
- **Local semantic audit**: advisory project similarity and category-drift review without hosted inference
- **Browser accessibility and visual baselines**: Playwright + axe coverage for hydrated shell interactions, major public responsive routes, and mid-wide desktop layout regressions
- **Public-safe notes policy**: `/til` stays parked until a reviewed note corpus exists
- **VPS deployment**: local build, audit, and smoke process. A Caddy container serves the static site from the Contabo VPS. The old GitHub Pages address only redirects there.

## Develop

```bash
npm install
# .npmrc pins min-release-age=3, so installs skip versions published in the last 3 days.
# Pass --min-release-age=0 for a single command to take a fresh release deliberately.
npm run profile-feed:sync # optional: refresh ignored profile projects cache from raw GitHub
npm run generated:fixtures:check # audit tracked generated-data fixtures
npm run generated:fixtures # install fixture caches into ignored src/data/_*.json files
npm run fetch-stars   # optional: refresh star cache from GitHub
npm run build:ci      # build plus HTML structure, strict style CSP, endpoint, feed, DOM-size, search, and schema audits
npm run scripts:minify # minify copied dist/scripts output after Astro build
node scripts/fix-html-structure.mjs # verify built HTML structure; --repair is legacy recovery only
npm run catalog:audit # compare public GitHub repos with portfolio data
npm run audit:prod    # fail on high/critical production advisories
npm run deps:audit    # report direct/override package freshness and high-threshold advisories
npm run deps:audit -- --strict # also fail on stale exact-version override pins
npm run data:validate # validate project data, screenshots, policy, and command palette coverage
npm run assets:audit  # detect stale screenshots and unreferenced source/public modules
npm run css:audit     # verify critical/global parity and source-backed selector inventory
npm run images:audit  # validate screenshot masters, public/Astro thumbnails, and OG PNG metadata
npm run screenshots:thumbs # regenerate 640x400 live-app thumbnail derivatives and Astro inputs
npm run brand:assets # regenerate favicon-derived MP PWA and Apple touch icons, and favicon.ico
npm run capture:install-screenshots # capture current 1600px/390px PWA install previews from a running build
npm run liveapps:audit # verify live app availability and screenshot manifest provenance
npm run csp:audit     # verify source CSP script/style inventory, strict script-src readiness, and Trusted Types trial readiness
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
npm run data:summary -- --fail-on-unsigned-featured-releases # fail on featured releases without checksum or attestation
npm run data:summary:strict # fail on stale, partial, or low-coverage generated-data caches
npm run data:summary:deploy # strict generated-data gate, token-backed README telemetry, and signed featured releases
npm run deploy:status # fail when the live version or commit differs from local package.json + HEAD, or live data is past staleAfter
npm run deploy:preflight # deploy gate: data/catalog/dependency audits, tests, check, a screenshot comparison of five key routes on a fixture build, then the real build and the browser a11y audit
npm run search:index   # build Pagefind static search index under dist/pagefind
npm run search:audit   # verify generated Pagefind Scope filters, indexed routes, and direct GitHub catalog links
npm run endpoints:audit # verify built public JSON/text/script endpoint contracts
npm run feed:audit     # verify built JSON/Atom feed metadata and item contracts
npm run smoke:live -- --base-url https://portfolio.getparkerai.com/ --expected-version <version> --expected-commit <commit-sha> --expected-projects 209 --expected-releases 60 --expected-feed-items 209
npm run smoke:release -- --tag v<version> --asset sysadmindoc-portfolio-v<version>.zip --min-size 1000000
npm run audit:perf     # run local Chromium performance/bfcache smoke checks against a preview URL
npm run forced-colors:audit # verify forced-colors SVG data visualizations after build
npm run lhci:audit     # run advisory Lighthouse budgets against the built dist/
npm run lhci:summary   # summarize LHCI filesystem warning reports
npm run a11y:audit     # static WCAG checks over the built dist/ (advisory; --strict to fail)
npm run audit:playwright # the whole browser suite (axe, layout, screenshots) against a fixture build; live data is swapped back after
npm run audit:playwright:update # the same run, rewriting every win32 screenshot baseline from the fixtures
npm run visual:gate   # just the deploy gate: /, /ai/, /healthcare-it/, /resume/ and /catalog/ in both themes, every route's phone gutter, and the offline command palette
node scripts/visual-gate.mjs --restore # put back the live data a killed gate run left in src/data
npm run audit:interactions # focused rendered interaction smoke against built dist/
npm test              # cwd-guarded node:test unit suite (pure data/script helpers)
npm run typecheck:scripts # check scripts/ and test/ JavaScript contracts with TypeScript
npm run check         # project data + Astro source + Node script/test validation
npm run dev           # http://127.0.0.1:4321
npm run build         # validate data, then output to dist/
npm run preview       # serve dist/
```

The `dev`, `dev:agent`, `start`, and `preview` scripts bind to IPv4 loopback
(`127.0.0.1`) by default. They are intentionally unavailable to other devices
on the LAN.

Astro 7 can run the dev server detached, which suits automated/agent-driven work
better than a foreground process: the server survives between commands, and
`status` and `logs` emit newline-delimited JSON instead of formatted console
output, so no log scraping is needed.

```bash
npm run dev:agent     # start the dev server as a background process
npm run dev:status    # {"message":"Dev server running at http://127.0.0.1:4321 ...","level":"info"}
npm run dev:logs      # replay the background server's JSON log lines (add -- --follow to tail)
npm run dev:stop      # stop it
```

`dev:agent` picks the next free port if 4321 is taken, so read the port from
`npm run dev:status` rather than assuming it.

Adding an interior route touches about a dozen files that must agree. Scaffold it
rather than doing that by hand:

```bash
npm run scaffold:route -- talks --title "Talks" --label "Speaking" --dry-run
npm run scaffold:route -- talks --title "Talks" --label "Speaking"
```

It writes the page stub and patches the OG page list, page freshness, schema
audit routes, the `InteriorNav` union and link, and the Base command-palette
section. It exits non-zero and names anything whose anchor it could not find. It
deliberately does not touch the frozen expectation sets in `test/`, since
widening those is a review decision; it prints exactly which ones to update.

`npm run audit:playwright` and `npm run audit:interactions` require a built `dist/` and a Chromium browser (`npx playwright install chromium`; Linux runs can use `npx playwright install --with-deps chromium`; local Windows runs can set `CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"`). Visual baselines are fixture-backed: run `npm run generated:fixtures`, then `PROFILE_PROJECTS_OFFLINE=1 npm run build:ci`, then `npm run audit:playwright`. Baselines are isolated under `tests/playwright/__screenshots__/{platform}/{project}` using Node's `process.platform` values (`linux`, `win32`, or `darwin`), so `npm run audit:playwright:update` refreshes only the current operating system's images. Review generated images before committing them. The visual suite covers desktop, mobile, 1000px, 1280px, 1440px, and a short-height desktop viewport for the main public routes. `npm run audit:playwright` starts its own built-preview server on port `4324` by default; set `PLAYWRIGHT_AUDIT_PORT` to override it. `npm run audit:interactions` runs focused rendered smoke tests over command palette lazy loading, filtering, no-results recovery, degraded search fallback, Escape close behavior, keyboard activation inside the dialog, pointer activation, same-page section jumps, catalog search, direct repository links, console errors, and horizontal overflow without screenshot assertions. The interaction smoke starts its own built-preview server on port `4325` by default so it does not reuse a stale Astro dev server; set `PLAYWRIGHT_INTERACTIONS_PORT` to override it. Both preview servers send the production `Content-Security-Policy` response header, built by the same `scripts/lib/csp-header.mjs` the deploy uses. That matters because the service worker and the Pagefind worker get their policy only from their own scripts' response headers, so a preview without it can't show what the live site refuses. The visual/axe suite writes `.tmp/playwright-report` and `.tmp/playwright-results`; the interaction smoke writes `.tmp/playwright-interactions-report` and `.tmp/playwright-interactions-results`. `npm run capture-screenshots` uses the same Playwright browser dependency for screenshot capture.

`npm run fetch-stars` works best with `GITHUB_TOKEN` set; without it, local runs preserve the existing README cache instead of exhausting the anonymous GitHub rate limit.

`npm run lhci:audit` is the advisory Lighthouse budget check. On local Windows it exits cleanly by default because Chrome launcher cleanup can fail with `EPERM` after collection; set `LHCI_ALLOW_LOCAL_WINDOWS=1` to force a local attempt. `npm run lhci:summary -- --out .tmp/lhci/summary.md` reads LHCI filesystem reports and writes the advisory warning table for local review. Use `npm run audit:perf` for local Windows performance/bfcache smoke checks; it warms each sampled route once before measurement so route order and cold local preview startup do not dominate LCP, and `-- --no-warmup` keeps a cold-pass escape hatch. Release quality passes can also run `npm run audit:perf -- --strict --lcp 60000 --event 500` against a local preview and publish a compact route summary; LCP is recorded there but budgeted by LHCI.

### Windows / VMware shared folders

Use a normal local clone or worktree path, such as `C:\repos\sysadmindoc.github.io`, for npm and Astro commands. Editing from a VMware shared folder is fine, but run `npm test`, `npm run check`, and `npm run build` from the local clone. Raw UNC paths like `\\vmware-host\Shared Folders\...` can make Windows fall back to `C:\Windows`, and mapped shared-folder paths have produced corrupted Astro/Vite paths during local builds.

## Edit content

Rendered project entries are adapted from the public SysAdminDoc profile feed into **[src/data/portfolio.ts](src/data/portfolio.ts)**. The ignored cache lives at `src/data/_profile-projects.json` and is refreshed by `npm run profile-feed:sync`, which runs automatically before `npm run check` and `npm run build`.

Offline fixture checks do not use GitHub metadata credentials. They install tracked schema-valid generated-data fixtures from `src/data/fixtures/generated/` with `npm run generated:fixtures`, then run checks and `build:ci` with `PROFILE_PROJECTS_OFFLINE=1` so the profile-feed sync preserves the fixture cache instead of replacing it over the network. Local release passes can also install Chromium, run the focused rendered interaction smoke and the blocking Playwright browser accessibility/visual-baseline suite against that fixture build, and keep both `.tmp/playwright-*` report/result sets for review.

The curated fallback and live-app screenshot overlays live in **[src/data/projects.ts](src/data/projects.ts)** and are validated by **[scripts/validate-project-data.mjs](scripts/validate-project-data.mjs)**. Add an entry -> `npm run data:validate` -> `npm run build` -> deploy. Live apps also need a tracked screenshot in `public/screenshots/<slug>.jpg`, a stable public thumbnail in `public/screenshots/thumbs/<slug>.jpg`, a matching Astro thumbnail input in `src/assets/screenshots/thumbs/<slug>.jpg`, and an `ok` provenance entry in `public/screenshots/manifest.json` from `npm run capture-screenshots`.

- Featured: surface in Selected Work, the command palette, and feeds
- Live Apps: for GitHub Pages demos, the screenshots gallery, and two homepage previews
- Catalog: full searchable repo list with a build-time `Recommended` sort (categories: `ps|py|web|ext|kt|sec|media|cs|guide|fork|other|cpp`)
- Skills: reviewed technology metadata for language lanes and discovery

Category and catalog-view counts auto-compute from the feed-backed catalog plus generated GitHub metadata. The default `Recommended` sort blends stars, freshness, and release-download activity at build time; `npm run data:summary` reports top ranked rows, validates ranking weights/scores/ranks, labels fixture/unauthenticated/production generated-data modes, reports release provenance distribution, and can fail featured downloadable releases without checksum or attestation when run with `--fail-on-unsigned-featured-releases`. `npm run data:summary:strict` fails on stale or low-coverage caches. `npm run data:summary:deploy` adds the production deploy requirements that README refresh telemetry is token-backed and that every featured downloadable release carries a checksum or attestation, and `npm run deploy:preflight` runs that gate plus catalog drift, package signatures, and strict exact-override freshness before tests, check, and build. Documented major holds remain visible but non-blocking until their upstream compatibility work lands. `view=` URL state combines with `cat=`, `q=`, and explicit `sort=` overrides on `/catalog/`; its search form remains a no-JS `GET /search/?q=...` fallback. The homepage links to that complete archive instead of duplicating it. Project cards and project entries in search, feeds, releases, screenshots, timeline, language lanes, and archive surfaces point directly to their GitHub repositories. The `/search/` page uses the generated Pagefind index in faceted mode so full-text results can be narrowed by Scope; searchable routes tag intentional content with `data-pagefind-body` so repeated global UI stays out of the index, and `npm run search:audit` checks the built page/body, Scope filter, removed project-route boundary, and direct GitHub catalog-link contract after indexing. `npm run bundle:audit` runs inside `build:ci` and budgets JS, route CSS chunks, the shared global shell, and total CSS before the rest of the build-output audits. `npm run dom:audit` guards the built homepage/catalog size budget before service-worker stamping. `/feed.json` is JSON Feed 1.1 with absolute icon metadata, `/atom.xml` mirrors the project feed for Atom clients, and both are guarded by `npm run feed:audit`. `/llms.txt` is a generated AI-readable site map covering reviewed pages, language lanes, feeds, machine endpoints, sitemap, and exact catalog counts.

Public notes/TIL content is intentionally not published until a durable reviewed source corpus exists.

## Deploy

The canonical origin is **`https://portfolio.getparkerai.com`**, a static site served
from the Contabo VPS behind the shared edge Caddy (config under
[`deploy/vps/`](deploy/vps/)). Moving off GitHub Pages is what lets the site set
response headers Pages cannot, including HSTS, `X-Frame-Options`, `Permissions-Policy`,
and COOP. The hash-pinned CSP remains declared in the site's own `<meta>` tag and
is copied into the internal Caddy response header for reporting.
`npm run smoke:live` asserts every one of those edge security headers against the
canonical origin, so a Caddy route regression that dropped them fails the smoke
instead of going unnoticed.

The origin also publishes a first-party `Reporting-Endpoints` header for CSP
violations. The internal Caddy forwards `/csp-report` to a private Node sidecar,
which stores redacted NDJSON reports in a rotated file outside the served site.
`npm run deploy:vps` stamps the built hash-pinned policy into the response header
so browsers can report real violations without a third-party service.

The policy asks for `'report-sample'`, so a report about a blocked inline script
or style carries that code's first 40 characters. The deploy tells the sink how
each of the site's own inline blocks starts (`CSP_OWN_SAMPLES`), and the sink
keeps a sample only when it's one of those. Anything else is stored as
`[other]`, so nothing an extension's code or a visitor's text held is kept. It
keeps the keyword a browser sends in place of a URL (`inline`, `eval`) and tags
each report as synthetic, extension, first-party or other. Anyone can post a
report, so a tag only says what the report claims.

`npm run csp:reports` reads the store over SSH and prints the counts. The
nightly runs it after every deploy with `--record`, and a first-party violation
it hasn't reported before fails that one run the way catalog drift does. It has
to have arrived at least three times across two separate clock hours first, so a
single burst of forged reports can't trip it. Every deploy also reads the
smoke's own report back from the store and stops unless the running sink filed
it as synthetic with its sample scrubbed.

The policy names no other host. Images, fonts, scripts, styles and connections
all come from the site itself, the homepage photo included. The build's
`csp:audit:dist:style:elem` step fails if the policy ever allows a host that no
built file loads that kind of resource from: an image host needs an image, a
font host a font, a frame host a frame. Script and connect hosts count only
where a script names them in a loading call such as `fetch()` or `import()`, so
a URL a script builds at run time reads as unused. `gates:selftest` plants an
unused host to prove the step fails. (`npm run csp:audit:dist` on its own only
reports.)

The contact form posts to `/api/contact`, where a small Node sidecar
(`deploy/vps/contact-handler.mjs`) writes each submission in full to an fsync'd
store and then notifies through a self-hosted ntfy at
`https://notify.getparkerai.com`. ntfy sits on a private compose network behind
`portfolio-app`, denies everything without a token, and its credentials never
touch this repo. On a new server the first `deploy:vps` copies
`provision-notify-secrets.sh` to `/home/deploy/sites/portfolio` and stops. Run
`sh provision-notify-secrets.sh` there once, then deploy again. The script
writes `ntfy-auth.env` and `contact-secrets.env` and prints three
values once: the phone's read-only token, plus the smoke token and smoke secret,
which the deploy machine needs as `PORTFOLIO_NTFY_SMOKE_TOKEN` and
`PORTFOLIO_CONTACT_SMOKE_SECRET`. `deploy:vps` refuses to run without the two
server files and asserts the running ntfy version, and its live smoke checks
that the notify host refuses anonymous access. It then sends a synthetic lead
through the real form and reads it back as a subscriber within 60 seconds.
Smoke leads go to their own topic, so they never reach the phone.

`ContactForm.astro` loads its own script, so any page that shows the form can
send it. With JavaScript the form posts in place and shows the handler's reply.
Without it the browser posts natively, and the handler answers with a 303: to
`/contact/sent/` once the message is stored, or back to the form page at
`#contact-not-sent`, where a note explains what happened without any script.

Once someone starts filling in the form, its script fetches a signed token
from `/api/contact/token` and sends it back with the message. The handler
refuses a token under three seconds old, over four hours old, or already used,
so it times the form on its own clock instead of the visitor's. The minimum
comes from `CONTACT_MIN_TIME` in `contact-secrets.env` and travels with each
token, and the page script and the smoke wait that long. It can go up to 60
seconds. Raise it one deploy after the script that reads it, since a returning
visitor's service worker can serve the older script for one more visit. Its signing key
is new at every start, so a restart can't let a used token through again.

Every post has to come from a page on this site, token or not, since any site
can fetch a token. The browser says where it posted from with Sec-Fetch-Site or
Origin, and a text browser that sends neither is judged by its Referer. Each
visitor gets five attempts per ten minutes and ten a day, which keeps one
address from filling the hourly cap by itself. The counts live in memory, so a
restart (every deploy) starts them over. A browser without JavaScript can't
fetch a token, so it gets two attempts. The site stores at most 30 messages an
hour, and that cap holds even when posts arrive at the same moment.

A form that fails a field check hears only "Please check the form and try
again". The field checks and the cap come before the honeypot, and a filled
honeypot then gets the reply a sent message gets, so the reply to a form is the
same with or without it. The handler's log keeps the reason.

The removed `/projects/<Repo>/` pages still get visits from old links. At each
deploy, `deploy-vps` writes a `redir` line per catalog repo from
`dist/projects.json` into `project-redirects.caddy`, which the internal Caddyfile
imports: a known repo answers 301 to its GitHub page, and any other name 302s to
`/catalog/?q=<name>`.

What the site keeps, and for how long, is on `/privacy/`. Every period there
comes from `src/data/retention.ts`, and `test/privacy-retention.test.mjs` holds
the things that enforce them to the same numbers: the handler's lead purge
(365 days, run at start and daily), the edge log roll in `caddy-block.txt`
(30 days), ntfy's cache (72 hours) and the CSP report store (10 MB).

There are two ways to deploy, both local:

- `npm run refresh:deploy` runs the whole chain unattended: it refreshes the
  generated data, runs `deploy:preflight`, then `deploy:vps`, and reads the CSP
  report store afterwards. The nightly task uses it (see Nightly refresh below).
- `PORTFOLIO_VPS_SSH=deploy@<vps> npm run deploy:vps` ships what you have. It
  builds and mirrors `dist/` to `/home/deploy/sites/portfolio/`, recreates the
  containers, and smokes the live origin.

Before a hand deploy, run `npm ci`, refresh the data with `GITHUB_TOKEN` set
(`npm run fetch-stars` and `npm run profile-feed:sync`), and run
`npm run deploy:preflight`. It fails if generated data is stale, coverage is
low, README refresh telemetry wasn't token-backed, the public repo catalog has
unreviewed drift, dependency signatures fail, or an exact override pin trails a
patch or minor release.

### Go-live (one-time cutover)
1. Point `portfolio.getparkerai.com` DNS at the VPS.
2. Add [`deploy/vps/caddy-block.txt`](deploy/vps/caddy-block.txt) to the live
   `/home/deploy/proxy/Caddyfile`, then `caddy validate` + reload.
3. Mirror the live state back into `Contabo-VPS-Ops` (`sites/portfolio/`,
   `server-state/Caddyfile`, provenance, generated snippets) per that repo's
   `runbook/03-add-a-site.md`.
4. Keep `sysadmindoc.github.io` serving (with a canonical/redirect to the new
   origin) until search equity settles.

The `gh-pages` branch now holds only a three-file redirect stub to this origin.
Nothing in this repo publishes to it any more, so it can't be overwritten by
accident.

### Nightly refresh

`npm run refresh:deploy` runs the whole chain unattended: fetch-stars,
profile-feed:sync, deploy:preflight, deploy:vps, then csp:reports. On the build machine it
runs as the scheduled task "Portfolio Refresh and Deploy", daily at 03:00.
`pwsh -NoProfile -File scripts\register-nightly-task.ps1` creates or replaces
the task (running it twice still leaves one), and `-Check` reports whether it
exists, is enabled, and whether the last run was killed. The task starts node
through `conhost.exe --headless`, so no window ever appears on the desktop.
Every run writes `.tmp/refresh-and-deploy-status.json`: `running` before the
first step, then `deployed`, `drift`, `dry-run` or `aborted` with the failing
step. Each step has a timeout (20 minutes for fetch-stars, 5 for
profile-feed:sync, 45 for deploy:preflight, 20 for deploy:vps, 3 for
csp:reports) that kills its whole process tree, so a hung or killed run shows up
instead of leaving the previous night's result in place. The deploy has already
happened by the time csp:reports runs, so a store it can't read only adds a
warning to the status file.

Before the first fetch, the run puts back anything a killed screenshot-gate run
left in `src/data`, since a refresh on top of the committed fixtures would keep
fixture rows wherever GitHub answers 304. Gate runs take turns through
`.tmp/visual-gate/lock.json`, and the run waits up to 20 minutes for one that's
going. `deploy:vps` refuses any build whose `status.json` says it came from the
fixtures.

The live site says when its data expires. `/status.json` carries
`generatedData.staleAfter`, the first moment any part of the data goes past
the 36-hour contract (the GitHub fetch, the profile feed and the catalog check
each keep their own clock, and a part with no time of its own counts as past
it already), beside a
`status` that was only true when the file was built. `npm run smoke:live` and
`npm run deploy:status` both fail once `staleAfter` has passed, so a nightly
run that stops deploying shows up the next time either one runs.

## Layout

```
src/
├── assets/
│   └── screenshots/thumbs/ # Astro <Picture> inputs for live-app card thumbnails
├── components/      # catalog/live modules, navigation, footer, dividers, and proof modules
├── data/
│   ├── types.ts     # TypeScript schemas
│   ├── categories.ts
│   ├── endpoint-headers.ts # generated endpoint cache/content-type helpers
│   ├── interior-og-pages.ts # generated social-card metadata for interior routes
│   ├── page-freshness.ts # reviewed timestamps and WebPage schema helpers for interior routes
│   ├── portfolio.ts # feed adapter + local fallback/overlays
│   ├── project-ranking.mjs # build-time catalog and related-project scoring
│   ├── projects.ts  # curated fallback, featured, live-app screenshots, skills
│   ├── archive.ts
│   ├── catalog-policy.json
│   ├── generated.d.ts # type contracts for the _*.json caches
│   └── _*.json      # generated GitHub cache files (gitignored)
├── layouts/Base.astro
├── pages/
│   ├── index.astro · 404.astro
│   ├── ai.astro · archive.astro · catalog.astro · healthcare-it.astro
│   ├── now.astro · releases.astro · resume.astro · screenshots.astro
│   ├── search.astro · status.astro · timeline.astro · uses.astro
│   ├── projects.json.ts · releases.json.ts · resume.json.ts · status.json.ts
│   ├── feed.json.ts · atom.xml.ts · rss.xml.ts · releases.xml.ts
│   ├── cmdk-data.js.ts · llms.txt.ts
│   ├── lang/[slug].astro · lang/_langs.ts
│   └── og/[slug].png.ts
└── styles/
    ├── critical.css # inline first-viewport nav/hero CSS
    ├── global.css   # ordered import entry, preloaded and applied asynchronously
    └── layers/      # named cascade layers plus intentional unlayered overrides
public/
├── manifest.json · robots.txt · sw.js · humans.txt · llms is served from src
├── .well-known/security.txt
├── screenshots/      # public captured live-app masters plus stable thumbs/
└── scripts/          # shared/sitewide scripts plus the focused homepage navigation entry
scripts/
├── fetch-stars.mjs        # GitHub data refresh (build-time, atomic writes)
├── sync-profile-feed.mjs  # raw profile projects.json cache for rendered catalog
├── install-generated-fixtures.mjs # audited generated fixture cache installer
├── audit-catalog.mjs      # public repo drift audit
├── validate-project-data.mjs
├── audit-assets.mjs · audit-performance.mjs · audit-image-pipeline.mjs
├── audit-css.mjs          # critical/global parity plus source-backed selector inventory
├── audit-csp.mjs          # source/built CSP inventory plus script/style candidate gates
├── audit-a11y.mjs         # static WCAG audit over dist/
├── audit-public-endpoints.mjs # built public JSON/text/script endpoint audit
├── audit-dependencies.mjs # npm outdated/audit freshness and upgrade-readiness report
├── audit-feed.mjs         # built JSON/Atom Feed metadata/item contract audit
├── audit-dom-size.mjs     # built homepage/catalog DOM-size budget audit
├── audit-search-index.mjs # generated Pagefind Category/filter contract audit
├── audit-forced-colors.mjs # CDP forced-colors SVG data-viz audit
├── smoke-live-site.mjs    # post-deploy live artifact smoke check
├── smoke-release-artifact.mjs # GitHub Release ZIP asset smoke check
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

MIT. See [LICENSE](LICENSE).
