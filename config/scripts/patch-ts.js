import fs from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as glob from 'glob'
import { hasCoreImports, replaceCoreImports } from '../replaceCoreImports.js'

const execAsync = promisify(exec)

const BUILD_DIR = new URL('../../lib/', import.meta.url)

function searchFilesForPattern(filePattern, searchPattern, errorMessage) {
  const filePaths = glob.sync(filePattern, {
    cwd: BUILD_DIR,
    absolute: true,
  })

  let matchingFiles = []

  try {
    matchingFiles = filePaths.filter((path) => {
      const fileContents = fs.readFileSync(path, 'utf8')
      return fileContents.includes(searchPattern)
    })
  } catch (error) {
    console.error(errorMessage, error)
    process.exit(1)
  }

  return matchingFiles
}

function getRelativePaths(paths) {
  const basePath = fileURLToPath(BUILD_DIR)
  return paths.map((absolutePath) => path.relative(basePath, absolutePath))
}

async function patchTypeDefs() {
  const typeDefsPaths = glob.sync('**/*.d.ts', {
    cwd: BUILD_DIR,
    absolute: true,
  })
  const typeDefsWithCoreImports = typeDefsPaths
    .map((modulePath) => {
      const fileContents = fs.readFileSync(modulePath, 'utf8')

      if (hasCoreImports(fileContents)) {
        return [modulePath, fileContents]
      }
    })
    .filter(Boolean)

  if (typeDefsWithCoreImports.length === 0) {
    console.log(
      'Found no .d.ts modules containing the "#core" import, skipping...',
    )
    return process.exit(0)
  }

  console.log(
    'Found %d module(s) with the "#core" import, resolving...',
    typeDefsWithCoreImports.length,
  )

  for (const [typeDefsPath, fileContents] of typeDefsWithCoreImports) {
    const nextFileContents = replaceCoreImports(fileContents)
    fs.writeFileSync(typeDefsPath, nextFileContents, 'utf8')
    console.log('Successfully patched "%s"!', typeDefsPath)
  }

  console.log(
    'Imports resolved in %d file(s), verifying...',
    typeDefsWithCoreImports.length,
  )

  // Next, validate that we left no "#core" imports unresolved.
  const modulesWithUnresolvedImports = searchFilesForPattern(
    '**/*.d.ts',
    '#core',
    'Failed to validate the .d.ts modules for the presence of the "#core" import. See the original error below.',
  )

  if (modulesWithUnresolvedImports.length > 0) {
    console.error(
      `Found .d.ts modules containing unresolved "#core" import after the patching:

${getRelativePaths(modulesWithUnresolvedImports)
  .map((p) => `  - ${p}`)
  .join('\n')}
        `,
    )

    return process.exit(1)
  }

  // Ensure that the .d.ts files compile without errors after resolving the "#core" imports.
  console.log('Compiling the .d.ts modules with tsc...')
  const tscCompilation = await execAsync(
    `tsc --noEmit --skipLibCheck --module esnext --moduleResolution bundler ${typeDefsPaths.map((filePath) => `"${filePath}"`).join(' ')}`,
    {
      cwd: fileURLToPath(BUILD_DIR),
    },
  )

  if (tscCompilation.stderr !== '') {
    console.error(
      'Failed to compile the .d.ts modules with tsc. See the original error below.',
      tscCompilation.stderr,
    )

    return process.exit(1)
  }

  console.log(
    'The "#core" imports resolved successfully in %d .d.ts modules! 🎉',
    typeDefsWithCoreImports.length,
  )
}

patchTypeDefs()
