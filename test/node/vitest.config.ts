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
    singleThread: true,
  },
})
