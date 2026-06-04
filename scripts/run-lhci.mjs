import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const lhciTempDir = path.join(repoRoot, '.tmp', 'lhci-temp');
const runLocalWindows = process.env.LHCI_ALLOW_LOCAL_WINDOWS === '1';
const isLocalWindows = process.platform === 'win32' && !process.env.CI;

if (isLocalWindows && !runLocalWindows) {
  console.warn('[lhci] Skipping local Windows run: Chrome cleanup currently fails with EPERM after collection.');
  console.warn('[lhci] CI/Linux still runs the advisory Lighthouse budget. Set LHCI_ALLOW_LOCAL_WINDOWS=1 to force a local attempt.');
  process.exit(0);
}

if (process.platform === 'win32') {
  mkdirSync(lhciTempDir, { recursive: true });
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = [
  'exec',
  '--yes',
  '--package=@lhci/cli@0.15.1',
  '--',
  'lhci',
  'autorun',
  '--config=./lighthouserc.cjs',
];

const child = spawn(npmCommand, args, {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    ...(process.platform === 'win32'
      ? {
          TEMP: lhciTempDir,
          TMP: lhciTempDir,
          TMPDIR: lhciTempDir,
        }
      : {}),
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[lhci] terminated by ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(`[lhci] failed to start: ${error.message}`);
  process.exit(1);
});
