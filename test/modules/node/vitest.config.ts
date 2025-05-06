import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    dir: __dirname,
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
