// Shared by preview-server.mjs (globalSetup) and preview-server-teardown.mjs
// (globalTeardown). Playwright uses each module's default export, so the two
// hooks cannot live in one file.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const ownedMarkerPath = path.join(process.cwd(), '.tmp', 'playwright-owns-preview');

export function astroPreview(args, { ignoreErrors = false } = {}) {
  try {
    execFileSync('npx', ['astro', 'preview', ...args], {
      stdio: 'pipe',
      shell: process.platform === 'win32',
      timeout: 60_000,
    });
    return true;
  } catch (error) {
    if (ignoreErrors) return false;
    throw error;
  }
}

export function readMarker() {
  try {
    return JSON.parse(fs.readFileSync(ownedMarkerPath, 'utf8'));
  } catch {
    return null;
  }
}

export function writeMarker(payload) {
  fs.mkdirSync(path.dirname(ownedMarkerPath), { recursive: true });
  fs.writeFileSync(ownedMarkerPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function clearMarker() {
  fs.rmSync(ownedMarkerPath, { force: true });
}

// A marker is only believed for this long. `process.kill(pid, 0)` answers "does
// some process with this id exist", not "is it the run that wrote the marker",
// and Windows recycles pids briskly. Without an upper bound, a hard-killed run
// could leave a marker whose pid is later reused by anything at all, and every
// later audit would be refused for as long as that unrelated process lived.
// The full audit suite runs in about seven minutes, so an hour is far beyond any
// legitimate run while still bounding the damage.
export const MARKER_MAX_AGE_MS = 60 * 60 * 1000;

/** Is the process that wrote a marker still running, and recent enough to believe? */
export function markerOwnerAlive(marker, now = Date.now()) {
  if (!marker || typeof marker.pid !== 'number') return false;

  const startedAt = Date.parse(marker.startedAt ?? '');
  // A marker with no usable timestamp cannot be aged out, so it is not trusted.
  if (!Number.isFinite(startedAt)) return false;
  if (now - startedAt > MARKER_MAX_AGE_MS) return false;

  try {
    // Signal 0 performs the permission and existence check without delivering.
    process.kill(marker.pid, 0);
    return true;
  } catch {
    return false;
  }
}
