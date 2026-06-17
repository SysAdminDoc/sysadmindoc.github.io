import { defineConfig } from '@playwright/test';
import auditConfig from './playwright.audits.config.mjs';

const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.PLAYWRIGHT_INTERACTIONS_PORT ?? process.env.PLAYWRIGHT_PORT ?? '4325', 10);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;

export default defineConfig({
  ...auditConfig,
  outputDir: '.tmp/playwright-interactions-results',
  timeout: 60_000,
  reporter: [
    ['list'],
    ['html', { outputFolder: '.tmp/playwright-interactions-report', open: 'never' }],
  ],
  use: {
    ...auditConfig.use,
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run preview -- --host ${host} --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
