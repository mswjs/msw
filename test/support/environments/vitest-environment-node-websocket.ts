/**
 * Node.js environment superset that has a global WebSocket API.
 */
import { Environment, builtinEnvironments } from 'vitest/environments'
import { WebSocket } from 'undici'

export default <Environment>{
  name: 'node-with-websocket',
  transformMode: 'ssr',
  async setup(global, options) {
    /**
     * @note It's crucial this extend the Node.js environment.
     * JSDOM polyfills the global "Event", making it unusable
     * with Node's "EventTarget".
     */
    const { teardown } = await builtinEnvironments.node.setup(global, options)

    Reflect.set(globalThis, 'WebSocket', WebSocket)

    return {
      teardown,
    }
  },
}
