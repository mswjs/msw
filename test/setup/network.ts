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

export async function startNetwork(
  definition: NetworkDefinition,
): Promise<Network> {
  const handlers = definition.handlers ?? []

  if (typeof window === 'undefined') {
    const { setupServer } = await import('msw/node')
    const network = setupServer(...handlers)

    if (definition.enabled !== false) {
      network.listen({
        onUnhandledRequest: 'bypass',
        ...definition.serverOptions,
      })
    }

    return network
  }

  const { setupWorker } = await import('msw/browser')
  const network = setupWorker(...handlers)

  if (definition.enabled !== false) {
    await network.start({
      onUnhandledRequest: 'bypass',
      ...definition.workerOptions,
    })
  }

  return network
}

export async function stopNetwork(network: Network): Promise<void> {
  if ('close' in network) {
    network.close()
    return
  }

  await network.stop()
}
