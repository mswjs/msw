import url from 'node:url'
import { type Config } from '@playwright/test'

const TEST_DIR = url.fileURLToPath(new URL('./', import.meta.url))

export default {
  testDir: TEST_DIR,
  use: {
    launchOptions: {
      devtools: !process.env.CI,
    },
  },
  fullyParallel: true,
} satisfies Config
