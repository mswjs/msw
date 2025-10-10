import { type AnyHandler } from '~/core/new/handlers-controller'
import type { SharedOptions } from '~/core/sharedOptions'
import {
  defineNetwork,
  NetworkHandlersApi,
  type NetworkApi,
} from '~/core/new/define-network'
import { asyncHandlersController } from './async-handler-controller'
import { RemoteProcessSource } from './remote-process-source'

export interface SetupRemoteServerListenOptions extends SharedOptions {
  port: number
}

interface SetupRemoteServer extends NetworkHandlersApi<AnyHandler> {
  listen(options: SetupRemoteServerListenOptions): Promise<void>
  close(): Promise<void>
  boundary<Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ): (...args: Args) => R
}

/**
 * Enables request interception in Node.js, handling requests coming
 * from a remote process.
 *
 * @see {@link https://mswjs.io/docs/api/setup-remote-server `setupRemoteServer()` API reference}
 */
export function setupRemoteServer(
  ...handlers: Array<AnyHandler>
): SetupRemoteServer {
  let network: NetworkApi<AnyHandler>
  const handlersController = asyncHandlersController(handlers)

  return {
    async listen(options) {
      network = defineNetwork({
        sources: [
          new RemoteProcessSource({
            port: options.port,
          }),
        ],
        handlers,
        handlersController,
      })

      await network.enable()
    },
    async close() {
      await network?.disable()
    },
    boundary(callback) {
      return (...args) => {
        return handlersController.context.run<any, any>(
          {
            initialHandlers: handlersController.currentHandlers(),
            handlers: [],
          },
          callback,
          ...args,
        )
      }
    },
    use(...handlers) {
      return network.use(...handlers)
    },
    resetHandlers(...nextHandlers) {
      return network.resetHandlers(...nextHandlers)
    },
    restoreHandlers() {
      return network.restoreHandlers()
    },
    listHandlers() {
      return network.listHandlers()
    },
  }
}
