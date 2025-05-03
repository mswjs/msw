import * as fs from 'node:fs'
import * as url from 'node:url'
import { spawnSync } from 'node:child_process'
import { invariant } from 'outvariant'
import type { TestProject } from 'vitest/node'
import packageJson from '../../package.json' with { type: 'json' }

export default function setup({ provide }: TestProject) {
  const tarballPath = url.fileURLToPath(
    new URL(`../../msw-${packageJson.version}.tgz`, import.meta.url),
  )

  if (!fs.existsSync(tarballPath)) {
    // Pack the library before all E2E tests.
    spawnSync('pnpm', ['pack'], {
      stdio: 'inherit',
    })

    invariant(
      fs.existsSync(tarballPath),
      'Failed to set up e2e tests: library tarball not found at "%s"',
      tarballPath,
    )

    console.log('Library built at "%s"!', tarballPath)
  }

  provide('tarballPath', tarballPath)
}
