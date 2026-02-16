import fs from 'node:fs'
import url from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { invariant } from 'outvariant'
import tsPackageJson from 'typescript/package.json' with { type: 'json' }
import { mswExports } from '../support/alias'

const TEST_ROOT = url.fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      ...mswExports,
    },
  },
  test: {
    root: TEST_ROOT,
    globals: true,
    typecheck: {
      enabled: true,
      checker: 'tsc',
      include: ['**/*.test-d.ts'],
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
            new URL(`./tsconfig.${tsVersionMajorMinor}.json`, import.meta.url),
          ),
          url.fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
        ]
        const tsConfigPath = tsConfigPaths.find((path) =>
          fs.existsSync(path),
        ) as string
        const relativeTsConfigPath = path.relative(TEST_ROOT, tsConfigPath)

        console.log('Using tsconfig at: %s', relativeTsConfigPath)

        return relativeTsConfigPath
      })(),
    },
  },
})
