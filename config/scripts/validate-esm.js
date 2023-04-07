const fs = require('fs')
const path = require('path')
const { invariant } = require('outvariant')

const ROOT_PATH = path.resolve(__dirname, '../..')

function fromRoot(...paths) {
  return path.resolve(ROOT_PATH, ...paths)
}

const PKG_JSON_PATH = fromRoot('package.json')
const PKG_JSON = require(PKG_JSON_PATH)

function validatePackageExports() {
  const { exports } = PKG_JSON

  // Validate the "main", "browser", and "types" root fields.
  invariant('main' in PKG_JSON, 'Missing "main" field in package.json')
  invariant('browser' in PKG_JSON, 'Missing "browser" field in package.json')
  invariant('types' in PKG_JSON, 'Missing "types" field in package.json')

  invariant(
    fs.existsSync(fromRoot(PKG_JSON.main)),
    'The "main" field points at a non-existing path at "%s"',
    PKG_JSON.main,
  )
  invariant(
    fs.existsSync(fromRoot(PKG_JSON.browser)),
    'The "browser" field points at a non-existing path at "%s"',
    PKG_JSON.browser,
  )
  invariant(
    fs.existsSync(fromRoot(PKG_JSON.types)),
    'The "types" field points at a non-existing path at "%s"',
    PKG_JSON.types,
  )

  // The "exports" key must be present.
  invariant(exports, 'package.json must have an "exports" field')

  // The "exports" must list expected paths.
  const expectedExportPaths = ['.', './node', './package.json', './native']
  expectedExportPaths.forEach((exportPath) => {
    invariant(exportPath in exports, 'Missing exports path "%s"', exportPath)
  })

  // Must describe the root export properly.
  const rootExport = exports['.']
  const expectedRootExportPaths = ['browser', 'node']

  expectedRootExportPaths.forEach((rootExportPath) => {
    invariant(
      rootExportPath in rootExport,
      'Missing root export path "%s"',
      rootExportPath,
    )
  })

  const rootExportKeys = Object.keys(rootExport)

  invariant(
    rootExportKeys.includes('browser'),
    'Missing "browser" root-level export',
  )
  invariant(
    rootExportKeys.includes('node'),
    'Missing "import" root-level export',
  )

  // Listing the "browser" field first is crucial when forcing TS
  // to resolve the "browser" field first.
  invariant(
    rootExportKeys[0] === 'browser',
    'Must list the "browser" field first in the root-level exports',
  )

  validateExportConditions(`exports['.'].browser`, rootExport.browser)
  validateBundle(rootExport.browser.require, false)
  validateBundle(rootExport.browser.import, true)
  validateTypeDefs(rootExport.browser.types)

  validateExportConditions(`exports['.'].node`, rootExport.node)
  validateBundle(rootExport.node.require, false)
  validateBundle(rootExport.node.import, true)
  validateTypeDefs(rootExport.node.types)

  // Validate "./node" exports.
  const nodeExports = exports['./node']
  validateExportConditions(`exports['./node']`, nodeExports)
  invariant(
    nodeExports.browser === null,
    'The "node" export must set the "browser" field to null',
  )
  validateBundle(nodeExports.require, false)
  validateBundle(nodeExports.import, true)
  validateTypeDefs(nodeExports.types)

  // Validate "./native" exports.
  const nativeExports = exports['./native']
  validateExportConditions(`exports['./native']`, nativeExports)
  invariant(
    nativeExports.browser === null,
    'The "native" export must set the "browser" field to null',
  )
  validateBundle(nativeExports.require, false)
  validateBundle(nativeExports.import, true)
  validateTypeDefs(nativeExports.types)

  // Validate "./package.json" exports.
  validateExportConditions(
    `exports['./package.json]`,
    exports['./package.json'],
  )

  console.log('✅ Validated package.json exports')
}

function validateExportConditions(pointer, conditions) {
  if (typeof conditions === 'string') {
    invariant(
      fs.existsSync(conditions),
      'Expected a valid path at "%s" but got %s',
      pointer,
      conditions,
    )
    return
  }

  const keys = Object.keys(conditions)

  if (conditions[keys[0]] !== null) {
    invariant(keys[0] === 'types', 'FS')
  }

  // Ensure that paths point to existing files.
  keys.forEach((key) => {
    const relativeExportPath = conditions[key]

    if (relativeExportPath === null) {
      return
    }

    const exportPath = fromRoot(relativeExportPath)
    invariant(
      fs.existsSync(exportPath),
      'Expected the path at "%s" ("%s") to point at existing file but got %s',
      pointer,
      key,
      exportPath,
    )
  })
}

const ESM_CORE_IMPORT_EXP = /from ["'](..\/)+core(.*)["'];?$/gm
const CJS_CORE_IMPORT_EXP = /require\(["'](..\/)+core(.*)["']\);?$/gm

function getCodeSnippetAt(contents, index) {
  return contents.slice(index - 100, index + 50)
}

function validateBundle(bundlePath, isEsm = false) {
  const expectedExtension = isEsm ? '.mjs' : '.js'

  invariant(
    bundlePath.endsWith(expectedExtension),
    'Failed to validate bundle: provided bundle path does not point at an ".mjs" file: %s',
    bundlePath,
  )

  const absoluteBundlePath = fromRoot(bundlePath)
  const contents = fs.readFileSync(absoluteBundlePath, 'utf8')

  // The "~/core" imports must be overwritten on the bundler level.
  invariant(
    !contents.includes('~/core'),
    'Bundle at "%s" includes unresolved "~/core" imports:\n\n%s',
    bundlePath,
    getCodeSnippetAt(contents, contents.indexOf('~/core')),
  )

  // The "core" imports must end with the explicit ".mjs" extension.
  const coreImportsMatches =
    contents.matchAll(isEsm ? ESM_CORE_IMPORT_EXP : CJS_CORE_IMPORT_EXP) || []

  for (const match of coreImportsMatches) {
    const [, backslashes, relativeImportPath] = match

    invariant(
      backslashes === '../',
      'Found a "core" import with incorrect nesting level',
    )

    invariant(
      relativeImportPath !== '',
      'Found a "core" import without an explicit path at "%s":\n\n%s',
      absoluteBundlePath,
      getCodeSnippetAt(contents, match.index),
    )

    invariant(
      relativeImportPath.endsWith(expectedExtension),
      `Found a "core" import without "${expectedExtension}" extension at "%s":\n\n%s`,
      absoluteBundlePath,
      getCodeSnippetAt(contents, match.index),
    )
  }

  console.log('✅ Validated bundle at "%s"', bundlePath)
}

function validateTypeDefs(typeDefsPath) {
  const absoluteTypeDefsPath = fromRoot(typeDefsPath)
  invariant(
    fs.existsSync(absoluteTypeDefsPath),
    'Failed to validate type definitions at "%s": file does not exist',
    absoluteTypeDefsPath,
  )

  const contents = fs.readFileSync(absoluteTypeDefsPath, 'utf8')

  // The "~/core" imports must also be replaced with relative paths on build.
  invariant(
    !contents.includes('~/core'),
    'Found unresolved "~/core" imports at "%s":\n\n%s',
    absoluteTypeDefsPath,
    getCodeSnippetAt(contents, contents.indexOf('~/core')),
  )

  console.log('✅ Validated type definitions at "%s"', typeDefsPath)
}

validatePackageExports()
