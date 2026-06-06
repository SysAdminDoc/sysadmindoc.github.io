# Cycle 25 Research - Rendered CSP metadata consistency

Date: 2026-06-06
Focus: T147 rendered CSP meta consistency

## Orientation

Cycle 24 added a strict rendered `style-src-elem` gate that derives candidate tokens from the active CSP policy. That caught hash drift, but the audit still selected the first CSP meta tag and assumed all other rendered pages shared the same policy.

## Implementation

`scripts/audit-csp.mjs` now tracks rendered CSP metadata at file level in dist mode:

- built files with no CSP meta;
- built files with multiple CSP metas;
- unique rendered CSP policy count;
- CSP meta tags whose content differs from the active policy.

Strict dist mode fails on any missing, duplicated, or divergent CSP metadata and includes representative file paths in the failure output. Normal source inventory mode stays focused on the existing CSP surface inventory.

## Verification

Commands run:

```text
node --check scripts/audit-csp.mjs
node --test test/csp-audit.test.mjs
npm run csp:audit:dist:style:elem
npm run build:ci
npm test
npm run check
git diff --check
```

The rendered CSP audit reported:

```text
built HTML files scanned: 194
CSP meta tags: 194
files with one CSP meta: 194/194
unique CSP policies: 1
PASS - active policy allows all current style element/link surfaces.
```

Regression coverage now builds a temporary dist fixture with one valid page, one page missing CSP metadata, and one page with a divergent policy. Strict dist mode fails that fixture and reports both the missing and divergent path classes.

## Follow-up

T148 should generate the active `style-src-elem` hashes from the same source strings that render the critical CSS and no-JS fallback style blocks. T146/T147 will remain the rendered-output proof after that source-side policy assembly is simplified.
