// Stops the preview daemon that preview-server.mjs started. A run that supplied
// its own PLAYWRIGHT_BASE_URL leaves no marker, so its server is left alone, and
// a marker written by a different live process is left to that process.
import process from 'node:process';
import { astroPreview, clearMarker, readMarker } from './preview-server-control.mjs';

export default async function globalTeardown() {
  const marker = readMarker();
  if (!marker || marker.pid !== process.pid) return;
  clearMarker();
  astroPreview(['stop'], { ignoreErrors: true });
}
