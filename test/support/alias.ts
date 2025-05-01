import * as url from 'node:url'
import * as path from 'node:path'

const ROOT = new URL('../..', import.meta.url)

export function fromRoot(...paths: Array<string>): string {
  return url.fileURLToPath(new URL(path.join(...paths), ROOT))
}

export const mswExports = {
  'msw/node': fromRoot('/lib/node/index.js'),
  'msw/native': fromRoot('/lib/native/index.js'),
  'msw/browser': fromRoot('/lib/browser/index.js'),
  msw: fromRoot('lib/core/index.js'),
}

export const customViteEnvironments = {
  'vitest-environment-node-websocket': fromRoot(
    '/test/support/environments/vitest-environment-node-websocket',
  ),
}
