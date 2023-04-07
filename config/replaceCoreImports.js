function replaceCoreImports(fileContents, isEsm, overrideExtension) {
  const importPattern = isEsm
    ? /from ["'](~\/core(.*))["'](;)?$/gm
    : /require\(["'](~\/core(.*))["']\)(;)?/gm

  const forcedExtension =
    typeof overrideExtension !== 'undefined'
      ? overrideExtension
      : isEsm
      ? '.mjs'
      : '.js'

  return fileContents.replace(
    importPattern,
    (_, __, maybeSubmodulePath, maybeSemicolon) => {
      const submodulePath = maybeSubmodulePath || '/index'
      const semicolon = maybeSemicolon || ''

      return isEsm
        ? `from "../core${submodulePath}${forcedExtension}"${semicolon}`
        : `require("../core${submodulePath}${forcedExtension}")${semicolon}`
    },
  )
}

module.exports = {
  replaceCoreImports,
}
