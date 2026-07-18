import type { TsdownPlugin } from 'tsdown'

const CORE_IMPORT_PATTERN = /(from|import)\s+["']#core(.*?)["'](;)?/gm

/**
 * Resolves the "#core" import alias to relative paths
 * in the emitted chunks, including the type definition files.
 */
export function resolveCoreImportsPlugin(): TsdownPlugin {
  return {
    name: 'resolveCoreImportsPlugin',
    renderChunk(code) {
      return {
        code: replaceCoreImports(code),
        map: null,
      }
    },
  }
}

function replaceCoreImports(fileContents: string): string {
  return fileContents.replace(
    CORE_IMPORT_PATTERN,
    (_, keyword, maybeSubmodulePath, maybeSemicolon) => {
      const submodulePath = maybeSubmodulePath || '/index'
      const semicolon = maybeSemicolon || ''

      return `${keyword} "../core${submodulePath}.js"${semicolon}`
    },
  )
}
