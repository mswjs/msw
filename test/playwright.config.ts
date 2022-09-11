import { PlaywrightTestConfig, devices } from '@playwright/test'

const config: PlaywrightTestConfig = {
  workers: 1,
  timeout: 10000,
  globalSetup: require.resolve('./playwright.setup.ts'),
  forbidOnly: !!process.env.CI,
  testDir: './rest-api',
  testIgnore: /\.node\.test/,
  use: {
    launchOptions: {
      devtools: !process.env.CI,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
}

export default config
