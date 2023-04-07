function replaceCoreImports(fileContents, isEsm) {
  const importPattern = isEsm
    ? /from ["'](~\/core(.*))["'](;)?$/gm
    : /require\(["'](~\/core(.*))["']\)(;)?/gm

  return fileContents.replace(
    importPattern,
    (_, __, maybeSubmodulePath, maybeSemicolon) => {
      const submodulePath = maybeSubmodulePath || '/index'
      const semicolon = maybeSemicolon || ''

      return isEsm
        ? `from "../core${submodulePath}"${semicolon}`
        : `require("../core${submodulePath}")${semicolon}`
    },
  )
}

module.exports = {
  replaceCoreImports,
}
