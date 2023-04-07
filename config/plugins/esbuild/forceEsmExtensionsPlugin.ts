import { Plugin } from 'esbuild'

export function forceEsmExtensionsPlugin(): Plugin {
  return {
    name: 'forceEsmExtensionsPlugin',
    setup(build) {
      // This plugin is relevant only for ESM targets.
      if (build.initialOptions.format !== 'esm') {
        return
      }

      build.onEnd(async (result) => {
        if (result.errors.length > 0) {
          return
        }

        for (const outputFile of result.outputFiles || []) {
          const isEsm = outputFile.path.endsWith('.mjs')

          // Ignore non-ESM files in the build output.
          if (!isEsm) {
            continue
          }

          const fileContents = outputFile.text
          const nextFileContents = modifyRelativeImports(fileContents)

          outputFile.contents = Buffer.from(nextFileContents)
        }
      })
    },
  }
}

const ESM_RELATIVE_IMPORT_EXP = /from ["'](\..+)["'];?/gm

function modifyRelativeImports(contents: string): string {
  return contents.replace(ESM_RELATIVE_IMPORT_EXP, (_, importPath) => {
    if (importPath.endsWith('.') || importPath.endsWith('/')) {
      return `from '${importPath}/index.mjs'`
    }

    if (importPath.endsWith('.mjs')) {
      return `from '${importPath}'`
    }

    return `from '${importPath}.mjs'`
  })
}
