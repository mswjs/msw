import { Plugin } from 'esbuild'
import { replaceCoreImports } from '../../replaceCoreImports'
import { ESM_EXTENSION } from './forceEsmExtensionsPlugin'

export function resolveCoreImportsPlugin(): Plugin {
  return {
    name: 'resolveCoreImportsPlugin',
    setup(build) {
      build.onEnd(async (result) => {
        if (result.errors.length > 0) {
          return
        }

        for (const outputFile of result.outputFiles || []) {
          const isEsm = outputFile.path.endsWith(ESM_EXTENSION)
          const fileContents = outputFile.text
          const nextFileContents = replaceCoreImports(fileContents, isEsm)

          outputFile.contents = Buffer.from(nextFileContents)
        }
      })
    },
  }
}
