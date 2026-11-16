import { defineConfig, devices } from '@playwright/test';

const releaseBaseURL = process.env.FITCORE_TEST_BASE_URL;
const testIPhoneWebKit = process.env.FITCORE_TEST_IPHONE_WEBKIT === '1';
const testProductionBuild = process.env.FITCORE_TEST_PRODUCTION_BUILD === '1';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: releaseBaseURL ?? 'http://localhost:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    ...(testIPhoneWebKit
      ? [{ name: 'iphone-webkit', use: { ...devices['iPhone 13'] } }]
      : []),
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-360x800',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
        isMobile: true,
      },
    },
    {
      name: 'mobile-390x844',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
  ],

  webServer: releaseBaseURL
    ? undefined
    : {
        command: testProductionBuild
          ? 'node node_modules/nitro/dist/cli/index.mjs preview --port 8080'
          : 'npm run dev',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI && !testProductionBuild,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
