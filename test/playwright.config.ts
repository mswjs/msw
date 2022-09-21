import { PlaywrightTestConfig, devices } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testIgnore: /\.node\.test/,
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
  reporter: process.env.CI ? undefined : 'html',
  forbidOnly: !!process.env.CI,
}

export default config
