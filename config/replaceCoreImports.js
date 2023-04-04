function replaceCoreImports(fileContents, isEsm, overrideExtension) {
  const importPattern = isEsm
    ? /from ["'](~\/core(.*))["'];$/gm
    : /require\(["'](~\/core(.*))["']\);$/gm

  const forcedExtension =
    typeof overrideExtension !== 'undefined'
      ? overrideExtension
      : isEsm
      ? '.mjs'
      : '.js'

  return fileContents.replace(importPattern, (_, __, maybeSubmodulePath) => {
    const submodulePath = maybeSubmodulePath || '/index'

    return isEsm
      ? `from "../core${submodulePath}${forcedExtension}";`
      : `require("../core${submodulePath}${forcedExtension}");`
  })
}

module.exports = {
  replaceCoreImports,
}
