import * as path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    /**
     * @note Paths are resolved against CWD.
     */
    dir: './test/node',
    globals: true,
    alias: {
      msw: path.resolve(__dirname, '../..'),
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    /**
     * @note Run Node.js integration tests in sequence.
     * There's a test that involves building the library,
     * which results in the "lib" directory being deleted.
     * If any tests attempt to run during that window,
     * they will fail, unable to resolve the "msw" import alias.
     */
    singleThread: true,
  },
})
