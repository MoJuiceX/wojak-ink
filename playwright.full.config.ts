import { defineConfig, devices } from '@playwright/test';

const PROD_HOST_PATTERNS = [/^https:\/\/(?:www\.)?wojak\.ink(?:\/|$)/i];
const LOCAL_BASE_URL = 'http://127.0.0.1:5174';
const explicitBaseURL = process.env.PW_BASE_URL || process.env.TEST_BASE_URL;
const allowProdE2E = process.env.PW_ALLOW_PROD === '1' || process.env.ALLOW_PROD_E2E === '1';
const resolvedBaseURL = explicitBaseURL || LOCAL_BASE_URL;

if (PROD_HOST_PATTERNS.some((pattern) => pattern.test(resolvedBaseURL)) && !allowProdE2E) {
  throw new Error(
    `Refusing to run Playwright against production baseURL "${resolvedBaseURL}". ` +
    'Set PW_BASE_URL to a local/staging URL or PW_ALLOW_PROD=1 to override explicitly.'
  );
}

export default defineConfig({
  testDir: './tests',
  testIgnore: ['workers/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: resolvedBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'VITE_LAYER_BASE_URL=https://layers.wojak.ink npm run dev -- --host 127.0.0.1 --port 5174',
    url: LOCAL_BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
