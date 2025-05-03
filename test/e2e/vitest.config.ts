import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    dir: './test/e2e',
    globals: true,
    environment: 'node',
    globalSetup: './test/e2e/vitest.global.setup.ts',
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
})
