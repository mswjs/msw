import * as path from 'node:path'
import { defineConfig } from 'vitest/config'

const LIB_DIR = path.resolve(__dirname, '../../lib')

export default defineConfig({
  test: {
    /**
     * @note Paths are resolved against CWD.
     */
    dir: './test/node',
    globals: true,
    alias: {
      'vitest-environment-node-websocket':
        './test/support/environments/vitest-environment-node-websocket',
      'msw/node': path.resolve(LIB_DIR, 'node/index.mjs'),
      'msw/native': path.resolve(LIB_DIR, 'native/index.mjs'),
      'msw/browser': path.resolve(LIB_DIR, 'browser/index.mjs'),
      msw: path.resolve(LIB_DIR, 'core/index.mjs'),
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
