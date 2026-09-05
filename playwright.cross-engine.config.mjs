import { defineConfig, devices } from '@playwright/test';

// Focused Firefox + WebKit interaction smoke. Kept separate from the audits and
// interactions configs (which are Chromium-only) so cross-engine coverage never
// duplicates the visual-baseline matrix. Runs only cross-engine-smoke.spec.mjs.
const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.PLAYWRIGHT_CROSS_ENGINE_PORT ?? '4326', 10);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: 'cross-engine-smoke.spec.mjs',
  outputDir: '.tmp/playwright-cross-engine-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: '.tmp/playwright-cross-engine-report', open: 'never' }]],
  use: {
    baseURL,
    locale: 'en-US',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  // Astro 7's preview self-daemonizes under Playwright's piped stdout, so a
  // managed webServer always reads as "exited early". The preview is started and
  // stopped by these hooks instead; see tests/playwright/preview-server.mjs.
  globalSetup: './tests/playwright/preview-server.mjs',
  globalTeardown: './tests/playwright/preview-server-teardown.mjs',
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
