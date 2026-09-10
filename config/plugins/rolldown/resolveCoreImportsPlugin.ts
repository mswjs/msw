import type { TsdownPlugin } from 'tsdown'

const CORE_IMPORT_PATTERN =
  /(from|import)\s+["']#(core|http|graphql|ws)(.*?)["'](;)?/gm

/**
 * Resolves the "#core", "#http", and "#graphql" import aliases to
 * relative paths in the emitted chunks, including the type definition files.
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
  // is a sibling of the aliased module (e.g. "lib/graphql" next to
  // "lib/core"). Step out of the chunk's own directory depth, then
  // out of the output directory.
  const chunkDepth = chunkFileName.split('/').length - 1
  const libRootPath = '../'.repeat(chunkDepth + 1)

  return fileContents.replace(
    CORE_IMPORT_PATTERN,
    (_, keyword, moduleName, maybeSubmodulePath, maybeSemicolon) => {
      const submodulePath = maybeSubmodulePath || '/index'
      const semicolon = maybeSemicolon || ''

      return `${keyword} "${libRootPath}${moduleName}${submodulePath}.js"${semicolon}`
    },
  )
}
