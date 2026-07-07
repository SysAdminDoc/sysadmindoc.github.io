import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';
import { propertyName, sourceFile } from './lib/ts-data-utils.mjs';

const root = process.cwd();
const projectsPath = path.join(root, 'src', 'data', 'projects.ts');
const screenshotsDir = path.join(root, 'public', 'screenshots');
const publicThumbsDir = path.join(screenshotsDir, 'thumbs');
const astroThumbsDir = path.join(root, 'src', 'assets', 'screenshots', 'thumbs');

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

async function fileBytesAndSha256(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    return {
      bytes: buffer.length,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    };
  } catch {
    return null;
  }
}

function parseDateMs(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

const projectsText = await fs.readFile(projectsPath, 'utf8');
const apps = parseLiveApps(projectsText);

if (apps.length === 0) {
  console.error('No liveApps found in projects.ts');
  process.exit(1);
}

const manifestPath = path.join(screenshotsDir, 'manifest.json');
let manifestCaptures = new Map();
let manifestErrors = [];
try {
  const manifestData = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifestData.schema !== 'sysadmindoc.screenshot-manifest.v1') {
    manifestErrors.push(`manifest schema must be sysadmindoc.screenshot-manifest.v1, got ${manifestData.schema || '(missing)'}`);
  }
  if (parseDateMs(manifestData.generatedAt) === null) {
    manifestErrors.push('manifest generatedAt is missing or invalid');
  }
  if (!Array.isArray(manifestData.captures)) {
    manifestErrors.push('manifest captures must be an array');
  } else {
    for (const [index, capture] of manifestData.captures.entries()) {
      if (!capture?.slug) {
        manifestErrors.push(`manifest capture ${index + 1} is missing slug`);
        continue;
      }
      if (manifestCaptures.has(capture.slug)) {
        manifestErrors.push(`manifest has duplicate capture for ${capture.slug}`);
        continue;
      }
      manifestCaptures.set(capture.slug, capture);
    }
  }
} catch (error) {
  manifestErrors.push(`manifest is missing or invalid: ${error.message}`);
}

const now = Date.now();
const results = [];
const expectedSlugs = new Set(apps.map((app) => app.slug));
for (const slug of manifestCaptures.keys()) {
  if (!expectedSlugs.has(slug)) manifestErrors.push(`manifest has extra capture for ${slug}`);
}

for (const app of apps) {
  let result = await checkUrl(app.url);
  if (!result.ok && RETRIES > 0) {
    result = await checkUrl(app.url);
  }

  const masterPath = path.join(screenshotsDir, `${app.slug}.jpg`);
  const publicThumbPath = path.join(publicThumbsDir, `${app.slug}.jpg`);
  const astroThumbPath = path.join(astroThumbsDir, `${app.slug}.jpg`);
  const masterMtime = await fileMtime(masterPath);
  const publicThumbMtime = await fileMtime(publicThumbPath);
  const astroThumbMtime = await fileMtime(astroThumbPath);
  const masterIdentity = await fileBytesAndSha256(masterPath);

  const capture = manifestCaptures.get(app.slug);
  const capturedAt = capture?.capturedAt ?? null;
  const capturedMs = parseDateMs(capturedAt);
  const captureAgeDays = capturedMs !== null ? Math.floor((now - capturedMs) / 86_400_000) : null;
  const masterAgeDays = captureAgeDays;
  const publicThumbAgeDays = publicThumbMtime ? Math.floor((now - publicThumbMtime.getTime()) / 86_400_000) : null;
  const astroThumbAgeDays = astroThumbMtime ? Math.floor((now - astroThumbMtime.getTime()) / 86_400_000) : null;
  const screenshotStale = masterAgeDays !== null && masterAgeDays > STALE_DAYS;
  const screenshotMissing = !masterMtime || !publicThumbMtime || !astroThumbMtime;
  const provenanceErrors = [];

  if (!capture) {
    provenanceErrors.push('missing manifest capture');
  } else {
    if (capture.result !== 'ok') provenanceErrors.push(`manifest result is ${capture.result || '(missing)'}`);
    if (capture.url !== app.url) provenanceErrors.push('manifest URL does not match liveApps URL');
    if (capturedMs === null) provenanceErrors.push('manifest capturedAt is missing or invalid');
    if (captureAgeDays !== null && captureAgeDays > STALE_DAYS) provenanceErrors.push(`manifest capture is ${captureAgeDays}d old`);
    if (!Number.isSafeInteger(capture.bytes) || capture.bytes < 1) provenanceErrors.push('manifest bytes is missing or invalid');
    if (!/^[0-9a-f]{64}$/i.test(String(capture.sha256 ?? ''))) provenanceErrors.push('manifest sha256 is missing or invalid');
    if (masterIdentity) {
      if (capture.bytes !== masterIdentity.bytes) provenanceErrors.push('manifest bytes does not match master screenshot');
      if (String(capture.sha256).toLowerCase() !== masterIdentity.sha256) provenanceErrors.push('manifest sha256 does not match master screenshot');
    }
  }
  if (!masterMtime) provenanceErrors.push('missing master screenshot');
  if (!publicThumbMtime) provenanceErrors.push('missing public thumbnail');
  if (!astroThumbMtime) provenanceErrors.push('missing Astro thumbnail');

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
    publicThumbAgeDays,
    astroThumbAgeDays,
    screenshotStale,
    screenshotMissing,
    hasManifestEntry: provenanceErrors.length === 0,
    provenanceErrors,
  });
}

const healthy = results.filter((r) => r.httpOk);
const unhealthy = results.filter((r) => !r.httpOk);
const stale = results.filter((r) => r.screenshotStale);
const missing = results.filter((r) => r.screenshotMissing);
const provenanceFailures = results.filter((r) => r.provenanceErrors.length > 0);

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

if (manifestErrors.length > 0 || provenanceFailures.length > 0) {
  console.log('');
  console.log('Manifest provenance failures:');
  for (const error of manifestErrors) console.log(`  - ${error}`);
  for (const r of provenanceFailures) {
    console.log(`  - ${r.slug}: ${r.provenanceErrors.join('; ')}`);
  }
}

const outDir = path.resolve(root, '.tmp');
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(
  path.join(outDir, 'live-app-audit.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
);

console.log('');
if (unhealthy.length > 0 || stale.length > 0 || missing.length > 0 || manifestErrors.length > 0 || provenanceFailures.length > 0) {
  const failureCount = unhealthy.length + stale.length + missing.length + manifestErrors.length + provenanceFailures.length;
  console.log(`Live app availability audit failed: ${failureCount} issue(s).`);
  process.exit(1);
} else {
  console.log('Live app availability audit passed.');
}
