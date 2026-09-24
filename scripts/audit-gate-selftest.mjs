#!/usr/bin/env node
// Negative control for every build-time audit that reads dist/.
//
// Three separate gates were found measuring nothing while their own tests
// stayed green, because those tests exercised a helper against a synthetic
// fixture rather than the artifact the gate inspects in production:
// fix-html-structure keyed both order checks on a file that had been deleted,
// astro.config.mjs enabled incrementalBuild with no cacheKey to act on, and
// deps:audit --strict passed on a tree eight packages behind. A gate that
// cannot be made to fail is worse than no gate, because it buys confidence
// nothing paid for.
//
// So each audit here gets a violation planted in a throwaway copy of the real
// build and must exit non-zero. The copy is why this is safe to run inside
// build:ci: the tree that ships is never mutated.
//
//   --dist <path>   source build to copy (default dist)
//   --keep          leave the scratch copy in place for inspection
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const distArg = process.argv.indexOf('--dist');
const sourceDist = path.resolve(root, distArg === -1 ? 'dist' : process.argv[distArg + 1]);
const keep = process.argv.includes('--keep');
const scratch = path.join(root, '.tmp', 'gate-selftest-dist');

if (!fs.existsSync(path.join(sourceDist, 'index.html'))) {
  console.error(`audit-gate-selftest: ${sourceDist}/index.html not found. Run the build first.`);
  process.exit(1);
}

function readScratch(relative) {
  return fs.readFileSync(path.join(scratch, relative), 'utf8');
}

function writeScratch(relative, contents) {
  fs.writeFileSync(path.join(scratch, relative), contents, 'utf8');
}

function scratchHtmlFiles(dir = scratch) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return scratchHtmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

