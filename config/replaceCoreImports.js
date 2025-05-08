const CORE_ESM_IMPORT_PATTERN = /from ["'](~\/core(.*))["'](;)?/gm
const CORE_CJS_IMPORT_PATTERN = /require\(["'](~\/core(.*))["']\)(;)?/gm

function getCoreImportPattern(isEsm) {
  return isEsm ? CORE_ESM_IMPORT_PATTERN : CORE_CJS_IMPORT_PATTERN
}

export function hasCoreImports(fileContents, isEsm) {
  return getCoreImportPattern(isEsm).test(fileContents)
}

export function replaceCoreImports(fileContents, isEsm) {
  return fileContents.replace(
    getCoreImportPattern(isEsm),
    (_, __, maybeSubmodulePath, maybeSemicolon) => {
      const submodulePath = maybeSubmodulePath || '/index'
      const semicolon = maybeSemicolon || ''

      return isEsm
        ? `from "../core${submodulePath.endsWith('.mjs') ? submodulePath : submodulePath + '.mjs'}"${semicolon}`
        : `require("../core${submodulePath}")${semicolon}`
    },
  )
}
