import { PlaywrightTestConfig, devices } from '@playwright/test'

const config: PlaywrightTestConfig = {
  workers: 1,
  timeout: 10000,
  forbidOnly: !!process.env.CI,
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
