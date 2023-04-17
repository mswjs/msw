import * as fs from 'fs'
import * as path from 'path'
import { spawnSync } from 'child_process'
import { invariant } from 'outvariant'

export async function getLibraryTarball(): Promise<string> {
  const ROOT_PATH = path.resolve(__dirname, '../..')
  const { version } = require(`${ROOT_PATH}/package.json`)
  const packFilename = `msw-${version}.tgz`
  const packPath = path.resolve(ROOT_PATH, packFilename)

  if (fs.existsSync(packPath)) {
    return packPath
  }

  const out = spawnSync('pnpm', ['pack'], { cwd: ROOT_PATH })

  if (out.error) {
    console.error(out.error)
  }

  invariant(
    fs.existsSync(packPath),
    'Failed to pack the library at "%s"',
    packPath,
  )

  return packPath
}

export async function installLibrary(projectPath: string) {
  const TARBALL_PATH = await getLibraryTarball()

  const out = spawnSync('pnpm', ['install', TARBALL_PATH], {
    cwd: projectPath,
  })

  if (out.error) {
    console.error(out.error)
    return Promise.reject(
      'Failed to install the library. See the stderr output above.',
    )
  }

  /** @todo Assert that pnpm printed success:
   * + msw 0.0.0-fetch.rc-11
   */
}
