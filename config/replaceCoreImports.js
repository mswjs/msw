const CORE_IMPORT_PATTERN = /(from|import)\s+["']#core(.*?)["'](;)?/gm

export function hasCoreImports(fileContents) {
  return fileContents.search(CORE_IMPORT_PATTERN) !== -1
}

export function replaceCoreImports(fileContents) {
  return fileContents.replace(
    CORE_IMPORT_PATTERN,
    (_, keyword, maybeSubmodulePath, maybeSemicolon) => {
      const submodulePath = maybeSubmodulePath || '/index'
      const semicolon = maybeSemicolon || ''

      return `${keyword} "../core${submodulePath}.js"${semicolon}`
    },
  )
}
