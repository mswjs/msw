import * as path from 'node:path'
import { defineConfig } from 'vitest/config'

const LIB_DIR = path.resolve(__dirname, '../../lib')

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
      'msw/node': path.resolve(LIB_DIR, 'node/index.mjs'),
      'msw/native': path.resolve(LIB_DIR, 'native/index.mjs'),
      'msw/browser': path.resolve(LIB_DIR, 'browser/index.mjs'),
      msw: path.resolve(LIB_DIR, 'core/index.mjs'),
    },
  },
})