// Each case names the audit, the argv that points it at the scratch copy, and a
// mutation that violates exactly what that audit exists to catch. A case with
// `expect` must also fail for that reason, not for something the plant broke
// on the way.
/** @type {{ name: string, args: string[], violation: string, expect?: RegExp, prepare?: () => void, plant: () => boolean }[]} */
const cases = [
  {
    name: 'csp:audit:dist:style:elem',
    args: ['scripts/audit-csp.mjs', '--dist', scratch, '--active-style-src-elem', '--strict'],
    violation: 'an img-src host that no built file loads from',
    expect: /1 allowed host source\(s\) are loaded by no built file: img-src https:\/\/unused-host\.example/,
    // The build runs this gate before search:index writes pagefind/, whose
    // vendored UI assigns innerHTML under the Trusted Types default policy.
    // Check the copy in the state the gate really sees.
    prepare() {
      fs.rmSync(path.join(scratch, 'pagefind'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    },
    plant() {
      // Every page carries the same policy, and a page that differed would fail
      // for divergence instead, so the host goes into all of them.
      let planted = 0;
      for (const file of scratchHtmlFiles()) {
        const html = fs.readFileSync(file, 'utf8');
        const next = html.replace("img-src 'self' data:", "img-src 'self' data: https://unused-host.example");
        if (next !== html) {
          fs.writeFileSync(file, next, 'utf8');
          planted += 1;
        }
      }
      return planted > 0;
    },
  },
  {
    name: 'csp:audit:dist:style:elem (policy drift)',
    args: ['scripts/audit-csp.mjs', '--dist', scratch, '--active-style-src-elem', '--strict'],
    violation: "one page whose CSP meta has drifted from the rest, as offline.html's hand-kept copy did twice",
    expect: /1 built CSP meta tag\(s\) differ from the active policy/,
    prepare() {
      fs.rmSync(path.join(scratch, 'pagefind'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    },
    plant() {
      const html = readScratch('uses/index.html');
      const drifted = html.replace(/(<meta http-equiv="Content-Security-Policy" content="[^"]*?)object-src 'none'/, "$1object-src 'self'");
      if (drifted === html) return false;
      writeScratch('uses/index.html', drifted);
      return true;
    },
  },
  {
    name: 'csp:audit:dist:style:elem (missing policy)',
    args: ['scripts/audit-csp.mjs', '--dist', scratch, '--active-style-src-elem', '--strict'],
    violation: 'a page with no CSP meta at all',
    expect: /1 built HTML file\(s\) are missing a CSP meta tag/,
    prepare() {
      fs.rmSync(path.join(scratch, 'pagefind'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    },
    plant() {
      const html = readScratch('uses/index.html');
      const stripped = html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/, '');
      if (stripped === html) return false;
      writeScratch('uses/index.html', stripped);
      return true;
    },
  },
  // The build stamps sw.js once, and a stamped worker has nothing left to
  // stamp, so it would skip every check. Each run here starts from the
  // unstamped template.
  {
    name: 'sw:stamp (search index)',
    args: ['scripts/stamp-sw.mjs', '--dist', scratch],
    violation: 'a search page whose Pagefind bundle is missing',
    expect: /references Pagefind, but dist\/pagefind is empty/,
    prepare() {
      fs.copyFileSync(path.join(root, 'public', 'sw.js'), path.join(scratch, 'sw.js'));
    },
    plant() {
      const pagefind = path.join(scratch, 'pagefind');
      if (!fs.existsSync(pagefind)) return false;
      fs.rmSync(pagefind, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      fs.copyFileSync(path.join(root, 'public', 'sw.js'), path.join(scratch, 'sw.js'));
      return true;
    },
  },
  {
    name: 'sw:stamp (palette data)',
    args: ['scripts/stamp-sw.mjs', '--dist', scratch],
    violation: 'the command palette dataset missing while its loader asks for it',
    expect: /loads \/cmdk-data\.js, but dist\/cmdk-data\.js is missing/,
    prepare() {
      fs.copyFileSync(path.join(root, 'public', 'sw.js'), path.join(scratch, 'sw.js'));
    },
    plant() {
      const dataset = path.join(scratch, 'cmdk-data.js');
      if (!fs.existsSync(dataset)) return false;
      fs.rmSync(dataset);
      fs.copyFileSync(path.join(root, 'public', 'sw.js'), path.join(scratch, 'sw.js'));
      return true;
    },
  },
  {
    name: 'fix-html-structure',
    args: ['scripts/fix-html-structure.mjs', '--dist', scratch],
    violation: 'a SafeDOM consumer loading before shared.js',
    plant() {
      const html = readScratch('index.html');
      const shared = '<script src="/scripts/shared.js"></script>';
      const loader = '<script src="/scripts/cmdk-loader.js"></script>';
      if (!html.includes(shared) || !html.includes(loader)) return false;
      writeScratch('index.html', html.replace(shared + loader, loader + shared));
      return true;
    },
  },
  {
    name: 'a11y:audit',
    args: ['scripts/audit-a11y.mjs', '--strict', '--dist', scratch],
    violation: 'an image with no alt text',
    plant() {
      const html = readScratch('index.html');
      const at = html.indexOf('<main');
      if (at < 0) return false;
      const insert = html.indexOf('>', at) + 1;
      writeScratch('index.html', `${html.slice(0, insert)}<img src="/icon-192.png" width="16" height="16">${html.slice(insert)}`);
      return true;
    },
  },
  {
    name: 'resume:audit',
    args: ['scripts/audit-resume-schema.mjs', '--dist', scratch],
    violation: 'a work entry whose startDate is a number',
    plant() {
      const resume = JSON.parse(readScratch('resume.json'));
      if (!Array.isArray(resume.work) || resume.work.length === 0) return false;
      resume.work[0].startDate = 12345;
      writeScratch('resume.json', JSON.stringify(resume, null, 2));
      return true;
    },
  },
  {
    name: 'endpoints:audit',
    args: ['scripts/audit-public-endpoints.mjs', '--dist', scratch],
    violation: 'speculation rules with eagerness: eager',
    plant() {
      const rules = JSON.parse(readScratch('speculation-rules.json'));
      if (!Array.isArray(rules.prerender) || rules.prerender.length === 0) return false;
      rules.prerender[0].eagerness = 'eager';
      writeScratch('speculation-rules.json', JSON.stringify(rules, null, 2));
      return true;
    },
  },
  {
    name: 'feed:audit',
    args: ['scripts/audit-feed.mjs', '--dist', scratch],
    violation: 'a JSON feed with no items',
    plant() {
      const feed = JSON.parse(readScratch('feed.json'));
      feed.items = [];
      writeScratch('feed.json', JSON.stringify(feed, null, 2));
      return true;
    },
  },
  {
    name: 'sitemap:audit',
    args: ['scripts/audit-sitemap.mjs', '--dist', scratch],
    violation: 'a sitemap index with every URL removed',
    plant() {
      const file = fs.existsSync(path.join(scratch, 'sitemap-0.xml')) ? 'sitemap-0.xml' : 'sitemap-index.xml';
      writeScratch(file, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n');
      return true;
    },
  },
  {
    name: 'sitemap:audit (dateModified)',
    args: ['scripts/audit-sitemap.mjs', '--dist', scratch],
    violation: 'a reviewed page whose structured data dates it differently from the sitemap',
    expect: /reviewed route "\/now\/" says dateModified "2001-01-01" in its structured data but lastmod/,
    plant() {
      const html = readScratch('now/index.html');
      const next = html.replace(/"dateModified":\s*"[^"]*"/g, '"dateModified":"2001-01-01"');
      if (next === html) return false;
      writeScratch('now/index.html', next);
      return true;
    },
  },
  {
    name: 'links:audit',
    args: ['scripts/audit-built-links.mjs', '--dist', scratch],
    violation: 'an internal link to a route the build does not produce',
    plant() {
      const html = readScratch('index.html');
      const at = html.indexOf('<main');
      if (at < 0) return false;
      const insert = html.indexOf('>', at) + 1;
      writeScratch('index.html', `${html.slice(0, insert)}<a href="/definitely-not-a-route/">broken</a>${html.slice(insert)}`);
      return true;
    },
  },
  {
    name: 'links:audit (orphan)',
    args: ['scripts/audit-built-links.mjs', '--dist', scratch],
    violation: 'a sitemap route that no page links to',
    expect: /no page links to \/uses\/, which is in the sitemap/,
    plant() {
      let planted = 0;
      for (const file of scratchHtmlFiles()) {
        const html = fs.readFileSync(file, 'utf8');
        const next = html.replaceAll('href="/uses/"', 'href="/"');
        if (next !== html) {
          fs.writeFileSync(file, next, 'utf8');
          planted += 1;
        }
      }
      return planted > 0;
    },
  },
  {
    name: 'links:audit (privacy link)',
    args: ['scripts/audit-built-links.mjs', '--dist', scratch],
    violation: 'a page footer without its link to /privacy/',
    expect: /index\.html: its footer has no link to \/privacy\//,
    plant() {
      const html = readScratch('index.html');
      const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
      if (!footer || !footer.includes('href="/privacy/"')) return false;
      writeScratch('index.html', html.replace(footer, footer.replaceAll('href="/privacy/"', 'href="/"')));
      return true;
    },
  },
  {
    name: 'links:audit (no footer)',
    args: ['scripts/audit-built-links.mjs', '--dist', scratch],
    violation: 'a page with its footer removed, which the audit once skipped',
    expect: /uses\/index\.html: has no footer, so no link to \/privacy\//,
    plant() {
      const html = readScratch('uses/index.html');
      const stripped = html.replace(/<footer\b[\s\S]*?<\/footer>/gi, '');
      if (stripped === html) return false;
      writeScratch('uses/index.html', stripped);
      return true;
    },
  },
  {
    name: 'dom:audit',
    args: ['scripts/audit-dom-size.mjs', '--dist', scratch],
    violation: 'thousands of extra homepage nodes',
    plant() {
      const html = readScratch('index.html');
      const at = html.indexOf('<main');
      if (at < 0) return false;
      const insert = html.indexOf('>', at) + 1;
      writeScratch('index.html', `${html.slice(0, insert)}${'<span>x</span>'.repeat(4000)}${html.slice(insert)}`);
      return true;
    },
  },
  {
    name: 'schema:audit',
    args: ['scripts/audit-schema.mjs', '--dist', scratch],
    violation: 'the structured-data blocks stripped from the homepage',
    plant() {
      const html = readScratch('index.html');
      const stripped = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
      if (stripped === html) return false;
      writeScratch('index.html', stripped);
      return true;
    },
  },
  {
    name: 'search:audit',
    args: ['scripts/audit-search-index.mjs', '--dist', scratch],
    violation: 'the Pagefind bundle removed',
    plant() {
      const pagefind = path.join(scratch, 'pagefind');
      if (!fs.existsSync(pagefind)) return false;
      fs.rmSync(pagefind, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      return true;
    },
  },
  {
    name: 'css:output:audit',
    args: ['scripts/audit-css-output.mjs', '--dist', scratch],
    violation: 'a blur left with only its -webkit- twin, as the untargeted minifier wrote it',
    expect: /with -webkit-backdrop-filter but no backdrop-filter/,
    plant() {
      const assets = path.join(scratch, '_assets');
      for (const name of fs.readdirSync(assets).filter((file) => file.endsWith('.css')).sort()) {
        const css = readScratch(`_assets/${name}`);
        const planted = css.replace(/-webkit-backdrop-filter:([^;}]*);backdrop-filter:\1(?=[;}])/, '-webkit-backdrop-filter:$1');
        if (planted !== css) {
          writeScratch(`_assets/${name}`, planted);
          return true;
        }
      }
      return false;
    },
  },
  {
    name: 'css:output:audit (light-dark)',
    args: ['scripts/audit-css-output.mjs', '--dist', scratch],
    violation: 'an accent written with light-dark(), which the older targets drop',
    expect: /a light-dark\(\) the minifier left in place/,
    plant() {
      const assets = path.join(scratch, '_assets');
      const name = fs.readdirSync(assets).filter((file) => file.endsWith('.css')).sort()[0];
      if (!name) return false;
      writeScratch(`_assets/${name}`, `${readScratch(`_assets/${name}`)}\n.planted{color:light-dark(#000,#fff)}`);
      return true;
    },
  },
  // The audit once read only _assets/ and index.html (eighth drain review), so
  // each of these passed.
  ...['styles/offline.css', 'pagefind/pagefind-ui.css'].map((file) => ({
    name: `css:output:audit (${file})`,
    args: ['scripts/audit-css-output.mjs', '--dist', scratch],
    violation: `a light-dark() in ${file}, outside the bundled stylesheets`,
    expect: new RegExp(`${file.replace(/[./]/g, '\\$&')}: a light-dark\\(\\) the minifier left in place`),
    plant() {
      if (!fs.existsSync(path.join(scratch, file))) return false;
      writeScratch(file, `${readScratch(file)}\n.planted{color:light-dark(#000,#fff)}`);
      return true;
    },
  })),
  // Ways a browser still reads CSS that the audit once skipped (twelfth drain
  // review): each applies in Chromium, or is an SVG's or an attribute's.
  ...[
    { kind: 'upper-case tag', form: 'an upper-case <STYLE> block', file: 'privacy/index.html', plantIn: (/** @type {string} */ html) => html.replace(/(<\/head>)/i, '<STYLE>.planted{color:light-dark(#000,#fff)}</STYLE>$1'), expect: /privacy\/index\.html <style> \d+: a light-dark/ },
    { kind: 'spaced closing tag', form: 'a block closed with </style >', file: 'privacy/index.html', plantIn: (/** @type {string} */ html) => html.replace(/(<\/head>)/i, '<style>.planted{color:light-dark(#000,#fff)}</style >$1'), expect: /privacy\/index\.html <style> \d+: a light-dark/ },
    { kind: 'upper-case function', form: 'an upper-case LIGHT-DARK()', file: 'styles/offline.css', plantIn: (/** @type {string} */ css) => `${css}\n.planted{color:LIGHT-DARK(#000,#fff)}`, expect: /styles\/offline\.css: a light-dark/ },
    { kind: 'SVG style', form: "an SVG's own <style>", file: 'favicon.svg', plantIn: (/** @type {string} */ svg) => svg.replace(/(<svg\b[^>]*>)/i, '$1<style>.planted{fill:light-dark(#000,#fff)}</style>'), expect: /favicon\.svg <style> \d+: a light-dark/ },
    // The thirteenth drain review's: each of these reached browsers unseen.
    { kind: 'closing tag with more before >', form: 'a block closed with </style x>', file: 'privacy/index.html', plantIn: (/** @type {string} */ html) => html.replace(/(<\/head>)/i, '<style>.planted{color:light-dark(#000,#fff)}</style x>$1'), expect: /privacy\/index\.html <style> \d+: a light-dark/ },
    { kind: '> in an earlier value', form: 'a style attribute after a value holding >', file: 'privacy/index.html', plantIn: (/** @type {string} */ html) => html.replace(/<main\b/i, '<main title="a>b" style="color:light-dark(#000,#fff)"'), expect: /privacy\/index\.html style attribute \d+: a light-dark/ },
    { kind: 'entity in an attribute', form: 'a style attribute spelling it light&#x2d;dark', file: 'privacy/index.html', plantIn: (/** @type {string} */ html) => html.replace(/<main\b/i, '<main style="color:light&#x2d;dark(#000,#fff)"'), expect: /privacy\/index\.html style attribute \d+: a light-dark/ },
    { kind: 'CSS escape', form: 'light-dar\\6b( in a copied stylesheet', file: 'styles/offline.css', plantIn: (/** @type {string} */ css) => `${css}\n.planted{color:light-dar\\6b(#000,#fff)}`, expect: /styles\/offline\.css: a light-dark/ },
    { kind: 'data: import', form: 'an @import of a data: URI', file: 'pagefind/pagefind-ui.css', plantIn: (/** @type {string} */ css) => `@import url("data:text/css,.planted%7Bcolor:light-dark%28%23000,%23fff%29%7D");\n${css}`, expect: /pagefind-ui\.css: in an @import of a data: URI, a light-dark/ },
    { kind: 'script', form: 'a script that would put one on the page', file: 'pagefind/pagefind-highlight.js', plantIn: (/** @type {string} */ js) => `${js}\ndocument.head.insertAdjacentHTML('beforeend','<style>.planted{color:light-dark(#000,#fff)}</style>');`, expect: /pagefind-highlight\.js: a script carries a light-dark\(\)/ },
    { kind: 'style attribute', form: 'a style attribute', file: 'privacy/index.html', plantIn: (/** @type {string} */ html) => html.replace(/<main\b/i, '<main style="color:light-dark(#000,#fff)"'), expect: /privacy\/index\.html style attribute \d+: a light-dark/ },
  ].map(({ kind, form, file, plantIn, expect }) => ({
    name: `css:output:audit (${kind})`,
    args: ['scripts/audit-css-output.mjs', '--dist', scratch],
    violation: `a light-dark() in ${file}, in ${form}`,
    expect,
    plant() {
      if (!fs.existsSync(path.join(scratch, file))) return false;
      const before = readScratch(file);
      const planted = plantIn(before);
      if (planted === before) return false;
      writeScratch(file, planted);
      return true;
    },
  })),
  {
    name: 'css:output:audit (another page)',
    args: ['scripts/audit-css-output.mjs', '--dist', scratch],
    violation: "a light-dark() in /privacy/'s inline styles",
    expect: /privacy\/index\.html <style> \d+: a light-dark\(\) the minifier left in place/,
    plant() {
      const html = readScratch('privacy/index.html');
      const planted = html.replace(/(<style\b[^>]*>)/, '$1.planted{color:light-dark(#000,#fff)}');
      if (planted === html) return false;
      writeScratch('privacy/index.html', planted);
      return true;
    },
  },
  {
    name: 'css:output:audit (inline)',
    args: ['scripts/audit-css-output.mjs', '--dist', scratch],
    violation: 'the same lost blur in the critical CSS the homepage inlines',
    expect: /index\.html <style> \d+: 1 rule\(s\) with -webkit-backdrop-filter but no backdrop-filter/,
    plant() {
      const html = readScratch('index.html');
      const planted = html.replace(/(<style\b[^>]*>[^<]*?)-webkit-backdrop-filter:([^;}]*);backdrop-filter:\2(?=[;}])/, '$1-webkit-backdrop-filter:$2');
      if (planted === html) return false;
      writeScratch('index.html', planted);
      return true;
    },
  },
  {
    name: 'og-cards:audit',
    args: ['scripts/audit-og-cards.mjs', '--dist', scratch],
    violation: 'a social card replaced with a blank raster',
    plant() {
      const card = path.join(scratch, 'og.png');
      if (!fs.existsSync(card)) return false;
      // A 1x1 transparent PNG: valid image, nothing painted.
      fs.writeFileSync(
        card,
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
      );
      return true;
    },
  },
];

function resetScratch() {
  fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  fs.mkdirSync(path.dirname(scratch), { recursive: true });
  fs.cpSync(sourceDist, scratch, { recursive: true });
}

function runAudit(args) {
  try {
    execFileSync(process.execPath, args, { cwd: root, stdio: 'pipe', windowsHide: true });
    return { status: 0, stderr: '' };
  } catch (error) {
    return { status: typeof error.status === 'number' ? error.status : 1, stderr: String(error.stderr ?? '') };
  }
}

console.log('Audit gate self-test');
console.log(`  source build: ${path.relative(root, sourceDist).replace(/\\/g, '/') || sourceDist}`);

const failures = [];
for (const testCase of cases) {
  resetScratch();
  testCase.prepare?.();

  // The clean copy must pass, or a "failure" below proves nothing.
  const clean = runAudit(testCase.args);
  if (clean.status !== 0) {
    failures.push(`${testCase.name}: refused the unmodified build (exit ${clean.status}), so its planted-violation result means nothing`);
    continue;
  }

  if (!testCase.plant()) {
    failures.push(`${testCase.name}: could not plant "${testCase.violation}" — the artifact it depends on is missing`);
    continue;
  }

  const planted = runAudit(testCase.args);
  if (planted.status === 0) {
    failures.push(`${testCase.name}: passed with ${testCase.violation} planted, so the gate does not check what it claims`);
    continue;
  }
  if (testCase.expect && !testCase.expect.test(planted.stderr)) {
    failures.push(`${testCase.name}: failed with ${testCase.violation} planted, but not for that reason: ${planted.stderr.trim().slice(0, 300)}`);
    continue;
  }
  console.log(`  ${testCase.name}: rejects ${testCase.violation}`);
}

if (!keep) fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });

if (failures.length > 0) {
  console.error('Audit gate self-test failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Audit gate self-test passed: ${cases.length} planted violations were each rejected.`);
