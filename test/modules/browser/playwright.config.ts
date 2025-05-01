import { Config } from '@playwright/test'

const config: Config = {
  testDir: import.meta.url,
  use: {
    launchOptions: {
      devtools: !process.env.CI,
    },
  },
  fullyParallel: true,
}

export default config
