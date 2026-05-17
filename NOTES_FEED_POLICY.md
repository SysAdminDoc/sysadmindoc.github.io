# Notes Feed Policy

Decision date: 2026-05-17

## Current Decision

This repository does not currently publish a `/til`, `/notes`, or public notes RSS feed.

The roadmap item is intentionally conditional: a notes feed should exist only after there is durable, reviewed, public-safe source content. The current repository has project data, changelog history, generated GitHub metadata, research artifacts, and a `/now` page, but it does not have a maintained note corpus that should be repackaged as TIL content.

## Why This Is Parked

- Changelog entries are release history, not standalone learning notes.
- Generated GitHub metadata is activity evidence, not editorial source material.
- Research notes under `.ai/research/` are planning artifacts, not public notes.
- Local or machine-memory notes may contain private repository names, employer context, or medical-imaging details and must not be published by default.

## Activation Criteria

A notes feed can be reconsidered only when all of these are true:

1. A tracked source directory exists, such as `content/til/` or `content/notes/`.
2. Each entry has frontmatter with title, date, tags, and an explicit public-safe review flag.
3. At least five entries are reviewed and useful outside a single work session.
4. Entries avoid private repository names, internal employer details, medical-imaging private context, secrets, customer data, and local machine paths.
5. The build validates note shape and fails on missing review metadata.
6. `/til/` or `/notes/` is generated separately from the project catalog.
7. RSS is added only after the feed has real entries.

## Future Implementation Shape

If the criteria above are met, prefer:

- `content/til/*.md` or `src/data/notes.ts` as the source of truth.
- A static `/til/` or `/notes/` page with tag/date filtering.
- A separate `til.xml` or `notes.xml` RSS feed.
- A validator script that blocks unreviewed or sensitive entries.
- Clear navigation that separates notes from project/release history.

Until then, `/timeline/`, `/releases/`, `/now/`, and project proof sections cover public momentum without pretending that planning logs are public notes.
