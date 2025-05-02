import * as fs from 'node:fs'
import * as url from 'node:url'
import { defineConfig } from 'vitest/config'
import { invariant } from 'outvariant'
import tsPackageJson from 'typescript/package.json' assert { type: 'json' }

const LIB_DIR = new URL('../../lib', import.meta.url)

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
          url.fileURLToPath(
            new URL(`tsconfig.${tsVersionMajorMinor}.json`, import.meta.url),
          ),
          url.fileURLToPath(new URL('tsconfig.json', import.meta.url)),
        ]
        const tsConfigPath = tsConfigPaths.find((path) =>
          fs.existsSync(path),
        ) as string

        console.log('Using tsconfig at: %s', tsConfigPath)

        return tsConfigPath
      })(),
    },
    // alias: {
    //   /**
    //    * @note Force Vitest load ESM targets of MSW.
    //    * If we run ESM in tests, we can use "vi.mock()" to
    //    * emulate certain standard Node.js modules missing
    //    * (like "node:events") in React Native.
    //    *
    //    * Vitest won't pick up the ESM targets because
    //    * the root-level "package.json" is not "module".
    //    */
    //   'msw/node': url.fileURLToPath(new URL('node/index.js', LIB_DIR)),
    //   'msw/native': url.fileURLToPath(new URL('native/index.js', LIB_DIR)),
    //   'msw/browser': url.fileURLToPath(new URL('browser/index.js', LIB_DIR)),
    //   msw: url.fileURLToPath(new URL('core/index.js', LIB_DIR)),
    // },
  },
})
