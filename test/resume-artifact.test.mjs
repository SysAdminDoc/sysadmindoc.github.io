import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const root = process.cwd();

test('build gate generates the resume PDF before auditing links', async () => {
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const buildCi = pkg.scripts['build:ci'];

  assert.match(buildCi, /npm run resume:pdf && npm run bundle:audit/);
  assert.match(buildCi, /npm run sitemap:audit && npm run links:audit$/);
  assert.ok(
    buildCi.indexOf('npm run resume:pdf') < buildCi.indexOf('npm run links:audit'),
    'resume PDF must exist before internal links are audited',
  );
});

test('internal link audit fails missing and escaped internal artifacts', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sysadmindoc-links-'));
  try {
    await fs.mkdir(path.join(tmp, 'resume'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, 'resume', 'index.html'),
      '<a href="/resume.pdf">PDF</a><a href="/%2e%2e/package.json">escape</a>',
    );

    const result = spawnSync(process.execPath, ['scripts/audit-built-links.mjs', '--dist', tmp], {
      cwd: root,
      encoding: 'utf8',
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /\/resume\.pdf/);
    assert.match(result.stderr, /\/%2e%2e\/package\.json/);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('internal link audit accepts generated resume PDF artifacts', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sysadmindoc-links-'));
  try {
    await fs.mkdir(path.join(tmp, 'resume'), { recursive: true });
    await fs.writeFile(path.join(tmp, 'resume.pdf'), '%PDF-1.4\n');
    await fs.writeFile(path.join(tmp, 'resume', 'index.html'), '<a href="/resume.pdf">PDF</a>');

    const result = spawnSync(process.execPath, ['scripts/audit-built-links.mjs', '--dist', tmp], {
      cwd: root,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Internal link audit passed/);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('resume PDF generator rejects invalid port settings before serving files', () => {
  const result = spawnSync(process.execPath, ['scripts/generate-resume-pdf.mjs'], {
    cwd: root,
    env: { ...process.env, RESUME_PDF_PORT: '70000' },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RESUME_PDF_PORT must be an integer from 1 to 65535/);
});
