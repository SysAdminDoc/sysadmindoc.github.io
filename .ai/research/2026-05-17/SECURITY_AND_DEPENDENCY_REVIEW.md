# Security and Dependency Review

Date: 2026-05-17

## Commands

```text
npm audit --omit=dev --json
npm outdated --json
rg -n "(ghp_|github_pat_|AIza|AKIA|secret|password|PRIVATE KEY|api[_-]?key|token)" ...
```

## Summary

The site is static, but its build pipeline ingests remote README content and renders it with `marked` plus `sanitize-html`. That makes parser and sanitizer advisories materially relevant even without a hosted backend.

`npm audit --omit=dev` reported production vulnerability buckets for:

- `sanitize-html`: critical.
- `marked`: high.
- `astro`: moderate.
- `devalue`: high transitive.
- `postcss`: moderate transitive.

The broad secret-pattern scan found no hardcoded credential. Matches were expected code references (`GITHUB_TOKEN`), package names, or parser variable names.

## Direct Dependencies

| Package | Current installed | Latest from `npm outdated` | Risk or opportunity |
|---|---:|---:|---|
| `astro` | 5.18.1 | 6.3.3 | Audit remediation points to Astro 6. Requires migration review. |
| `marked` | 18.0.0 | 18.0.3 | High advisory affects tokenizer DoS. Upgrade directly. |
| `sanitize-html` | 2.17.2 | 2.17.4 | Critical advisories affect sanitizer behavior. Upgrade directly. |
| `@astrojs/check` | 0.9.8 | 0.9.9 | Low-risk dev-tool patch. |
| `typescript` | 5.9.3 | 6.0.3 | Major compiler upgrade should be separate from security patch unless required. |

## Advisory Details

| Package | Advisory | Severity | Affected evidence | Recommended action |
|---|---|---|---|---|
| `sanitize-html` | https://github.com/advisories/GHSA-9mrh-v2v3-xpfm | Critical | Current direct version is 2.17.2. | Upgrade to latest 2.17.4, retest README rendering. |
| `sanitize-html` | https://github.com/advisories/GHSA-rpr9-rxv7-x643 | Critical | Audit flags direct dependency range. | Upgrade and add sanitizer regression fixtures. |
| `marked` | https://github.com/advisories/GHSA-6v9c-7cg6-27q7 | High | Current direct version is 18.0.0. | Upgrade to at least 18.0.2; prefer 18.0.3. |
| `astro` | https://github.com/advisories/GHSA-j687-52p2-xcff | Moderate | Audit flags current Astro 5 dependency graph. | Review Astro 6 migration or documented exception if not exploitable in static build. |
| `astro` | https://github.com/advisories/GHSA-xr5h-phrj-8vxv | Moderate | Audit flags current Astro 5 dependency graph. | Review whether server islands are unused; still plan upgrade. |
| `devalue` | https://github.com/advisories/GHSA-77vg-94rm-hx3p | High | Transitive through Astro graph. | Remediate through Astro upgrade. |
| `postcss` | https://github.com/advisories/GHSA-qx2v-qp2m-jg93 | Moderate | Transitive through Astro graph. | Remediate through Astro upgrade or lockfile resolution if safe. |

## Code Surface Review

`src/pages/projects/[slug].astro`:

- Uses `marked` renderer overrides for links/images.
- Sanitizes README HTML with `sanitize-html`.
- Allows `data:` for images. This can be acceptable for GitHub README compatibility, but should be reviewed alongside sanitizer upgrades.
- Allows `class` on `span`, `div`, and `code`. This is useful for README rendering but should remain intentional.
- Rewrites relative links to GitHub blob/raw URLs.

`public/scripts/cmdk.js`:

- Builds result markup from escaped fields.
- Should remain covered by manual review if the command dataset becomes richer.

`public/scripts/main.js`:

- Uses localStorage and GitHub API enhancement.
- Registers the service worker.
- No secret handling.

`scripts/fetch-stars.mjs`:

- Reads `GITHUB_TOKEN` from environment and only uses it in request headers.
- Preserves existing caches on unauthenticated rate-limit failure.
- Does not write secrets to generated JSON.

## Hardening Backlog

Immediate:

- Upgrade `sanitize-html` and `marked`.
- Re-run `npm audit --omit=dev`.
- Add README sanitizer regression fixtures with malicious markdown/HTML examples.

Near-term:

- Plan Astro 6 migration.
- Add CI reporting for production advisories after current advisories are fixed.
- Add Dependabot for npm and GitHub Actions.
- Add catalog privacy audit checks before public repo additions.

Later:

- Review Content Security Policy options for a static GitHub Pages site.
- Review service-worker cache invalidation and update notification.
- Add link-health and stale-asset checks.

## Security Limitations

- This pass did not modify dependencies; it produced the remediation plan.
- GitHub repository visibility cannot be changed from this portfolio without explicit owner action.
- No dynamic penetration test is relevant to this static planning change set.
