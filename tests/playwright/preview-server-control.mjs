// Shared by preview-server.mjs (globalSetup) and preview-server-teardown.mjs
// (globalTeardown). Playwright uses each module's default export, so the two
// hooks cannot live in one file.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { SERVE_TOKEN_PREFIX } from '../../scripts/lib/audit-server.mjs';

export const ownedMarkerPath = path.join(process.cwd(), '.tmp', 'playwright-owns-preview');

export function astroPreview(args, { ignoreErrors = false, env = {} } = {}) {
  try {
    execFileSync('npx', ['astro', 'preview', ...args], {
      stdio: 'pipe',
      shell: process.platform === 'win32',
      windowsHide: true,
      timeout: 60_000,
      // The background daemon inherits this environment (astro/dist/cli/server.js).
      env: { ...process.env, ...env },
    });
    return true;
  } catch (error) {
    if (ignoreErrors) return false;
    throw error;
  }
}

/** Does anything accept a connection on host:port? */
export function portAnswers(hostname, port, timeoutMs = 1_000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: hostname, port: Number(port) });
    const done = (answer) => {
      socket.destroy();
      resolve(answer);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

// When the configured port is taken, Astro serves on the next free one and
// says so in output nobody reads, while the tests keep using the configured
// port: the twelfth drain review's screenshots passed against another
// checkout's server that way. So the port has to be free before the preview
// starts (after this checkout's own old daemon is stopped, which can take a
// moment to let go), and what answers afterwards has to be this build.

/** Refuse a port that something else is serving on. */
export async function assertPortFree(hostname, port, { waitMs = 5_000, pollMs = 250 } = {}) {
  const deadline = Date.now() + waitMs;
  for (;;) {
    if (!(await portAnswers(hostname, port))) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `preview-server: something else is serving on ${hostname}:${port}, and the tests would audit it instead of this build. ` +
          'Stop it, or run on another port (PLAYWRIGHT_AUDIT_PORT or PLAYWRIGHT_PORT).',
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

// deploy-vps.mjs refuses to pack a file by this name, in case one outlives its run.
const TOKEN_PREFIX = SERVE_TOKEN_PREFIX;

/**
 * Put a file only this run knows into dist/, before the preview starts, so
 * the server that answers can prove it serves this dist/ now. A home page
 * match alone passed a server built from the same commit in another
 * checkout, or one that only answered / with this build (thirteenth drain
 * review). Leftovers from a killed run go first.
 * @returns {{ path: string, token: string, remove: () => void }}
 */
export function writeServeToken(distDir, token) {
  for (const name of fs.readdirSync(distDir)) {
    if (name.startsWith(TOKEN_PREFIX)) fs.rmSync(path.join(distDir, name), { force: true });
  }
  const name = `${TOKEN_PREFIX}${token}.txt`;
  const file = path.join(distDir, name);
  fs.writeFileSync(file, token);
  return { path: `/${name}`, token, remove: () => fs.rmSync(file, { force: true }) };
}

/** Refuse a server that doesn't serve this run's token file. */
export async function assertServesToken(baseURL, serveToken) {
  const response = await fetch(new URL(serveToken.path, baseURL), { redirect: 'manual' });
  const body = response.status === 200 ? (await response.text()).trim() : '';
  if (body !== serveToken.token) {
    throw new Error(
      `preview-server: ${baseURL} answers, but not with the file this run just wrote into dist/ (HTTP ${response.status}), ` +
        'so it is another checkout\'s server or another build.',
    );
  }
}

/** Refuse a server whose home page isn't this checkout's dist/index.html. */
export async function assertServesBuild(baseURL, distDir) {
  const expected = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const response = await fetch(new URL('/', baseURL), { redirect: 'manual' });
  const body = await response.text();
  if (response.status !== 200 || body !== expected) {
    throw new Error(
      `preview-server: ${baseURL} answers (HTTP ${response.status}), but its home page isn't ${path.join(distDir, 'index.html')}, ` +
        'so it is some other server or build.',
    );
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
