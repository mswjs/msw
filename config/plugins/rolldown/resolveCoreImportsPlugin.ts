import type { TsdownPlugin } from 'tsdown'
import { replaceCoreImports } from '../../replaceCoreImports.js'

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
