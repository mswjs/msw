import { UnhandledRequestStrategy } from './utils/request/onUnhandledRequest'

export interface SharedOptions {
  /**
   * Specifies how to react to a request that has no corresponding
   * request handler. Warns on unhandled requests by default.
   *
   * @example worker.start({ onUnhandledRequest: 'bypass' })
   * @example worker.start({ onUnhandledRequest: 'warn' })
   * @example server.listen({ onUnhandledRequest: 'error' })
   */
  onUnhandledRequest: UnhandledRequestStrategy
}
