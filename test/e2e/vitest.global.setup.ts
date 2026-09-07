import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { invariant } from 'outvariant'
import type { TestProject } from 'vitest/node'
import * as packageJson from '../../package.json'

export default function setup({ provide }: TestProject) {
  const tarballDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'msw-e2e-'))
  const tarballPath = path.join(
    tarballDirectory,
    `msw-${packageJson.version}.tgz`,
  )
  const packResult = spawnSync(
    'pnpm',
    [
      '--config.ignore-scripts=true',
      'pack',
      '--pack-destination',
      tarballDirectory,
    ],
    {
      encoding: 'utf8',
    },
  )

  invariant(
    packResult.status === 0 && fs.existsSync(tarballPath),
    'Failed to package the library for E2E tests at "%s":\n%s',
    tarballPath,
    packResult.stderr,
  )

  provide('tarballPath', tarballPath)

  return () => {
    fs.rmSync(tarballDirectory, { force: true, recursive: true })
  }
}
