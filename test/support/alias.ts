import url from 'node:url'
import path from 'node:path'

const ROOT_URL = new URL('../../', import.meta.url)

export function fromRoot(...paths: Array<string>): string {
  return url.fileURLToPath(new URL(path.join(...paths), ROOT_URL))
}

export const mswExports = {
  'msw/http': fromRoot('./lib/http/index.js'),
  'msw/node': fromRoot('./lib/node/index.js'),
  'msw/native': fromRoot('./lib/native/index.js'),
  'msw/browser': fromRoot('./lib/browser/index.js'),
  'msw/graphql': fromRoot('./lib/graphql/index.js'),
  'msw/ws': fromRoot('./lib/ws/index.js'),
  msw: fromRoot('./lib/core/index.js'),
}
