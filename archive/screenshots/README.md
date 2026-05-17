# Screenshot Archive Policy

`public/screenshots/` is reserved for active live-app thumbnails referenced by `src/data/projects.ts`.

When a live app is removed, renamed, privatized, or put under privacy review:

1. Delete its thumbnail from `public/screenshots/`, or move a non-sensitive historical copy here.
2. Keep sensitive, private, medical-imaging, or internal screenshots out of both folders.
3. Run `npm run assets:audit` before committing.

The production site only serves files under `public/`; this archive folder is repo documentation, not public site media.
