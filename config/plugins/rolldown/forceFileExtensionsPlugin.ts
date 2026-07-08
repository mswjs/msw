import type { TsdownPlugin } from 'tsdown'

export const ESM_EXTENSION = '.mjs'
export const CJS_EXTENSION = '.js'

export function forceFileExtensionsPlugin(): TsdownPlugin {
  return {
    name: 'forceFileExtensionsPlugin',
    renderChunk(code, chunk, outputOptions) {
      const isEsm =
        outputOptions.format === 'es' || chunk.fileName.endsWith(ESM_EXTENSION)

      if (!isEsm) {
        return
      }

      return {
        code: modifyRelativeImports(code, isEsm),
        map: null,
      }
    },
  }
}

const CJS_RELATIVE_IMPORT_EXP = /require\(["'](\..+)["']\)(;)?/gm
const ESM_RELATIVE_IMPORT_EXP = /from ["'](\..+)["'](;)?/gm

function modifyRelativeImports(contents: string, isEsm: boolean): string {
  const extension = isEsm ? ESM_EXTENSION : CJS_EXTENSION
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
