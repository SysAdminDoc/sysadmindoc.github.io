# Prioritization Matrix

Date: 2026-05-17

Scoring: 5 is highest for impact, fit, evidence, and risk. Effort is scored 1 low to 5 high. Tier is based on impact, urgency, risk reduction, and sequencing.

| ID | Candidate | Impact | Fit | Effort | Risk if delayed | Evidence | Tier | Notes |
|---|---|---:|---:|---:|---:|---:|---|---|
| P0-1 | Remediate production dependency advisories | 5 | 5 | 2 | 5 | 5 | Tier 0 | Directly affects README render/sanitize path. |
| P0-2 | Catalog drift audit and reconciliation | 5 | 5 | 3 | 4 | 5 | Tier 0 | Live GitHub state diverges from generated cache and catalog. |
| P0-3 | Medical-imaging public boundary review | 5 | 5 | 2 | 5 | 5 | Tier 0 | Public `RadAtlas` needs explicit visibility decision before any listing. |
| P0-4 | Canonical project memory | 4 | 5 | 1 | 4 | 5 | Tier 0 | Completed by creating `PROJECT_CONTEXT.md`; keep current going forward. |
| P1-1 | Schema-checked project data | 4 | 5 | 4 | 4 | 4 | Tier 1 | Prevents catalog errors as size grows. |
| P1-2 | Split generated data refresh workflow | 4 | 5 | 3 | 4 | 4 | Tier 1 | Stale caches currently hide public repo drift. |
| P1-3 | Stale asset and screenshot checks | 3 | 5 | 2 | 3 | 4 | Tier 1 | Tracked stale screenshots already exist. |
| P1-4 | CI dependency and catalog gates | 4 | 5 | 3 | 4 | 5 | Tier 1 | Converts manual research findings into automated signals. |
| P2-1 | Proof-oriented project detail fields | 4 | 5 | 4 | 2 | 4 | Tier 2 | Higher trust and better storytelling. |
| P2-2 | Year-in-review/timeline page | 3 | 4 | 3 | 2 | 4 | Tier 2 | Strong fit with release metadata. |
| P2-3 | Public-safe `/til` or notes | 3 | 3 | 4 | 1 | 3 | Tier 2 | Valuable only with durable source content. |
| P2-4 | Archive/anti-portfolio section | 3 | 4 | 2 | 2 | 4 | Tier 2 | Helps explain removals and renames safely. |
| P3-1 | Static full-text search | 4 | 4 | 3 | 2 | 4 | Tier 3 | Catalog breadth makes search increasingly valuable. |
| P3-2 | Core Web Vitals and bfcache audit | 3 | 5 | 2 | 2 | 4 | Tier 3 | Good quality gate before interaction changes. |
| P3-3 | Image and OG pipeline review | 3 | 4 | 3 | 2 | 3 | Tier 3 | Useful after stale asset cleanup. |
| P4-1 | Machine-readable project feeds | 3 | 4 | 3 | 1 | 3 | Tier 4 | Enables future tooling and public consumers. |
| P4-2 | Offline semantic indexing | 2 | 3 | 4 | 1 | 2 | Tier 4 | Interesting, but not needed before schema and search. |

## Sequencing Rationale

Dependency remediation comes first because external advisories affect code that handles remote README content.

Catalog reconciliation comes next because the site is a public portfolio and live GitHub state changes faster than static docs.

Privacy review stays in Tier 0 because a portfolio can accidentally amplify a repository that should not be public.

Schema validation, generated-data automation, and stale asset checks are Tier 1 because they make future catalog refreshes safer.

Experience features are deliberately behind trust work. The current site already has a strong baseline; the next public value is stronger proof and discovery, not broad visual churn.
