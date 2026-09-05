import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { exportedArray, sourceFile } from '../scripts/lib/ts-data-utils.mjs';

const root = process.cwd();
const careerPath = path.join(root, 'src', 'data', 'career.ts');
const ISO = /^\d{4}-\d{2}-\d{2}$/;

async function loadRoles() {
  const text = await fs.readFile(careerPath, 'utf8');
  return exportedArray(sourceFile(careerPath, text), 'careerRoles');
}

test('every career role exposes JSON Resume-compatible ISO dates', async () => {
  const roles = await loadRoles();
  assert.ok(roles.length >= 1, 'expected at least one career role');
  for (const role of roles) {
    assert.match(role.startDate, ISO, `${role.company} startDate must be ISO YYYY-MM-DD`);
    if (role.endDate !== undefined) {
      assert.match(role.endDate, ISO, `${role.company} endDate must be ISO YYYY-MM-DD`);
      assert.ok(
        new Date(role.startDate) < new Date(role.endDate),
        `${role.company} startDate must precede endDate`,
      );
    }
  }
});

test('exactly the current role omits an end date', async () => {
  const roles = await loadRoles();
  const current = roles.filter((role) => role.tone === 'current');
  assert.equal(current.length, 1, 'expected exactly one current role');
  assert.equal(current[0].endDate, undefined, 'the current role must not have an endDate');
  for (const role of roles.filter((r) => r.tone !== 'current')) {
    assert.ok(role.endDate, `${role.company} (past role) must have an endDate`);
  }
});

test('career roles are ordered most-recent-first for logical reading order', async () => {
  const roles = await loadRoles();
  for (let i = 0; i < roles.length - 1; i += 1) {
    assert.ok(
      new Date(roles[i].startDate) > new Date(roles[i + 1].startDate),
      `role "${roles[i].company}" must start after the following role "${roles[i + 1].company}"`,
    );
  }
});

test('resume HTML, JSON, and PDF all derive from the shared career source', async () => {
  const [astro, json, pdf] = await Promise.all([
    fs.readFile(path.join(root, 'src', 'pages', 'resume.astro'), 'utf8'),
    fs.readFile(path.join(root, 'src', 'pages', 'resume.json.ts'), 'utf8'),
    fs.readFile(path.join(root, 'scripts', 'generate-resume-pdf.mjs'), 'utf8'),
  ]);
  assert.match(astro, /from '\.\.\/data\/career'/, 'resume.astro must render the shared career data');
  assert.match(json, /from '\.\.\/data\/career'/, 'resume.json.ts must export the shared career data');
  // The PDF is a print of the /resume route, so it shares the HTML document order.
  assert.match(pdf, /\/resume\b/, 'the PDF generator must print the /resume route');
  // JSON Resume export must carry structured dates, not just prose.
  assert.match(json, /startDate: role\.startDate/, 'resume.json.ts must emit structured startDate');
});

test('resume document renders the experience heading before the roles', async () => {
  const astro = await fs.readFile(path.join(root, 'src', 'pages', 'resume.astro'), 'utf8');
  const headingIndex = astro.indexOf('id="resume-experience-title"');
  const rolesIndex = astro.indexOf('careerRoles.map');
  assert.ok(headingIndex !== -1, 'expected an experience section heading');
  assert.ok(rolesIndex !== -1, 'expected the roles to be rendered from careerRoles');
  assert.ok(headingIndex < rolesIndex, 'the experience heading must precede the roles in reading order');
});

test('the built resume is validated against the published JSON Resume schema', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const script = await fs.readFile(path.join(root, 'scripts', 'audit-resume-schema.mjs'), 'utf8');

  // The endpoint advertises v1.0.0 in its $schema field but nothing checked the
  // export satisfied it; the assertions above only cover the career source data.
  assert.equal(pkg.scripts['resume:audit'], 'node scripts/audit-resume-schema.mjs');
  assert.match(pkg.scripts['build:ci'], /npm run resume:audit\b/, 'the schema audit must run in the build chain');

  // It reads dist/, so it belongs in build:ci and not in this suite: `npm test`
  // runs before `npm run build` in deploy:preflight, and a test needing a built
  // artifact would skip in exactly the gate that matters.
  const ci = pkg.scripts['build:ci'];
  assert.ok(ci.indexOf('astro build') < ci.indexOf('npm run resume:audit'));
  assert.equal(pkg.devDependencies['@jsonresume/schema'], '^1.3.1');

  // A missing $schema means the document claims nothing, which must not pass.
  assert.match(script, /the export must declare the \$schema it claims to satisfy/);
});

test('non-standard resume fields are reported rather than silently accepted', async () => {
  const script = await fs.readFile(path.join(root, 'scripts', 'audit-resume-schema.mjs'), 'utf8');

  // JSON Resume sets additionalProperties: true, so work[].keywords is valid but
  // no spec-following consumer reads it. That is worth saying out loud without
  // failing a build over a field the schema explicitly permits.
  assert.match(script, /function unknownFields\(/);
  assert.match(script, /non-standard fields/);
});
