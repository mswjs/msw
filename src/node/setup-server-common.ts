import { invariant } from 'outvariant'
import {
  NetworkReadyState,
  type NetworkApi,
} from '#core/experimental/define-network'
import { devUtils } from '#core/utils/internal/devUtils'
import type { SetupServerCommon } from './glossary'

/**
 * Define the common `setupServer` API around the given network,
 * including the baseline setup methods, like `.use()`, `.resetHandlers()`, `.close()`, etc.
 */
export function defineSetupServerApi(
  network: NetworkApi<any>,
): SetupServerCommon {
  return {
    get readyState() {
      return network.readyState
    },
    events: network.events,
    listen(options) {
      invariant(
        network.readyState === NetworkReadyState.DISABLED,
        devUtils.formatMessage(
          'Failed to call "server.listen()": the server is already listening. Remove the redundant "server.listen()" call.',
        ),
      )

      network.configure({
        onUnhandledFrame: options?.onUnhandledFrame ?? 'warn',
      })

      network.enable()
    },
    use: network.use.bind(network),
    resetHandlers: network.resetHandlers.bind(network),
    restoreHandlers: network.restoreHandlers.bind(network),
    listHandlers: network.listHandlers.bind(network),
    close() {
      network.disable()
    },
  }
}
