import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1, timeout: 45000,
  reporter: [['list'], ['json', { outputFile: 'docs/evidencias/playwright-results.json' }]],
  use: { baseURL: 'http://localhost:3100', channel: 'chrome', headless: true, viewport: { width: 1440, height: 1100 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'node tests/preview-server.mjs', url: 'http://localhost:3100/api/health', reuseExistingServer: false }
});
