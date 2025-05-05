import fs from 'node:fs'
import url from 'node:url'
import { defineConfig } from 'vitest/config'
import { invariant } from 'outvariant'
import tsPackageJson from 'typescript/package.json' assert { type: 'json' }
import { mswExports } from '../support/alias'

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
    alias: {
      ...mswExports,
    },
  },
})
