import { defineConfig, devices } from '@playwright/test';

const previewUrl = 'http://127.0.0.1:4173';
const isCi = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './e2e',
  globalSetup: './scripts/playwright-global-setup.mjs',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  ...(isCi ? { workers: 1 } : {}),
  reporter: isCi ? 'github' : 'list',
  use: {
    baseURL: previewUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    // M10: mobile Safari engine smoke (iPhone profile); a focused subset, not the whole matrix.
    {
      name: 'mobile-webkit',
      grep: /career slice journey|accessibility scan \(ko-KR\)/,
      use: {
        ...devices['iPhone 14'],
      },
    },
  ],
});
