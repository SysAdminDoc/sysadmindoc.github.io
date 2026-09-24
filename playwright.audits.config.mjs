import { defineConfig } from '@playwright/test';

const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.PLAYWRIGHT_AUDIT_PORT ?? process.env.PLAYWRIGHT_PORT ?? '4324', 10);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;
const launchOptions = process.env.CHROME_PATH
  ? { executablePath: process.env.CHROME_PATH }
  : undefined;

export default defineConfig({
  testDir: './tests/playwright',
  outputDir: '.tmp/playwright-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
    // The fixture build renders the same pixels every time on this machine: on
    // 2026-09-23 all 20 gate shots matched their baselines with no tolerance at
    // all. The old limits (a 1.5% share of pixels, each allowed a 0.2 colour
    // distance) passed a hidden nav, which moved 9-11% of pixels a little, and
    // every accent turned magenta, which moved about 1% a lot. Those now differ
    // by 1,294 pixels or more; 20 leaves room for a stray one and no more.
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      threshold: 0,
      maxDiffPixels: 20,
    },
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['./tests/playwright/skip-reporter.mjs'],
    ['html', { outputFolder: '.tmp/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    browserName: 'chromium',
    colorScheme: 'dark',
    deviceScaleFactor: 1,
    locale: 'en-US',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    video: 'off',
    ...(launchOptions ? { launchOptions } : {}),
  },
  // Not `webServer`: Astro 7's preview self-daemonizes under Playwright's piped
  // stdout, so the managed process always looks like it exited early. See
  // tests/playwright/preview-server.mjs.
  globalSetup: './tests/playwright/preview-server.mjs',
  globalTeardown: './tests/playwright/preview-server-teardown.mjs',
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', colorScheme: 'dark', ...(launchOptions ? { launchOptions } : {}) },
    },
    {
      name: 'chromium-light',
      use: { browserName: 'chromium', colorScheme: 'light', ...(launchOptions ? { launchOptions } : {}) },
    },
  ],
});
