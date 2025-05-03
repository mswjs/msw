import * as url from 'node:url'
import { defineConfig } from 'vitest/config'

const LIB_DIR = new URL('../../lib/', import.meta.url)

export default defineConfig({
  test: {
    root: './test/native',
    include: ['**/*.native.test.ts'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      /**
       * @note Force Vitest load ESM targets of MSW.
       * If we run ESM in tests, we can use "vi.mock()" to
       * emulate certain standard Node.js modules missing
       * (like "node:events") in React Native.
       *
       * Vitest won't pick up the ESM targets because
       * the root-level "package.json" is not "module".
       */
      'msw/node': url.fileURLToPath(new URL('node/index.js', LIB_DIR)),
      'msw/native': url.fileURLToPath(new URL('native/index.js', LIB_DIR)),
      'msw/browser': url.fileURLToPath(new URL('browser/index.js', LIB_DIR)),
      msw: url.fileURLToPath(new URL('core/index.js', LIB_DIR)),
    },
  },
})
