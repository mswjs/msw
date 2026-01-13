import fs from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { invariant } from 'outvariant'
import * as glob from 'glob'
import { hasCoreImports, replaceCoreImports } from '../replaceCoreImports.js'

const execAsync = promisify(exec)

const BUILD_DIR = new URL('../../lib/', import.meta.url)
const TYPESCRIPT_FILE_MATCHER = '**/*.d.{ts,mts}'
const DEFINITION_TYPESCRIPT_FILE_MATCHER = '**/*.d.ts'
const IS_WINDOWS = process.platform === 'win32'

async function findUnresolvedImportsLinux() {
  const result = await execAsync(
    `grep "~/core" ./${TYPESCRIPT_FILE_MATCHER} -R -l || exit 0`,
    {
      cwd: BUILD_DIR,
      shell: '/bin/bash',
    },
  )

  invariant(
    result.stderr === '',
    'Failed to validate the .d.ts modules for the presence of the "~/core" import. See the original error below.',
    result.stderr,
  )

  if (result.stdout !== '') {
    return result.stdout.split('\n').filter(Boolean)
  }

  return []
}

async function findUnresolvedImportsWindows() {
  const filePaths = glob.sync(TYPESCRIPT_FILE_MATCHER, {
    cwd: BUILD_DIR,
    absolute: true,
    posix: true,
    dotRelative: true,
  })

  let unresolvedImports = []

  try {
    unresolvedImports = filePaths.filter((modulePath) => {
      const fileContents = fs.readFileSync(modulePath, 'utf8')
      return fileContents.includes('~/core')
    })
  } catch (error) {
    console.log(
      'Failed to validate the .d.ts modules for the presence of the "~/core" import. See the original error below.',
    )
    throw error
  }

  return unresolvedImports
}

async function findUnresolvedImports() {
  if (IS_WINDOWS) {
    return await findUnresolvedImportsWindows()
  }
  return await findUnresolvedImportsLinux()
}

async function findInvalidMJSReferencesLinux() {
  const mjsInCjsResult = await execAsync(
    `grep ".mjs" ./*${DEFINITION_TYPESCRIPT_FILE_MATCHER} -R -l || exit 0`,
    {
      cwd: BUILD_DIR,
      shell: '/bin/bash',
    },
  )

  invariant(
    mjsInCjsResult.stderr === '',
    'Failed to validate the .d.ts modules not referencing ".mjs" files. See the original error below.',
    mjsInCjsResult.stderr,
  )

  if (mjsInCjsResult.stdout !== '') {
    return mjsInCjsResult.stdout.split('\n').filter(Boolean)
  }

  return []
}

async function findInvalidMJSReferencesWindows() {
  const cjsDtsPaths = glob.sync(DEFINITION_TYPESCRIPT_FILE_MATCHER, {
    cwd: BUILD_DIR,
    absolute: true,
    posix: true,
    dotRelative: true,
  })

  let invalidMJSReferences = []

  try {
    invalidMJSReferences = cjsDtsPaths.filter((modulePath) => {
      const fileContents = fs.readFileSync(modulePath, 'utf8')
      return fileContents.includes('.mjs')
    })
  } catch (error) {
    console.error(
      'Failed to validate the .d.ts modules not referencing ".mjs" files. See the original error below.',
    )
    throw error
  }

  return invalidMJSReferences
}

async function findInvalidMJSReferences() {
  if (IS_WINDOWS) {
    return await findInvalidMJSReferencesWindows()
  }
  return await findInvalidMJSReferencesLinux()
}

async function patchTypeDefs() {
  const typeDefsPaths = glob.sync(TYPESCRIPT_FILE_MATCHER, {
    cwd: BUILD_DIR,
    absolute: true,
    posix: true,
    dotRelative: true,
  })
  const typeDefsWithCoreImports = typeDefsPaths
    .map((modulePath) => {
      const fileContents = fs.readFileSync(modulePath, 'utf8')
      /**
       * @note Treat all type definition files as ESM because even
       * CJS .d.ts use `import` statements.
       */
      if (hasCoreImports(fileContents, true)) {
        return [modulePath, fileContents]
      }
    })
    .filter(Boolean)

  if (typeDefsWithCoreImports.length === 0) {
    console.log(
      'Found no .d.ts modules containing the "~/core" import, skipping...',
    )
    return process.exit(0)
  }

  console.log(
    'Found %d module(s) with the "~/core" import, resolving...',
    typeDefsWithCoreImports.length,
  )

  for (const [typeDefsPath, fileContents] of typeDefsWithCoreImports) {
    // Treat ".d.ts" files as ESM to replace "import" statements.
    // Force no extension on the ".d.ts" imports.
    const nextFileContents = replaceCoreImports(
      typeDefsPath,
      fileContents,
      true,
    )
    fs.writeFileSync(typeDefsPath, nextFileContents, 'utf8')
    console.log('Successfully patched "%s"!', typeDefsPath)
  }

  console.log(
    'Imports resolved in %d file(s), verifying...',
    typeDefsWithCoreImports.length,
  )

  // Next, validate that we left no "~/core" imports unresolved.
  const modulesWithUnresolvedImports = await findUnresolvedImports()

  if (modulesWithUnresolvedImports.length > 0) {
    console.error(
      `Found .d.ts modules containing unresolved "~/core" import after the patching:

${modulesWithUnresolvedImports.map((path) => `  - ${new URL(path, BUILD_DIR).pathname}`).join('\n')}
        `,
    )

    return process.exit(1)
  }

  // Ensure that the .d.ts files compile without errors after resolving the "~/core" imports.
  console.log('Compiling the .d.ts modules with tsc...')
  const tscCompilation = await execAsync(
    `tsc --noEmit --skipLibCheck ${typeDefsPaths.join(' ')}`,
    {
      cwd: BUILD_DIR,
    },
  )

  if (tscCompilation.stderr !== '') {
    console.error(
      'Failed to compile the .d.ts modules with tsc. See the original error below.',
      tscCompilation.stderr,
    )

    return process.exit(1)
  }

  // Ensure that CJS .d.ts file never reference .mjs files.
  const mjsInCjsResults = await findInvalidMJSReferences()

  if (mjsInCjsResults.length > 0) {
    console.error(
      `Found .d.ts modules referencing ".mjs" files after patching:

${mjsInCjsResults.map((path) => `  - ${new URL(path, BUILD_DIR).pathname}`).join('\n')}
        `,
    )

    return process.exit(1)
  }

  console.log(
    'The "~/core" imports resolved successfully in %d .d.ts modules! 🎉',
    typeDefsWithCoreImports.length,
  )
}

patchTypeDefs()
