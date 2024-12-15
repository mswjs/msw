import { defineConfig } from 'vitest/config'
import { mswExports, customViteEnvironments } from '../support/alias'

export default defineConfig({
  test: {
    dir: './test/e2e',
    globals: true,
    environment: 'node',
    poolOptions: {
      threads: {
        /**
         * @note Run Node.js integration tests in sequence.
         * There's a test that involves building the library,
         * which results in the "lib" directory being deleted.
         * If any tests attempt to run during that window,
         * they will fail, unable to resolve the "msw" import alias.
         */
        singleThread: true,
      },
    },
  },
})
