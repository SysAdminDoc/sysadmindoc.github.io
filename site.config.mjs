// Single source of truth for the site's canonical web origin, shared by
// astro.config.mjs and the Node audit/smoke scripts so they never drift.
//
// Note: this is the WEB origin only. It is deliberately separate from the GitHub
// repository slug (`SysAdminDoc/sysadmindoc.github.io`) and from the live-app
// URLs (`sysadmindoc.github.io/<app>/`), which remain hosted on GitHub Pages and
// must not be rewritten to this origin.
export const SITE_URL = 'https://portfolio.getparkerai.com';
