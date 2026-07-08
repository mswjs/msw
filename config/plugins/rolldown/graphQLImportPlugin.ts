import type { TsdownPlugin } from 'tsdown'

/**
 * A plugin to replace `require('graphql')` statements with `await import('graphql')`
 * only for ESM bundles. This makes the GraphQL module to be imported lazily
 * while maintaining the CommonJS compatibility.
 * @see https://github.com/mswjs/msw/issues/2254
 */
export function graphqlImportPlugin(): TsdownPlugin {
  return {
    name: 'graphql-import-plugin',
    transform(code, id) {
      if (!id.endsWith('.ts') || !code.includes(`require('graphql')`)) {
        return
      }

      return {
        code: code.replace(
          /require\(['"]graphql['"]\)/g,
          `await import('graphql').catch((error) => {console.error('[MSW] Failed to parse a GraphQL query: cannot import the "graphql" module. Please make sure you install it if you wish to intercept GraphQL requests. See the original import error below.'); throw error})`,
        ),
        map: null,
      }
    },
  }
}
