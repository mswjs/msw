import { Config } from '@playwright/test'

const config: Config = {
  testDir: __dirname,
  use: {
    launchOptions: {
      devtools: !process.env.CI,
    },
  },
  fullyParallel: true,
}

export default config
