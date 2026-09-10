/// <reference types="vite/client" />

import {
  defineNetwork,
  NetworkReadyState,
  type NetworkApi,
} from 'msw/experimental'
import { defaultNetworkOptions } from 'virtual:msw/options'

const hot = import.meta.hot
const hotData: { disposeNetwork?: () => Promise<void> } | undefined = hot?.data

// SSR imports can re-evaluate this module before the old HMR listener runs.
while (hotData?.disposeNetwork) {
  const disposePrevious = hotData.disposeNetwork
  await disposePrevious()

  if (hotData.disposeNetwork === disposePrevious) {
    break
  }
}

export const network: NetworkApi<typeof defaultNetworkOptions.sources> =
  defineNetwork<typeof defaultNetworkOptions.sources>(defaultNetworkOptions)

if (hot && hotData) {
  let resumeAfterUpdate = false
  let retired = false
  let pendingOperation: Promise<void> | undefined
  const configure = network.configure
  const enable = network.enable
  const disable = network.disable

  const runOperation = (action: () => void | Promise<void>) => {
    const result = pendingOperation ? pendingOperation.then(action) : action()

    if (result instanceof Promise) {
      const operation = result.finally(() => {
        if (pendingOperation === operation) {
          pendingOperation = undefined
        }
      })
      pendingOperation = operation

      return operation
    }
  }

  const stop = () => {
    if (network.readyState === NetworkReadyState.ENABLED) {
      return disable()
    }
  }

  // An SSR entry may be re-evaluated while this module remains cached.
  network.configure = (options) => {
    void runOperation(() => {
      if (retired) {
        return
      }

      const stopped = stop()

      if (stopped instanceof Promise) {
        return stopped.then(() => configure(options))
      }

      configure(options)
    })
  }
  network.enable = async () => {
    await runOperation(() => {
      if (!retired && network.readyState === NetworkReadyState.DISABLED) {
        return enable()
      }
    })
  }
  network.disable = async () => {
    await runOperation(stop)
  }

  const disableNetwork = async () => {
    await network.disable()
  }

  const beforeUpdate = async () => {
    resumeAfterUpdate = network.readyState === NetworkReadyState.ENABLED
    await disableNetwork()
  }

  const afterUpdate = async () => {
    const shouldResume = resumeAfterUpdate
    resumeAfterUpdate = false

    if (shouldResume && network.readyState === NetworkReadyState.DISABLED) {
      await network.enable()
    }
  }

  hot.on('vite:beforeUpdate', beforeUpdate)
  hot.on('vite:afterUpdate', afterUpdate)
  hot.on('vite:beforeFullReload', disableNetwork)

  const disposeNetwork = async () => {
    retired = true
    resumeAfterUpdate = false

    hot.off('vite:beforeUpdate', beforeUpdate)
    hot.off('vite:afterUpdate', afterUpdate)
    hot.off('vite:beforeFullReload', disableNetwork)

    await disableNetwork()
  }

  hotData.disposeNetwork = disposeNetwork
  hot.dispose(disposeNetwork)
}
