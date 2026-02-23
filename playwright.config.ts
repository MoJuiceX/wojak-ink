import { defineConfig, devices } from '@playwright/test';

const PROD_BASE_URL = 'https://wojak.ink';
const explicitBaseURL = process.env.TEST_BASE_URL;
const unattendedNightRun = process.env.NIGHTSHIFT_UNATTENDED === '1';
const allowProdE2E = process.env.ALLOW_PROD_E2E === '1';
const resolvedBaseURL = explicitBaseURL || PROD_BASE_URL;

if (unattendedNightRun && (!explicitBaseURL || resolvedBaseURL === PROD_BASE_URL) && !allowProdE2E) {
  throw new Error(
    'Refusing to run Playwright in unattended mode without a non-production TEST_BASE_URL. Set TEST_BASE_URL to localhost/staging or ALLOW_PROD_E2E=1 to override.'
  );
}

/**
 * Playwright configuration for wojak-ink game smoke tests
 * Run with: npx playwright test
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    // Base URL for all tests - change to localhost for local testing
    baseURL: resolvedBaseURL,
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
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
  ],

  // Run local dev server before tests (optional)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});
