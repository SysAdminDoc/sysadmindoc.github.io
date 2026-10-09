# Portfolio Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

### P0

- [ ] P0: Recapture the 22 live-app screenshots so the nightly deploys again
  Why: `Portfolio Refresh and Deploy` aborted at `deploy:preflight` every night from 2026-10-02 to 2026-10-09, so the last deploy is 2026-10-01 and the live site has missed every star, release and profile-feed change since. 22 manifest captures taken around 2026-07-08 crossed `STALE_DAYS = 90` together. The 75-day warning is in (38f96ef2), so only the recapture is left.
  Evidence: `.tmp/refresh-and-deploy.log` (eight `ABORT ... at step "deploy:preflight"` lines, last `OK deploy:vps` on 2026-10-01). `.tmp/refresh-and-deploy-step-deploy-preflight.log` ("Live app availability audit failed: 44 issue(s)": 22 "manifest capture is 91-93d old" plus 22 stale screenshots, among them IconForge, SPECTRE, ImageXpert, ConvertFlow, ClipForge, Text-Filter-Editor, HurricaneMap, ApocalypseWatch and BetterTTS).
  Touches: `scripts/capture-screenshots.mjs` (run, not changed), the capture manifest and images it writes, the `/screenshots/` and homepage visual baselines, `CLAUDE.md`.
  Acceptance: the recapture runs through the build queue after 19:00, the new images are looked over, `audit:playwright:update` refreshes the baselines they move, `deploy:preflight` passes the live-app audit, and the next 03:00 run logs `OK deploy:vps`. The capture and the baseline update are browser and test runs, so they wait for the owner's go-ahead.
  Complexity: S

### P1

### P2

- [ ] P2: Time the gate and the nightly, then parse dist/ once across the build audits
  Why: the build-pipeline rule asks for numbers before and after, and none exist for this repo. `build:ci` runs about twenty audits that each read and parse the built HTML on their own (`dom:audit`, `schema:audit`, `a11y:audit`, `links:audit`, `title-style:audit`, `search:audit`, `csp:audit:dist:style:elem` and more), so the same pages are parsed many times per build.
  Evidence: the `build:ci` chain in `package.json`; the queue and single-build change of 2026-10-09 has no timing yet.
  Touches: the build audits under `scripts/`, a shared parsed-page cache under `scripts/lib/`, `CLAUDE.md` (timings).
  Acceptance: `deploy:preflight` and each `build:ci` step are timed once before the change and once after, the numbers go in `CLAUDE.md`, and each built page is parsed once per build with every audit's verdict unchanged. Needs a build run, so it waits for one to be asked for.
  Complexity: M

- [ ] P2: Fold the stacked stylesheet layers into one design system
  Why: v0.46.0's Studio block sits on top of seven earlier redesigns (foundation through additions, then unlayered), so a rule often has three or four older copies below it. The override audit only catches repeats of one selector inside one file, and changing a component still means chasing specificity across files. The scroll-reveal transform and the old `section::before` sweep both bit during the redesign.
  Evidence: v0.46.0 redesign, 2026-09-29; `src/styles/global.css` imports eight layers plus `layers/unlayered.css`.
  Touches: `src/styles/**`, `scripts/audit-css.mjs`, `test/css-layer.test.mjs`, the visual baselines.
  Acceptance: one token file and one component sheet per surface, no rule overridden across files, and the visual gate unchanged.
  Complexity: L

### P3

- [ ] P3: Load the browser too when checking the preflight's audit on a busy PC
  Why: b8a38227's run slowed only node process starts; Chromium and its renderers ran at full speed, and the slowdown fell in global setup, outside the 90 s and 10 s limits, so the limits never met the load.
  Evidence: seventeenth drain review, 2026-09-24; `playwright.audits.config.mjs:14,16,25`.
  Touches: `playwright.audits.config.mjs`.
  Acceptance: the audit runs with the CPU starved (a busy loop on every core, or the browser processes slowed), the longest test time is reported against 90 s, and the limits change if it doesn't pass.
  Complexity: S

## Research-Driven Additions

Added 2026-09-22 from the research recorded in RESEARCH.md. Items that need the owner's decision went to Roadmap_Blocked.md instead.

### P0

### P1

### P2

### P3

- [ ] P3: Publish GitHub releases for v0.43.0 through v0.45.x
  Why: v0.46.0 and v0.47.0 have releases, but between them and v0.42.0 the tags v0.43.0 to v0.45.2 have none.
  Evidence: `gh release list` on 2026-09-29.
  Touches: a build from each tag, `scripts/smoke-release-artifact.mjs`.
  Acceptance: Each minor version from v0.43.0 to v0.45.x has a release with the static-site ZIP built from its tag and its SHA-256, and `smoke:release` passes against each.
  Complexity: S
