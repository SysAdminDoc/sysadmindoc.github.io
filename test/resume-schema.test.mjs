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
