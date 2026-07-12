import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Playwright's default file discovery matches any *.test.js/*.spec.js under
  // testDir. tests/unit/** is vitest's domain (see vitest.config.ts) — scoping
  // to tests/e2e keeps Playwright from also trying to load and execute those
  // vitest-only files (which import `vitest` directly and fail outside its runner).
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // Locally this hits the persistent dev.thepia.net:5173 server you keep
    // running yourself. CI has nothing running there, so it builds+previews
    // the demo instead (see webServer below) and points here at localhost.
    baseURL:
      process.env.DEMO_BASE_URL || (isCI ? 'http://localhost:4173' : 'https://dev.thepia.net:5173'),

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Navigation timeout */
    navigationTimeout: 30000,

    /* Action timeout */
    actionTimeout: 10000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  // CI has no reachable dev.thepia.net server, so build+preview the demo
  // locally and let Playwright manage its lifecycle. Locally, this is left
  // undefined — you keep your own dev server running (see CLAUDE.md) and
  // baseURL above points at it directly.
  webServer: isCI
    ? {
        command: 'pnpm run build && pnpm run preview',
        url: 'http://localhost:4173',
        reuseExistingServer: false,
        timeout: 120000,
      }
    : undefined,

  /* Global setup and teardown */
  globalSetup: './tests/global-setup.js',
  globalTeardown: './tests/global-teardown.js',

  /* Test output directory */
  outputDir: 'test-results/',

  /* Test timeout */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 5000,
  },
});
