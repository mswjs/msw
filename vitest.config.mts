import { defineConfig } from 'vitest/config'
import {
  mswExports,
  customViteEnvironments,
  fromRoot,
} from './test/support/alias'

export default defineConfig({
  test: {
    globals: true,
    // Lookup the unit tests in the "src" directory becase
    // they are located next to the source code they are testing.
    dir: './src',
    alias: {
      ...mswExports,
      ...customViteEnvironments,
      '~/core': fromRoot('src/core'),
    },
    typecheck: {
      // Load the TypeScript configuration to the unit tests.
      // Otherwise, Vitest will use the root-level "tsconfig.json",
      // which includes way too more than the tests need.
      tsconfig: './tsconfig.test.unit.json',
    },
    environmentOptions: {
      jsdom: {
        // Drop the 3000 port from the default "location.href"
        // for backward-compatibility with the existing tests.
        url: 'http://localhost/',
      },
    },
  },
})
