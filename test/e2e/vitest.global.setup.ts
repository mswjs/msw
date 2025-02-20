import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { invariant } from 'outvariant'
import type { GlobalSetupContext } from 'vitest/node'
import * as packageJson from '../../package.json'

export default function setup({ provide }: GlobalSetupContext) {
  const tarballPath = fileURLToPath(
    new URL(`../../msw-${packageJson.version}.tgz`, import.meta.url),
  )

  if (fs.existsSync(tarballPath)) {
    return
  }

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

  provide('tarballPath', tarballPath)
}
