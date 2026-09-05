// Shared by preview-server.mjs (globalSetup) and preview-server-teardown.mjs
// (globalTeardown). Playwright uses each module's default export, so the two
// hooks cannot live in one file.
import { execFileSync } from 'node:child_process';
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
