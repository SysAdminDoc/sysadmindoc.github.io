# Semantic Index Evaluation

Status date: 2026-05-17
Site version: v0.16.15

## Decision

Do not add hosted semantic search, client-side embeddings, or visitor tracking to the portfolio right now.

The current Pagefind search covers rendered pages and README excerpts without a backend. The useful semantic-indexing gap is maintainability: finding similar projects, possible category drift, and near-duplicate project positioning inside the local catalog.

For v0.16.15, the repo adds a local advisory audit instead of runtime model code:

```bash
npm run semantic:audit
```

The script reads public project metadata plus ignored cached README text when available, builds a deterministic local token-similarity index, and reports top similar pairs plus cross-category review candidates. It does not call an external model, publish embeddings, track visitors, or change runtime search behavior.

## Why Not Embeddings Yet

- The site is static on GitHub Pages, so hosted vector search would add a runtime service that the portfolio does not otherwise need.
- README text can include stale upstream phrasing, so committed embeddings would age quickly unless the metadata refresh workflow owned them.
- Pagefind already handles full-text discovery over the rendered portfolio.
- A local audit gives the maintainability benefit without privacy, hosting, or bundle-size costs.

## Current Local Audit Result

The first run checked 173 projects and found 165 usable cached README texts after local text cleanup. The strongest similar-project pairs are useful as review hints, not automatic routing decisions.

Current command:

```bash
npm run semantic:audit -- --limit 12
```

Use the report when:

- Adding newly public repositories to `src/data/projects.ts`.
- Reviewing category drift after a large GitHub metadata refresh.
- Looking for candidates for future related-project sections or stronger Pagefind filters.

Current top cross-category review hints include `NDNS` / `BetterNext`, `LocalAndroidStore` / `LocalChromeStore`, and `SwiftShot` / `Snapture`. Treat these as catalog-maintenance prompts only; categories still require human judgment.

## Guardrails

- Keep semantic analysis local and advisory unless a future roadmap item proves a user-facing benefit.
- Do not add hosted inference or analytics.
- Do not commit private/internal text, model traces, or embeddings.
- If embeddings are introduced later, generate them from public source data only and document the model, input corpus, refresh cadence, and privacy boundary.
