const fs = require('fs')
const path = require('path')
const { replaceCoreImports } = require('../replaceCoreImports')

async function patchTypeDefs() {
  const typeDefsPaths = [
    path.resolve(__dirname, '../..', 'lib/browser/index.d.ts'),
    path.resolve(__dirname, '../..', 'lib/node/index.d.ts'),
    path.resolve(__dirname, '../..', 'lib/native/index.d.ts'),
  ]

  for (const typeDefsPath of typeDefsPaths) {
    if (!fs.existsSync(typeDefsPath)) {
      continue
    }

    const fileContents = fs.readFileSync(typeDefsPath, 'utf8')

    // Treat ".d.ts" files as ESM to replace "import" statements.
    // Force no extension on the ".d.ts" imports.
    const nextFileContents = replaceCoreImports(fileContents, true)

    fs.writeFileSync(typeDefsPath, nextFileContents, 'utf8')

    console.log('Successfully patched at "%s"!', typeDefsPath)
  }
}

patchTypeDefs()
