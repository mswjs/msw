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
