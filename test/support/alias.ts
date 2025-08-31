import url from 'node:url'
import path from 'node:path'

const ROOT_URL = new URL('../../', import.meta.url)

export function fromRoot(...paths: Array<string>): string {
  return url.fileURLToPath(new URL(path.join(...paths), ROOT_URL))
}

export const mswExports = {
  'msw/node': fromRoot('./lib/node/index.mjs'),
  'msw/native': fromRoot('./lib/native/index.mjs'),
  'msw/browser': fromRoot('./lib/browser/index.mjs'),
  msw: fromRoot('./lib/core/index.mjs'),
}

export const customViteEnvironments = {
  'vitest-environment-node-websocket': fromRoot(
    './test/support/environments/vitest-environment-node-websocket',
  ),
}
