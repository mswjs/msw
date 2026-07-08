import path from 'node:path'
import type { TsdownPlugin } from 'tsdown'
import { replaceCoreImports } from '../../replaceCoreImports.js'
import { ESM_EXTENSION } from './forceFileExtensionsPlugin.ts'

export function resolveCoreImportsPlugin(): TsdownPlugin {
  return {
    name: 'resolveCoreImportsPlugin',
    renderChunk(code, chunk, outputOptions) {
      const isEsm = chunk.fileName.endsWith(ESM_EXTENSION)
      const moduleFilePath = path.resolve(outputOptions.dir!, chunk.fileName)

      return {
        code: replaceCoreImports(moduleFilePath, code, isEsm),
        map: null,
      }
    },
  }
}
