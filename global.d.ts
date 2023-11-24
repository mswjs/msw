declare module '@bundled-es-modules/cookie' {
  export * as default from 'cookie'
}

declare module '@bundled-es-modules/statuses' {
  import * as statuses from 'statuses'
  export default statuses
}

declare module 'babel-minify' {
  export default function babelMinify(
    code: string,
    opts: Record<string, any>,
    babelOpts: Record<string, any>,
  ): { code: string }
}

declare module '@bundled-es-modules/js-levenshtein' {
  import levenshtein from 'js-levenshtein'
  export default levenshtein
}
