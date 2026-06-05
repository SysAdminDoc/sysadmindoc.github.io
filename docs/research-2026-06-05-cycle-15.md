# Research Cycle 15 - Installed-PWA shortcut metadata

Date: 2026-06-05
Scope: `sysadmindoc.github.io` PWA manifest, install-menu deep links, and regression coverage.

## Orientation

- Cycle 14 left the repo clean except for the pre-existing untracked `AGENTS.md`.
- `public/manifest.json` already exposes four shortcuts: Catalog, Search, Releases, and Now.
- `rg` found no source test that validates manifest shortcuts, shortcut URLs, launch behavior, or `source=pwa` tracking.

## External evidence

- MDN documents manifest shortcuts as a list of shortcut objects and includes `description` as a supported string member.
  Source: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/shortcuts
- web.dev describes app shortcuts as installed-PWA deep links and recommends ordering shortcuts by priority because platforms may show only a limited set.
  Source: https://web.dev/patterns/web-apps/shortcuts/

## Finding

The shortcut surface was present but under-guarded:

- Shortcut objects had names and URLs but no descriptions.
- No test preserved the intended route set, order, same-origin/rooted URLs, or `source=pwa` attribution.
- Future manifest edits could accidentally drop the installed-app deep links without failing local tests.

## Implemented

T139 adds:

- Descriptions for Catalog, Search, Releases, and Now shortcuts.
- `test/pwa-manifest.test.mjs`, which validates the manifest id, start URL, scope, standalone display, launch handler, shortcut count/order, descriptions, rooted shortcut URLs, and `source=pwa` tracking.

## Verification

Completed verification for the cycle:

- `node --test test/pwa-manifest.test.mjs`
- `npm test`
- `npm run check`
- `npm run build`

## Next queue

No new open work is being left in `TODO.md`. The next meaningful candidate remains style-side CSP hardening, but it should be treated as a larger visual-regression and source-migration pass rather than a quick metadata change.
