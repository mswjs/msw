const CORE_ESM_IMPORT_PATTERN = /from ["'](~\/core(.*))["'](;)?/gm
const CORE_CJS_IMPORT_PATTERN = /require\(["'](~\/core(.*))["']\)(;)?/gm

function getCoreImportPattern(isEsm) {
  return isEsm ? CORE_ESM_IMPORT_PATTERN : CORE_CJS_IMPORT_PATTERN
}

export function hasCoreImports(fileContents, isEsm) {
  return getCoreImportPattern(isEsm).test(fileContents)
}

export function replaceCoreImports(moduleFilePath, fileContents, isEsm) {
  return fileContents.replace(
    getCoreImportPattern(isEsm),
    (_, __, maybeSubmodulePath, maybeSemicolon) => {
      const submodulePath = maybeSubmodulePath || '/index'
      /**
       * @note Although all .d.ts are considered ESM, append different
       * file extension for d.mts files.
       */
      const extension = moduleFilePath.endsWith('.d.mts') ? '.mjs' : ''
      const semicolon = maybeSemicolon || ''

      return isEsm
        ? `from "../core${submodulePath}${extension}"${semicolon}`
        : `require("../core${submodulePath}")${semicolon}`
    },
  )
}
