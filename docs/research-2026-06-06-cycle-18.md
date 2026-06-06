# Research Cycle 18 - T141 CSP audit implementation blueprint

Date: 2026-06-06
Scope: `sysadmindoc.github.io` CSP audit script, CSP audit tests, style runtime-write classification, and candidate-policy test planning.

## Orientation

Cycle 17 reopened the style-side CSP queue with T141-T144. Cycle 18 inspected the current audit script and tests to make T141 implementation-ready.

## Files inspected

- `scripts/audit-csp.mjs`
- `test/csp-audit.test.mjs`
- `package.json`
- `src/layouts/Base.astro`
- `src/styles/critical.css`
- `public/scripts/main.js`
- `public/scripts/cmdk.js`
- `public/scripts/project-page.js`
- `public/scripts/theme.js`
- `playwright.audits.config.mjs`
- `tests/playwright/portfolio-audits.spec.mjs`

## Current audit shape

`scripts/audit-csp.mjs` already has the core parser needed for T141:

- `parseCsp()` parses directives.
- `parseAttrs()` parses HTML attributes.
- `styleBlocks` captures `<style>` blocks and hashes static block content.
- `styleAttributes` captures static `style=""` attributes.
- `candidateStyleSrc` models one aggregate `style-src` candidate.
- `candidateStyleBlockers` combines style blocks and style attributes into one blocker list.

`test/csp-audit.test.mjs` currently locks the aggregate posture:

- default audit expects 15 inline style blocks and 16 inline style attributes.
- `--candidate-style-src "'self'"` expects 31 blockers.
- strict candidate mode fails while the aggregate blockers remain.

## Additional measurements for T141

Commands:

```text
rg -n 'rel="stylesheet"|as="style"|data-async-style' src
rg '\.style\.cssText' public\scripts src scripts
rg '\.style\.' public\scripts src scripts
rg 'setAttribute\("style"|setAttribute\(''style''' public\scripts src scripts
```

Results:

- Source stylesheet link surfaces: 1 (`src/layouts/Base.astro:115`, the async `globalCssUrl` stylesheet).
- Source style blocks: 15.
- Source static style attributes: 16.
- Runtime `style.cssText` writes: 6.
- Runtime `setAttribute("style", ...)` writes: 0.
- Total `.style.` references: 32, including direct property writes/reads that should be informational rather than treated the same as `cssText`.

## T141 implementation blueprint

### CLI options

Add options while preserving the existing aggregate mode:

- `--candidate-style-src <tokens>` remains the legacy aggregate check.
- `--candidate-style-src-elem <tokens>` checks style elements and stylesheet links.
- `--candidate-style-src-attr <tokens>` checks static style attributes plus runtime style-attribute writes.

Update help output and `package.json` scripts:

- Keep `csp:audit:style` for the aggregate candidate.
- Add `csp:audit:style:elem`.
- Add `csp:audit:style:attr`.
- Consider `csp:audit:style:split` to run both staged candidates in one command.

### Directive parsing

Add a helper that models CSP fallback correctly:

- `style-src-elem` falls back to `style-src`, then `default-src`.
- `style-src-attr` falls back to `style-src`, then `default-src`.
- Existing `style-src` still falls back to `default-src`.

Output should print all three effective policies:

```text
style-src: ...
style-src-elem: ... (falls back to style-src)
style-src-attr: ... (falls back to style-src)
```

### Inventory additions

Add `styleLinks` records for stylesheet link fetches:

- Parse `<link>` tags where `rel` includes `stylesheet`.
- Also classify `<link rel="preload" as="style">` as a style preload surface if present.
- Classify source kind like scripts: self-hosted, third-party, dynamic, or other.
- The current source has one stylesheet link and it should be allowed by a self candidate once `href={globalCssUrl}` is classified as self/dynamic-self.

Add runtime style write inventory for JavaScript source:

- Scan `public/scripts` and any source JS modules that ship to the browser.
- Count `style.cssText` writes as `style-attr-runtime` blockers for strict attr candidates.
- Count `setAttribute("style", ...)` writes as `style-attr-runtime` blockers.
- Count direct `element.style.property = ...` as informational, because MDN distinguishes direct property writes from `cssText`/style-attribute writes.
- Include file and line for each runtime write.

### Candidate blockers

Split blockers:

- `candidateStyleElemBlockers`: style blocks not allowed by hash/nonce/unsafe-inline plus stylesheet links not allowed by source tokens.
- `candidateStyleAttrBlockers`: static `style=""`, runtime `style.cssText`, and `setAttribute("style", ...)` when attr candidate does not allow them.
- Aggregate `candidateStyleBlockers` can remain as a compatibility summary.

### Expected current output

Source split candidate should report roughly:

- `style-src-elem 'self'`: blocks 15 inline style blocks, allows the self stylesheet link.
- `style-src-attr 'none'`: blocks 16 static style attributes plus 6 runtime `style.cssText` writes.
- Direct style property writes are listed as informational and should not fail `style-src-attr 'none'`.

Built split candidate should report:

- 394 built style blocks.
- 618 built style attributes.
- Built runtime JS writes should be reported from source JS scan, not multiplied by built route count.

### Test updates

Update `test/csp-audit.test.mjs` to cover:

- Default output includes effective `style-src-elem` and `style-src-attr` lines.
- Aggregate legacy candidate still reports 31 current source blockers.
- `--candidate-style-src-elem "'self'"` reports 15 inline style-block blockers, not 31.
- `--candidate-style-src-attr "'none'"` reports 16 static style attributes plus 6 runtime `cssText` writes.
- Strict `style-src-elem` candidate fails until T142 resolves style blocks.
- Strict `style-src-attr` candidate fails until T143 resolves static/runtime attribute writes.

## Roadmap changes

Cycle 18 deepens T141 rather than adding a new TODO ID. T141 should be implemented first because it makes T142 and T143 measurable in smaller, independently verifiable stages.

## Continuation state

### Last completed cycle

Cycle 18: T141 implementation blueprint.

### Current focus

Implement or further plan T141. The work is narrow and mostly contained to `scripts/audit-csp.mjs`, `test/csp-audit.test.mjs`, and `package.json`.

### Important findings so far

- The existing audit script already captures style blocks and attributes; it needs split candidate modes rather than a parser rewrite.
- There is exactly one source stylesheet link surface in `src/layouts/Base.astro`.
- There are six runtime `style.cssText` writes and no `setAttribute("style")` writes.
- Direct style property writes should be inventoried but not treated like style-attribute blockers.

### Next best actions

1. Add `candidateStyleElemSrc` and `candidateStyleAttrSrc` options to `scripts/audit-csp.mjs`.
2. Add style-link and runtime style-write inventories.
3. Update `test/csp-audit.test.mjs` with split candidate expectations.
4. Add package scripts for split style audits.

### Files still to inspect

- The rest of `public/scripts/main.js` around video overlay, terminal copy, and matrix/easter-egg styling.
- Any built-output CSP behavior after a fresh build from a normal local checkout/worktree path.

### Searches still to run

- `rg -n "style\\.cssText|\\.style\\." public/scripts`
- `rg -n "rel=\"stylesheet\"|as=\"style\"" dist src`
- `rg -n "candidate-style-src" scripts test package.json`
