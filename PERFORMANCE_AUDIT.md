# Performance, bfcache, and Service Worker Audit

Audit date: 2026-05-17
Site version: v0.16.12
Preview target: `http://127.0.0.1:4321/`

## Summary

The portfolio now has an explicit service-worker update prompt instead of silently activating a new worker over an open tab. The homepage hero terminal also reserves a fixed initial body height so animated terminal text does not push the hero layout during load.

Local Lighthouse JSON artifacts were written under `.tmp/perf/`. Lighthouse completed each run and wrote JSON, but the transient CLI repeatedly reported a Windows temp-directory cleanup `EPERM` after Chrome shutdown. Treat the JSON metrics as valid local lab samples, not field data.

`npm run audit:perf -- --base http://127.0.0.1:4321` is available as a repeatable Chromium smoke audit for LCP, CLS, event timing, horizontal overflow, and bfcache behavior. Add `--strict` when a failing exit code is desired; by default it reports warnings so known mobile follow-up work does not block local documentation runs.

## Metric Thresholds

Core Web Vitals thresholds from web.dev:

- LCP: good at 2.5s or less.
- INP: good at 200ms or less.
- CLS: good at 0.1 or less.

Lighthouse lab runs cannot measure INP directly because there is no real user interaction. This audit records Total Blocking Time as the local lab proxy for future INP risk.

## Local Lighthouse Results

| Route | Mode | Score | LCP | CLS | TBT | FCP | Speed Index | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | Desktop | 97 | 1.123s | 0.049 | 0ms | 0.842s | 0.842s | Pass |
| `/#catalog` | Desktop | 98 | 0.842s | 0.049 | 0ms | 0.842s | 1.184s | Pass |
| `/projects/LibreSpot/` | Desktop | 100 | 0.663s | 0.0069 | 0ms | 0.490s | 0.490s | Pass |
| `/` | Mobile emulation | 83 | 3.197s | 0.127 | 0ms | 2.822s | 3.058s | Needs follow-up |
| `/projects/LibreSpot/` | Mobile emulation | 89 | 3.139s | 0.0006 | 0ms | 2.689s | 2.689s | LCP follow-up |

## bfcache Status

Chromium Playwright navigation sample:

- Flow: `/` -> `/projects/LibreSpot/` -> browser back.
- Resulting navigation type: `back_forward`.
- `notRestoredReasons`: `null`.
- `window.onunload`: false.
- `window.onbeforeunload`: false.

The sampled path is bfcache-compatible in Chromium. Keep avoiding `unload` and persistent `beforeunload` handlers.

## Service Worker Update UX

Local implementation:

- `public/sw.js` cache name bumped to `portfolio-v10`.
- The install handler precaches without unconditional `skipWaiting()`.
- `public/sw.js` now accepts a `{ type: "SKIP_WAITING" }` message.
- `public/scripts/main.js` registers the worker on page load, listens for `updatefound`, detects an installed waiting worker, and shows an accessible update toast.
- The page reloads on `controllerchange` only after the visitor clicks the toast refresh action.

This avoids silent stale/open-tab behavior while preserving static offline caching.

## Remaining Performance Work

- Homepage mobile emulation still misses the good LCP threshold and reports CLS above 0.1. The likely residual source is hero text/font/layout settling on narrow screens.
- Project pages are substantially cleaner than the homepage. Future optimization should focus on the first viewport of `/` before changing project-page templates.
- Field INP remains unknown without real-user monitoring; the local Lighthouse proxy is clean with 0ms TBT across sampled pages.

## Sources

- web.dev Core Web Vitals: https://web.dev/articles/vitals
- web.dev bfcache guidance: https://web.dev/articles/bfcache
- MDN `ServiceWorkerRegistration.updatefound`: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updatefound_event
- MDN `ServiceWorkerContainer.controllerchange`: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/controllerchange_event
