import type { SetupWorker, StartOptions } from 'msw/browser'
import type { SetupServer } from 'msw/node'

export type Network = SetupServer | SetupWorker
type NetworkHandler = Parameters<SetupServer['use']>[0]

export interface NetworkDefinition {
  enabled?: boolean
  handlers?: Array<NetworkHandler>
  serverOptions?: Parameters<SetupServer['listen']>[0]
  workerOptions?: StartOptions
}

const networkDefinitions = new WeakMap<Network, NetworkDefinition>()

export function getNetworkDefinition(network: Network): NetworkDefinition {
  const definition = networkDefinitions.get(network)

  if (!definition) {
    throw new Error('Failed to get the definition of an unknown network')
  }

  return definition
}

export async function enableNetwork(
  network: Network,
  definition: NetworkDefinition,
): Promise<void> {
  if ('close' in network) {
    network.listen({
      onUnhandledRequest: 'bypass',
      ...definition.serverOptions,
    })
    return
  }

  await network.start({
    onUnhandledRequest: 'bypass',
    ...definition.workerOptions,
  })
}

export async function startNetwork(
  definition: NetworkDefinition,
): Promise<Network> {
  const handlers = definition.handlers ?? []
  const network =
    typeof window === 'undefined'
      ? (await import('msw/node')).setupServer(...handlers)
      : (await import('msw/browser')).setupWorker(...handlers)

  networkDefinitions.set(network, definition)

  if (definition.enabled !== false) {
    await enableNetwork(network, definition)
  }

  return network
}

export async function stopNetwork(network: Network): Promise<void> {
  if (network.readyState === 0) {
    return
  }

  if ('close' in network) {
    network.close()
    return
  }

  await network.stop()
}
