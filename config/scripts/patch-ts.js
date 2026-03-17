import fs from 'node:fs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { invariant } from 'outvariant'
import * as glob from 'glob'
import { hasCoreImports, replaceCoreImports } from '../replaceCoreImports.js'

const execAsync = promisify(exec)

const BUILD_DIR = new URL('../../lib/', import.meta.url)

async function patchTypeDefs() {
  const typeDefsPaths = glob.sync('**/*.d.{ts,mts}', {
    cwd: BUILD_DIR,
    absolute: true,
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
  const result = await execAsync(
    `grep "~/core" ./**/*.d.{ts,mts} -R -l || exit 0`,
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
    const modulesWithUnresolvedImports = result.stdout
      .split('\n')
      .filter(Boolean)

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
  const mjsInCjsResult = await execAsync(
    `grep ".mjs" ./**/*.d.ts -R -l || exit 0`,
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
    const modulesWithUnresolvedImports = mjsInCjsResult.stdout
      .split('\n')
      .filter(Boolean)

    console.error(
      `Found .d.ts modules referencing ".mjs" files after patching:

${modulesWithUnresolvedImports.map((path) => `  - ${new URL(path, BUILD_DIR).pathname}`).join('\n')}
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
