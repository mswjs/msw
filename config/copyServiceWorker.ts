import * as fs from 'fs'
import * as path from 'path'
import chalk from 'chalk'
import { until } from '@open-draft/until'

const { cyan } = chalk

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

  const [readError, fileContent] = await until(() =>
    fs.promises.readFile(sourceFilePath, 'utf8'),
  )

  if (readError) {
    throw new Error('Failed to read file.\n${readError.message}')
  }

  const destFileDirectory = path.dirname(destFilePath)
  console.log('Checking if "%s" path exists...', destFileDirectory)

  if (!fs.existsSync(destFileDirectory)) {
    console.log('Destination directory does not exist, creating...')
    await fs.promises.mkdir(destFileDirectory, { recursive: true })
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'),
  )

  const nextFileContent = fileContent
    .replace('<INTEGRITY_CHECKSUM>', checksum)
    .replace('<PACKAGE_VERSION>', packageJson.version)

  const [writeFileError] = await until(() =>
    fs.promises.writeFile(destFilePath, nextFileContent),
  )

  if (writeFileError) {
    throw new Error(`Failed to write file.\n${writeFileError.message}`)
  }

  console.log('Service Worker copied to: %s', cyan(destFilePath))
}
