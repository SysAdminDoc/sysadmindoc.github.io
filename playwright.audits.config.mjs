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
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.015,
    },
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
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
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run preview -- --host ${host} --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 60_000,
      },
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
