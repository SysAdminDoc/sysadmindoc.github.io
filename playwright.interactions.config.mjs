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
    ['./tests/playwright/skip-reporter.mjs'],
    ['html', { outputFolder: '.tmp/playwright-interactions-report', open: 'never' }],
  ],
  use: {
    ...auditConfig.use,
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  // Astro 7's preview self-daemonizes under Playwright's piped stdout, so a
  // managed webServer always reads as "exited early". The preview is started and
  // stopped by these hooks instead; see tests/playwright/preview-server.mjs.
  globalSetup: './tests/playwright/preview-server.mjs',
  globalTeardown: './tests/playwright/preview-server-teardown.mjs',
});
