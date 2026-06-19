import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
import { propertyName, sourceFile } from './lib/ts-data-utils.mjs';

const root = process.cwd();
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const screenshotsDir = path.join(root, 'public', 'screenshots');
const thumbsDir = path.join(root, 'src', 'assets', 'screenshots', 'thumbs');

const TIMEOUT_MS = 15_000;
const STALE_DAYS = 90;
const RETRIES = 1;

function parseStringProp(obj, key) {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = propertyName(prop.name);
    if (name !== key) continue;
    if (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
      return prop.initializer.text;
    }
  }
  return null;
}

function parseLiveApps(text) {
  const source = sourceFile(projectsPath, text);
  const apps = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== 'liveApps') continue;
      if (!decl.initializer || !ts.isArrayLiteralExpression(decl.initializer)) continue;
      for (const el of decl.initializer.elements) {
        if (!ts.isObjectLiteralExpression(el)) continue;
        const slug = parseStringProp(el, 'slug');
        const url = parseStringProp(el, 'url');
        const name = parseStringProp(el, 'name');
        if (slug && url) apps.push({ slug, url, name: name || slug });
      }
    }
  }
  return apps;
}

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'sysadmindoc-live-app-audit/1.0' },
    });
    return { status: res.status, ok: res.ok, latencyMs: Date.now() - start, error: null };
  } catch (err) {
    return { status: 0, ok: false, latencyMs: Date.now() - start, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function fileMtime(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtime;
  } catch {
    return null;
  }
}

const projectsText = await fs.readFile(projectsPath, 'utf8');
const apps = parseLiveApps(projectsText);

if (apps.length === 0) {
  console.error('No liveApps found in projects.ts');
  process.exit(1);
}

const manifestPath = path.join(screenshotsDir, 'manifest.json');
let manifestCaptures = new Map();
try {
  const manifestData = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (Array.isArray(manifestData.captures)) {
    for (const capture of manifestData.captures) {
      if (capture.slug && capture.result === 'ok') manifestCaptures.set(capture.slug, capture);
    }
  }
} catch { /* manifest may not exist yet */ }

const now = Date.now();
const results = [];

for (const app of apps) {
  let result = await checkUrl(app.url);
  if (!result.ok && RETRIES > 0) {
    result = await checkUrl(app.url);
  }

  const masterPath = path.join(screenshotsDir, `${app.slug}.jpg`);
  const thumbPath = path.join(thumbsDir, `${app.slug}.jpg`);
  const masterMtime = await fileMtime(masterPath);
  const thumbMtime = await fileMtime(thumbPath);

  const capture = manifestCaptures.get(app.slug);
  const capturedAt = capture?.capturedAt ?? null;
  const captureAgeDays = capturedAt ? Math.floor((now - new Date(capturedAt).getTime()) / 86_400_000) : null;
  const masterAgeDays = captureAgeDays ?? (masterMtime ? Math.floor((now - masterMtime.getTime()) / 86_400_000) : null);
  const thumbAgeDays = thumbMtime ? Math.floor((now - thumbMtime.getTime()) / 86_400_000) : null;
  const screenshotStale = masterAgeDays !== null && masterAgeDays > STALE_DAYS;
  const screenshotMissing = masterAgeDays === null;

  results.push({
    slug: app.slug,
    name: app.name,
    url: app.url,
    httpStatus: result.status,
    httpOk: result.ok,
    latencyMs: result.latencyMs,
    httpError: result.error,
    capturedAt,
    masterAgeDays,
    thumbAgeDays,
    screenshotStale,
    screenshotMissing,
    hasManifestEntry: Boolean(capture),
  });
}

const healthy = results.filter((r) => r.httpOk);
const unhealthy = results.filter((r) => !r.httpOk);
const stale = results.filter((r) => r.screenshotStale);
const missing = results.filter((r) => r.screenshotMissing);

const withManifest = results.filter((r) => r.hasManifestEntry);
console.log('Live app availability audit');
console.log(`  apps checked: ${results.length}`);
console.log(`  healthy: ${healthy.length}`);
console.log(`  unhealthy: ${unhealthy.length}`);
console.log(`  manifest provenance: ${withManifest.length}/${results.length}`);
console.log(`  stale screenshots (>${STALE_DAYS}d): ${stale.length}`);
console.log(`  missing screenshots: ${missing.length}`);

if (unhealthy.length > 0) {
  console.log('');
  console.log('Unhealthy apps:');
  for (const r of unhealthy) {
    const reason = r.httpError || `HTTP ${r.httpStatus}`;
    console.log(`  - ${r.slug}: ${reason} (${r.latencyMs}ms)`);
  }
}

if (stale.length > 0) {
  console.log('');
  console.log('Stale screenshots:');
  for (const r of stale) {
    console.log(`  - ${r.slug}: master ${r.masterAgeDays}d old`);
  }
}

if (missing.length > 0) {
  console.log('');
  console.log('Missing screenshots:');
  for (const r of missing) {
    console.log(`  - ${r.slug}`);
  }
}

const outDir = path.resolve(root, '.tmp');
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(
  path.join(outDir, 'live-app-audit.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
);

console.log('');
if (unhealthy.length > 0) {
  console.log(`Live app availability audit: ${unhealthy.length} app(s) unreachable.`);
} else {
  console.log('Live app availability audit passed.');
}
