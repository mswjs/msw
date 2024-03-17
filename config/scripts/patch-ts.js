const fs = require('fs')
const path = require('path')
const glob = require('glob')
const { hasCoreImports, replaceCoreImports } = require('../replaceCoreImports')

async function patchTypeDefs() {
  const typeDefsPaths = glob.sync('**/*.d.{ts,mts}', {
    cwd: path.resolve(__dirname, '../../lib'),
    absolute: true,
  })

  for (const typeDefsPath of typeDefsPaths) {
    const fileContents = fs.readFileSync(typeDefsPath, 'utf8')

    // Ignore type definition modules that don't have "~/core" imports.
    if (!hasCoreImports(fileContents, true)) {
      continue
    }

    // Treat ".d.ts" files as ESM to replace "import" statements.
    // Force no extension on the ".d.ts" imports.
    const nextFileContents = replaceCoreImports(fileContents, true)

    fs.writeFileSync(typeDefsPath, nextFileContents, 'utf8')

    console.log('Successfully patched at "%s"!', typeDefsPath)
  }
}

patchTypeDefs()
