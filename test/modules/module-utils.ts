import fs from 'node:fs'
import url from 'node:url'
import { spawnSync } from 'node:child_process'
import { invariant } from 'outvariant'
import packageJson from '../../package.json' assert { type: 'json' }

async function getLibraryTarball(): Promise<string> {
  const ROOT_PATH = new URL('../..', import.meta.url)
  const packFilename = `msw-${packageJson.version}.tgz`
  const packPath = url.fileURLToPath(new URL(packFilename, ROOT_PATH))

  /**
   * @note Beware that you need to remove the tarball after
   * the test run is done. Don't want to use a stale tgarball, do you?
   */
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

  const output = spawnSync('pnpm', ['install', TARBALL_PATH], {
    cwd: projectPath,
  })

  if (output.error) {
    console.error(output.error)
    return Promise.reject(
      'Failed to install the library. See the stderr output above.',
    )
  }

  /**
   * @todo Assert that pnpm printed success:
   * + msw 0.0.0-fetch.rc-11
   */
}
