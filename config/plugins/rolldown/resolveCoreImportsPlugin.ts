import type { TsdownPlugin } from 'tsdown'

const CORE_IMPORT_PATTERN = /(from|import)\s+["']#core(.*?)["'](;)?/gm

/**
 * Resolves the "#core" import alias to relative paths
 * in the emitted chunks, including the type definition files.
 */
export function resolveCoreImportsPlugin(): TsdownPlugin {
  return {
    name: 'resolveCoreImportsPlugin',
    renderChunk(code, chunk) {
      return {
        code: replaceCoreImports(code, chunk.fileName),
        map: null,
      }
    },
  }
}

function replaceCoreImports(
  fileContents: string,
  chunkFileName: string,
): string {
  // Chunk file names are relative to the output directory, which
  // is a sibling of "lib/core" (e.g. "lib/graphql"). Step out of
  // the chunk's own directory depth, then out of the output directory.
  const chunkDepth = chunkFileName.split('/').length - 1
  const coreRootPath = `${'../'.repeat(chunkDepth + 1)}core`

  return fileContents.replace(
    CORE_IMPORT_PATTERN,
    (_, keyword, maybeSubmodulePath, maybeSemicolon) => {
      const submodulePath = maybeSubmodulePath || '/index'
      const semicolon = maybeSemicolon || ''

      return `${keyword} "${coreRootPath}${submodulePath}.js"${semicolon}`
    },
  )
}
