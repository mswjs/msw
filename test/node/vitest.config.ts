import { defineConfig } from 'vitest/config'
import { mswExports } from '../support/alias'

export default defineConfig({
  test: {
    dir: './test/node',
    globals: true,
    alias: {
      ...mswExports,
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
})
