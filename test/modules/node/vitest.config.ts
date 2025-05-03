import * as url from 'node:url'
import { defineConfig } from 'vitest/config'

const TESTS_DIR = url.fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    dir: TESTS_DIR,
    environment: 'node',
    hookTimeout: 60_000,
    testTimeout: 60_000,
    watch: false,
  },
})
