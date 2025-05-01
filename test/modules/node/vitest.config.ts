import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    dir: import.meta.url,
    environment: 'node',
    testTimeout: 60_000,
  },
})
