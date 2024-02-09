/**
 * Node.js environment superset that has a global WebSocket API.
 */
import type { Environment } from 'vitest'
import { builtinEnvironments } from 'vitest/environments'
import { WebSocket } from 'undici'

export default <Environment>{
  name: 'node-with-websocket',
  transformMode: 'ssr',
  async setup(global, options) {
    const { teardown } = await builtinEnvironments.jsdom.setup(global, options)

    Reflect.set(globalThis, 'WebSocket', WebSocket)

    return {
      teardown,
    }
  },
}
