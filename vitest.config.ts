import * as fs from 'node:fs'
import * as path from 'node:path'
import { playwright } from '@vitest/browser-playwright'
import typescriptPackageJson from 'typescript/package.json' with { type: 'json' }
import { defineConfig, defaultExclude } from 'vitest/config'
import { msw } from './lib/vite/index.js'
import { mswExports, fromRoot } from './test/support/alias.js'

const exclude = [
  ...defaultExclude,
  'test/e2e/**',
  'test/modules/**',
  'test/typings/**',
]

const typingsRoot = fromRoot('test/typings')

function getTypingsTsconfig(): string {
  const typescriptVersion = typescriptPackageJson.version
  const typescriptMajorMinorVersion = typescriptVersion.substring(
    0,
    typescriptVersion.lastIndexOf('.'),
  )
  const versionedTsconfigPath = path.resolve(
    typingsRoot,
    `tsconfig.${typescriptMajorMinorVersion}.json`,
  )
  const tsconfigPath = fs.existsSync(versionedTsconfigPath)
    ? versionedTsconfigPath
    : path.resolve(typingsRoot, 'tsconfig.json')

  return path.relative(typingsRoot, tsconfigPath)
}

export default defineConfig({
  plugins: [msw()],
  optimizeDeps: {
    include: ['json-bigint'],
    noDiscovery: true,
  },
  test: {
    fileParallelism: true,
    globals: true,
    onConsoleLog(_log, _logType, entity) {
      return entity?.project.name !== 'browser'
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          sequence: {
            groupOrder: 0,
          },
          include: ['src/**/*.test.ts'],
          alias: {
            ...mswExports,
            '#core': fromRoot('src/core'),
          },
          typecheck: {
            tsconfig: './tsconfig.test.unit.json',
          },
          environmentOptions: {
            jsdom: {
              url: 'http://localhost/',
            },
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'node',
          sequence: {
            groupOrder: 1,
          },
          environment: 'node',
          globalSetup: './vitest.setup.ts',
          include: ['test/**/*.test.ts'],
          exclude: [
            ...exclude,
            '**/*.browser.test.ts',
            '**/*.memory.test.ts',
            '**/*.native.test.ts',
            '**/*.pw.test.ts',
          ],
          alias: mswExports,
          environmentOptions: {
            jsdom: {
              url: 'http://localhost/',
            },
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'memory',
          sequence: {
            groupOrder: 2,
          },
          include: ['test/**/*.memory.test.ts'],
          exclude: exclude,
          alias: mswExports,
          pool: 'forks',
          execArgv: ['--expose-gc'],
          testTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'native',
          sequence: {
            groupOrder: 3,
          },
          include: ['test/**/*.native.test.ts'],
          exclude: exclude,
          alias: mswExports,
          setupFiles: ['./test/react-native/vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          sequence: {
            groupOrder: 4,
          },
          globalSetup: './vitest.setup.ts',
          include: ['test/**/*.test.ts'],
          exclude: [
            ...exclude,
            '**/*.node.test.ts',
            '**/*.memory.test.ts',
            '**/*.native.test.ts',
            '**/*.pw.test.ts',
          ],
          alias: mswExports,
          setupFiles: ['./test/setup/vitest-browser.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ name: 'browser', browser: 'chromium' }],
            headless: true,
            screenshotFailures: false,
          },
          testTimeout: 10_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'types',
          sequence: {
            groupOrder: 5,
          },
          root: typingsRoot,
          alias: mswExports,
          typecheck: {
            enabled: true,
            checker: 'tsc',
            include: ['**/*.test-d.ts'],
            tsconfig: getTypingsTsconfig(),
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          environment: 'node',
          globalSetup: './test/e2e/vitest.global.setup.ts',
          include: ['test/e2e/**/*.test.ts'],
          sequence: {
            groupOrder: 6,
          },
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
