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
  timeout: 10000,
  forbidOnly: !!process.env.CI,
}

export default config
