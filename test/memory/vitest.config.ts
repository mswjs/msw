import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    dir: './test/memory',
    globals: true,
    testTimeout: 120_000,
    pool: 'forks',
    execArgv: ['--expose-gc'],
  },
})
