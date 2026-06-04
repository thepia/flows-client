import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for flows-client promotional screenshot capture
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000, // Longer timeout for screenshot capture
  fullyParallel: false, // Run sequentially for screenshot consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for consistent screenshots
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    // Base URL for flows-admin-demo
    baseURL: process.env.DEMO_BASE_URL || 'https://dev.thepia.net:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Longer timeouts for demo app loading
    navigationTimeout: 30000,
    actionTimeout: 15000,
  },

  projects: [
    {
      name: 'promotional-screenshots',
      use: {
        ...devices['Desktop Chrome'],
        // High-quality screenshots for promotional use
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'tablet-screenshots',
      use: {
        ...devices['iPad Pro'],
        // Tablet screenshots for mid-size promotional material
        viewport: { width: 1024, height: 768 },
      },
    },
  ],

  // Global setup and teardown
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  // Test output directory
  outputDir: 'test-results/',

  // Expect timeout
  expect: {
    timeout: 10000,
  },
});
