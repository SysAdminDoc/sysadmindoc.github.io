// deploy:preflight's first step: it refuses to start under a report-only flag
// the nightly runner didn't set (scripts/lib/report-only-flags.mjs). Without
// --strict it only warns.
import process from 'node:process';
import { strayReportOnlyMessage } from './lib/report-only-flags.mjs';

const strict = process.argv.includes('--strict');
const message = strayReportOnlyMessage({ strict });
if (message) {
  console.error(strict ? `report-only:check: ${message}` : message);
  if (strict) process.exit(1);
}
