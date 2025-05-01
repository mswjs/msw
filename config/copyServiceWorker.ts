import * as fs from 'node:fs'
import * as path from 'node:path'
import { until } from '@open-draft/until'

/**
 * Copies the given Service Worker source file into the destination.
 * Injects the integrity checksum into the destination file.
 */
export default async function copyServiceWorker(
  sourceFilePath: string,
  destFilePath: string,
  checksum: string,
): Promise<void> {
  console.log('Compiling Service Worker...')

  const readFileResult = await until(() =>
    fs.promises.readFile(sourceFilePath, 'utf8'),
  )

  if (readFileResult.error) {
    throw new Error('Failed to read file.\n${readError.message}')
  }

  const destFileDirectory = path.dirname(destFilePath)
  console.log('Checking if "%s" path exists...', destFileDirectory)

  if (!fs.existsSync(destFileDirectory)) {
    console.log('Destination directory does not exist, creating...')
    await fs.promises.mkdir(destFileDirectory, { recursive: true })
  }

  const packageJson = JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  )

  const nextFileContent = readFileResult.data
    .replace('<INTEGRITY_CHECKSUM>', checksum)
    .replace('<PACKAGE_VERSION>', packageJson.version)

  const writeFileResult = await until(() =>
    fs.promises.writeFile(destFilePath, nextFileContent),
  )

  if (writeFileResult.error) {
    throw new Error(`Failed to write file.\n${writeFileResult.error.message}`)
  }

  console.log('Service Worker copied to: %s', destFilePath)
}
