import * as path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')

export function fromRoot(...paths: Array<string>): string {
  return path.resolve(ROOT, ...paths)
}

export const mswExports = {
  'msw/node': fromRoot('/lib/node/index.mjs'),
  'msw/native': fromRoot('/lib/native/index.mjs'),
  'msw/browser': fromRoot('/lib/browser/index.mjs'),
  msw: fromRoot('lib/core/index.mjs'),
}

export const customViteEnvironments = {
  'vitest-environment-node-websocket': fromRoot(
    '/test/support/environments/vitest-environment-node-websocket',
  ),
}
