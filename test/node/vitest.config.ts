import { defineConfig } from 'vitest/config'
import { mswExports, customViteEnvironments } from '../support/alias'

export default defineConfig({
  test: {
    dir: './test/node',
    globals: true,
    alias: {
      ...mswExports,
      ...customViteEnvironments,
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
})
