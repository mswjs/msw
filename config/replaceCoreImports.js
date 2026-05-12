const CORE_ESM_IMPORT_PATTERN = /(from|import)\s+["'](#core(.*?))["'](;)?/gm
const CORE_CJS_IMPORT_PATTERN = /require\(["'](#core(.*?))["']\)(;)?/gm

function getCoreImportPattern(isEsm) {
  return isEsm ? CORE_ESM_IMPORT_PATTERN : CORE_CJS_IMPORT_PATTERN
}

export function hasCoreImports(fileContents, isEsm) {
  return fileContents.search(getCoreImportPattern(isEsm)) !== -1
}

export function replaceCoreImports(moduleFilePath, fileContents, isEsm) {
  if (isEsm) {
    return fileContents.replace(
      CORE_ESM_IMPORT_PATTERN,
      (_, keyword, __, maybeSubmodulePath, maybeSemicolon) => {
        const submodulePath = maybeSubmodulePath || '/index'
        /**
         * @note Although all .d.ts are considered ESM, append different
         * file extension for d.mts files.
         */
        const extension = moduleFilePath.endsWith('.d.mts') ? '.mjs' : ''
        const semicolon = maybeSemicolon || ''

        return `${keyword} "../core${submodulePath}${extension}"${semicolon}`
      },
    )
  }

  return fileContents.replace(
    CORE_CJS_IMPORT_PATTERN,
    (_, __, maybeSubmodulePath, maybeSemicolon) => {
      const submodulePath = maybeSubmodulePath || '/index'
      const semicolon = maybeSemicolon || ''

      return `require("../core${submodulePath}")${semicolon}`
    },
  )
}
