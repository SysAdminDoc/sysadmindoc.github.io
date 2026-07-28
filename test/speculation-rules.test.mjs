import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

// Same-origin document prerender hints give the multi-page site instant
// navigation with no framework runtime. They are inline JSON, so the production
// CSP must admit them via the narrow 'inline-speculation-rules' keyword, and the
// offline shell CSP must stay identical or the dist CSP-divergence audit fails.

test('Base.astro ships moderate same-origin speculation rules, query URLs excluded', async () => {
  const base = await fs.readFile(path.join(root, 'src', 'layouts', 'Base.astro'), 'utf8');

  assert.match(base, /const speculationRules = JSON\.stringify\(\{/);
  assert.match(base, /prerender:/);
  assert.match(base, /eagerness: 'moderate'/);
  assert.match(base, /href_matches: '\/\*'/);
  assert.match(base, /not: \{ href_matches: '\/\*\\\\\?\*' \}/, 'query-string URLs must be excluded from prerender');
  assert.match(
    base,
    /\{!isDev && <script type="speculationrules" is:inline set:html=\{speculationRules\}><\/script>\}/,
  );
});

test('the production script-src admits only inline speculation rules', async () => {
  const base = await fs.readFile(path.join(root, 'src', 'layouts', 'Base.astro'), 'utf8');
  assert.match(base, /const scriptSrc = isDev \? "'self' 'unsafe-inline'" : "'self' 'inline-speculation-rules'";/);
});

test('the offline shell CSP script-src matches the page policy', async () => {
  const offline = await fs.readFile(path.join(root, 'public', 'offline.html'), 'utf8');
  assert.match(offline, /script-src 'self' 'inline-speculation-rules'/);
});
