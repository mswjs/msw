import { PlaywrightTestConfig, devices } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: __dirname,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  use: {
    launchOptions: {
      devtools: !process.env.CI,
    },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  outputDir: './test-results',
  snapshotDir: './test-snapshots',
  forbidOnly: !!process.env.CI,
  timeout: 10_000,
  reporter: 'list',
  // Run every test in parallel to ensure that tests are isolated
  // and there's no shared state leaking from the shared compilation
  // server or the preview server.
  fullyParallel: true,
}

export default config
