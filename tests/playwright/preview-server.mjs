// Playwright's managed `webServer` cannot drive Astro 7's preview.
//
// With a non-TTY stdout — which is always the case under Playwright — `astro
// preview` self-daemonizes: it spawns the real server as a detached background
// process and the foreground command exits immediately. Playwright sees that
// exit and reports "Process from config.webServer exited early", or times out
// waiting for a process that is never coming back, even though the server is up
// and serving. Confirmed 2026-09-05 by running the command with piped stdout and
// watching `astro preview status` report a background pid.
//
// So the server is managed here instead: start the background preview, wait for
// it to answer, and let preview-server-teardown.mjs stop it. Setting
// PLAYWRIGHT_BASE_URL bypasses all of this, which is what a manual run against an
// already-serving preview wants.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { astroPreview, ownedMarkerPath } from './preview-server-control.mjs';

export default async function globalSetup(config) {
  // Ownership travels through a file, not an env var: Playwright evaluates the
  // teardown module separately, so a mutation here is not visible there.
  fs.rmSync(ownedMarkerPath, { force: true });
  if (process.env.PLAYWRIGHT_BASE_URL) return;

  const baseURL = config.projects[0]?.use?.baseURL ?? config.use?.baseURL;
  if (!baseURL) throw new Error('preview-server: no baseURL configured');
  const { hostname, port } = new URL(baseURL);

  // A leftover daemon from an earlier run serves an older dist/, so a stale
  // server would quietly audit the wrong build. Always replace it.
  astroPreview(['stop'], { ignoreErrors: true });
  astroPreview(['--host', hostname, '--port', port]);

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseURL, { redirect: 'manual' });
      if (response.status > 0) {
        fs.mkdirSync(path.dirname(ownedMarkerPath), { recursive: true });
        fs.writeFileSync(ownedMarkerPath, `${baseURL}\n`, 'utf8');
        process.env.PLAYWRIGHT_BASE_URL = baseURL;
        return;
      }
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  astroPreview(['stop'], { ignoreErrors: true });
  throw new Error(`preview-server: ${baseURL} did not respond within 60s`);
}
