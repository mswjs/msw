import type { NetworkApi } from '#core/experimental/define-network'
import { fromLegacyOnUnhandledRequest } from '#core/experimental/compat'
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
      network.configure({
        onUnhandledFrame: fromLegacyOnUnhandledRequest(() => {
          return options?.onUnhandledRequest || 'warn'
        }),
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
