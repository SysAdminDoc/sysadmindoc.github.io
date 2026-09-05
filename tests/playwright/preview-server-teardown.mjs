// Stops the preview daemon that preview-server.mjs started. A run that supplied
// its own PLAYWRIGHT_BASE_URL leaves no marker, so its server is left alone.
import fs from 'node:fs';
import { astroPreview, ownedMarkerPath } from './preview-server-control.mjs';

export default async function globalTeardown() {
  if (!fs.existsSync(ownedMarkerPath)) return;
  fs.rmSync(ownedMarkerPath, { force: true });
  astroPreview(['stop'], { ignoreErrors: true });
}
