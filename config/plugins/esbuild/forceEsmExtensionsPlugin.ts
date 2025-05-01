import { Plugin } from 'esbuild'

export function forceEsmExtensionsPlugin(): Plugin {
  return {
    name: 'forceEsmExtensionsPlugin',
    setup(build) {
      const isEsm = build.initialOptions.format === 'esm'

      build.onEnd(async (result) => {
        if (result.errors.length > 0) {
          return
        }

        for (const outputFile of result.outputFiles || []) {
          // Only target CJS/ESM files.
          // This ignores additional files emitted, like sourcemaps ("*.js.map").
          if (
            !(
              outputFile.path.endsWith('.js') ||
              outputFile.path.endsWith('.mjs')
            )
          ) {
            continue
          }

          const fileContents = outputFile.text
          const nextFileContents = modifyRelativeImports(fileContents, isEsm)

          outputFile.contents = Buffer.from(nextFileContents)
        }
      })
    },
  }
}

const CJS_RELATIVE_IMPORT_EXP = /require\(["'](\..+)["']\)(;)?/gm
const ESM_RELATIVE_IMPORT_EXP = /from ["'](\..+)["'](;)?/gm

function modifyRelativeImports(contents: string, isEsm: boolean): string {
  const extension = isEsm ? '.js' : '.cjs'
  const importExpression = isEsm
    ? ESM_RELATIVE_IMPORT_EXP
    : CJS_RELATIVE_IMPORT_EXP

  return contents.replace(
    importExpression,
    (_, importPath, maybeSemicolon = '') => {
      if (importPath.endsWith('.') || importPath.endsWith('/')) {
        return isEsm
          ? `from '${importPath}/index${extension}'${maybeSemicolon}`
          : `require("${importPath}/index${extension}")${maybeSemicolon}`
      }

      if (importPath.endsWith(extension)) {
        return isEsm
          ? `from '${importPath}'${maybeSemicolon}`
          : `require("${importPath}")${maybeSemicolon}`
      }

      return isEsm
        ? `from '${importPath}${extension}'${maybeSemicolon}`
        : `require("${importPath}${extension}")${maybeSemicolon}`
    },
  )
}
