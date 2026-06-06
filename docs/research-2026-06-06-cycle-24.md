# Cycle 24 Research - Build-output style CSP hash drift

Date: 2026-06-06
Focus: T146 build-output `style-src-elem` hash drift enforcement

## Orientation

Cycle 23 left the visual baseline suite deterministic and marked T146 as the next security follow-up. The active style policy is:

```text
style-src 'self';
style-src-elem 'self' <critical CSS hash> <no-JS fallback hash>;
style-src-attr 'none';
```

The source unit test already guards the two hash inputs, but `build:ci` did not prove that the rendered `dist/` output still matched the active `style-src-elem` policy.

## Implementation

`scripts/audit-csp.mjs` now accepts `--active-style-src-elem`. In that mode, the audit derives the style-element candidate tokens from the active CSP meta tag instead of requiring package scripts to duplicate the two hash strings.

`package.json` now exposes:

```text
npm run csp:audit:dist:style:elem
```

That script runs:

```text
node scripts/audit-csp.mjs --dist --active-style-src-elem --strict
```

`build:ci` runs the strict rendered CSP gate after Astro build, HTML repair, and public script minification, then continues into endpoint/feed/DOM/search/schema audits.

## Verification

Commands run:

```text
node --check scripts/audit-csp.mjs
node --test test/csp-audit.test.mjs test/public-script-minify.test.mjs
npm run build:ci
npm test
npm run check
git diff --check
```

The build-integrated CSP gate reported:

```text
built HTML files scanned: 194
CSP meta tags: 194
inline style blocks: 388
stylesheet/preload links: 776
PASS - active policy allows all current style element/link surfaces.
```

Source-mode `--active-style-src-elem --strict` correctly fails because Astro source still contains component-level style blocks that are externalized or compiled in rendered output. The strict active-policy check belongs in the rendered `dist/` path.

## Follow-up

T147 should require rendered CSP metadata consistency. The current audit derives the active policy from the first CSP meta tag; strict dist mode should also fail if any built HTML file lacks a CSP meta tag or contains a divergent CSP policy before deriving active style tokens.
