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

/** Is the process that wrote a marker still running? */
export function markerOwnerAlive(marker) {
  if (!marker || typeof marker.pid !== 'number') return false;
  try {
    // Signal 0 performs the permission and existence check without delivering.
    process.kill(marker.pid, 0);
    return true;
  } catch {
    return false;
  }
}
