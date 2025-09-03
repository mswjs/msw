import { defineConfig } from 'vitest/config'
import { mswExports } from '../support/alias.js'

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
      ...mswExports,
    },
  },
})
