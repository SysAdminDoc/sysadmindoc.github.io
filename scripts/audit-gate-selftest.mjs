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

// Each case names the audit, the argv that points it at the scratch copy, and a
// mutation that violates exactly what that audit exists to catch.
const cases = [
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
    return 0;
  } catch (error) {
    return typeof error.status === 'number' ? error.status : 1;
  }
}

console.log('Audit gate self-test');
console.log(`  source build: ${path.relative(root, sourceDist).replace(/\\/g, '/') || sourceDist}`);

const failures = [];
for (const testCase of cases) {
  resetScratch();

  // The clean copy must pass, or a "failure" below proves nothing.
  const clean = runAudit(testCase.args);
  if (clean !== 0) {
    failures.push(`${testCase.name}: refused the unmodified build (exit ${clean}), so its planted-violation result means nothing`);
    continue;
  }

  if (!testCase.plant()) {
    failures.push(`${testCase.name}: could not plant "${testCase.violation}" — the artifact it depends on is missing`);
    continue;
  }

  const planted = runAudit(testCase.args);
  if (planted === 0) {
    failures.push(`${testCase.name}: passed with ${testCase.violation} planted, so the gate does not check what it claims`);
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

console.log(`Audit gate self-test passed: ${cases.length} gates each rejected a planted violation.`);
