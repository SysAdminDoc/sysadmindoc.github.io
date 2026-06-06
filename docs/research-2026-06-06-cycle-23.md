# Research Cycle 23 - T145 fixture-backed Playwright baselines

Date: 2026-06-06
Scope: `sysadmindoc.github.io` deterministic Playwright visual-baseline stabilization after strict style CSP hardening.

## Orientation

Cycle 22 completed the active style policy migration to:

```text
style-src 'self';
style-src-elem 'self' <critical CSS hash> <no-JS fallback hash>;
style-src-attr 'none';
```

The dedicated CSP browser audit passed, but the broader Playwright visual layer still failed eight screenshot comparisons against stale baselines. The failures were coherent rendered pages, not blanking or missing CSS.

## Root Cause

The visual baselines are meant to be generated from PR-CI fixtures, not the live 177-project profile feed. Running the fixture path exposed two audit assumptions that were too live-scale-specific:

- `scripts/audit-public-endpoints.mjs` required at least 50 `/llms.txt` useful links even when the fixture build intentionally renders 16 projects and currently emits 44 links.
- `scripts/audit-dom-size.mjs` applied live average-card density budgets to the small fixture catalog, where the curated 16-card set has denser featured metadata.

Both failures blocked a trustworthy fixture `build:ci` before screenshots could be refreshed.

## Implemented

### Fixture-aware endpoint floor

`scripts/audit-public-endpoints.mjs` now derives the minimum `/llms.txt` useful-link count from required fixed URLs plus project count, capped at 50 for live-scale builds. Fixture output now reports:

```text
llms.txt links: 44 / 42 minimum
```

The live build still keeps the 50-link floor once project count is large enough.

### Small-catalog DOM budget mode

`scripts/audit-dom-size.mjs` now uses a bounded `small-catalog` mode when the rendered catalog has fewer than 50 cards. It preserves homepage HTML, catalog section, total catalog DOM, card count, max-card node, and max-card byte ceilings, but relaxes average-card density to match the intentionally dense fixture set:

```text
average card DOM nodes: 15.38 / 16
average card bytes: 1.8 KB / 1.9 KB
```

Live-scale builds continue to use the standard average-card budgets.

### Refreshed baselines

The eight Playwright screenshot baselines under `tests/playwright/__screenshots__/chromium/` were regenerated from fixture `build:ci` output after visual inspection of actual desktop and mobile pages confirmed coherent rendering.

## Verification

Commands run from the local checkout:

```text
npm run generated:fixtures
$env:PROFILE_PROJECTS_OFFLINE='1'; npm run check
$env:PROFILE_PROJECTS_OFFLINE='1'; npm test
node --check scripts/audit-public-endpoints.mjs
node --check scripts/audit-dom-size.mjs
node --test test/llms-completeness.test.mjs test/dom-size-budget.test.mjs
npm run dom:audit
$env:PROFILE_PROJECTS_OFFLINE='1'; npm run build:ci
$env:PROFILE_PROJECTS_OFFLINE='1'; npm run audit:playwright:update
$env:PROFILE_PROJECTS_OFFLINE='1'; npm run audit:playwright
```

Result: `npm run audit:playwright` passed all 21 tests: seven CSP browser checks, six axe checks, and eight visual baselines.

## Continuation State

T145 is complete. Continue with T146: wire strict rendered `style-src-elem` hash verification into the build-output audit path so active critical/no-JS CSS hashes cannot drift outside the fast unit-test guard.
