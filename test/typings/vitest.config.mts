import * as path from 'node:path'
import { defineConfig } from 'vitest/config'
import tsPackageJson from 'typescript/package.json' assert { type: 'json' }
import { invariant } from 'outvariant'
import * as fs from 'fs'

const LIB_DIR = path.resolve(__dirname, '../../lib')

export default defineConfig({
  test: {
    root: './test/typings',
    include: ['**/*.test-d.ts'],
    globals: true,
    typecheck: {
      checker: 'tsc',
      tsconfig: (() => {
        const tsInstalledVersion = tsPackageJson.version
        invariant(
          tsInstalledVersion,
          'Failed to run typings tests: unable to determine TypeScript version',
        )

        const tsVersionMajorMinor = tsInstalledVersion.substring(
          0,
          tsInstalledVersion.lastIndexOf('.'),
        )

        const tsConfigPaths = [
          path.resolve(__dirname, `tsconfig.${tsVersionMajorMinor}.json`),
          path.resolve(__dirname, 'tsconfig.json'),
        ]
        const tsConfigPath = tsConfigPaths.find((path) =>
          fs.existsSync(path),
        ) as string
        return tsConfigPath
      })(),
    },
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
