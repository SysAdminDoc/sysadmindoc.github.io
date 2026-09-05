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
import process from 'node:process';
import {
  astroPreview,
  clearMarker,
  markerOwnerAlive,
  readMarker,
  writeMarker,
} from './preview-server-control.mjs';

export default async function globalSetup(config) {
  const existing = readMarker();
  if (markerOwnerAlive(existing)) {
    // Astro keys its preview daemon lock on the project root, not the port
    // (.astro/preview.json), so only one preview can exist per checkout however
    // many ports the configs declare. A second concurrent run would stop the
    // first run's server mid-test and then have its own stopped by the first
    // run's teardown. Refuse loudly rather than corrupting both.
    throw new Error(
      `preview-server: another Playwright run (pid ${existing.pid}, ${existing.baseURL}) already owns the preview server. ` +
        'Astro allows one preview daemon per project, so audit configs cannot run concurrently. ' +
        'Wait for it to finish, or run this one against your own server with PLAYWRIGHT_BASE_URL.',
    );
  }
  // The owner is gone (killed run), so its marker is meaningless.
  clearMarker();
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
        writeMarker({ pid: process.pid, baseURL, startedAt: new Date().toISOString() });
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
