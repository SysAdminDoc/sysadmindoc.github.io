import { defineConfig } from '@playwright/test';
import auditConfig from './playwright.audits.config.mjs';

export default defineConfig({
  ...auditConfig,
  outputDir: '.tmp/playwright-interactions-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: '.tmp/playwright-interactions-report', open: 'never' }],
  ],
});
