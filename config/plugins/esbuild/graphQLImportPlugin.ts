import fs from 'node:fs'
import type { Plugin } from 'esbuild'

/**
 * A plugin to replace `require('graphql')` statements with `await import('graphql')`
 * only for ESM bundles. This makes the GraphQL module to be imported lazily
 * while maintaining the CommonJS compatibility.
 * @see https://github.com/mswjs/msw/issues/2254
 */
export function graphqlImportPlugin(): Plugin {
  return {
    name: 'graphql-import-plugin',
    setup(build) {
      if (build.initialOptions.format !== 'esm') {
        return
      }

      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        const contents = await fs.promises.readFile(args.path, 'utf-8')
        const match = /require\(['"]graphql['"]\)/g.exec(contents)

        if (match) {
          return {
            loader: 'ts',
            contents:
              contents.slice(0, match.index - 1) +
              `await import('graphql').catch((error) => {console.error('[MSW] Failed to parse a GraphQL query: cannot import the "graphql" module. Please make sure you install it if you wish to intercept GraphQL requests. See the original import error below.'); throw error})` +
              contents.slice(match.index + match[0].length),
          }
        }
      })
    },
  }
}
