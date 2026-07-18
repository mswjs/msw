import type { TsdownPlugin } from 'tsdown'

export const ESM_EXTENSION = '.js'

/**
 * Forces explicit file extensions on relative imports
 * in the emitted ESM chunks so they resolve in Node.js.
 */
export function forceFileExtensionsPlugin(): TsdownPlugin {
  return {
    name: 'forceFileExtensionsPlugin',
    renderChunk(code) {
      return {
        code: modifyRelativeImports(code),
        map: null,
      }
    },
  }
}

const ESM_RELATIVE_IMPORT_EXP = /from ["'](\..+)["'](;)?/gm

function modifyRelativeImports(contents: string): string {
  return contents.replace(
    ESM_RELATIVE_IMPORT_EXP,
    (_, importPath, maybeSemicolon = '') => {
      if (importPath.endsWith('.') || importPath.endsWith('/')) {
        return `from '${importPath}/index${ESM_EXTENSION}'${maybeSemicolon}`
      }

      if (importPath.endsWith(ESM_EXTENSION)) {
        return `from '${importPath}'${maybeSemicolon}`
      }

      return `from '${importPath}${ESM_EXTENSION}'${maybeSemicolon}`
    },
  )
}
