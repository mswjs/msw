import { expect, inject, test as base } from 'vitest'
import {
  enableNetwork,
  getNetworkDefinition,
  startNetwork,
  stopNetwork,
  type NetworkDefinition,
} from './network'

interface TestServerUrls {
  http: string
  https: string
  ws: string
}

declare module 'vitest' {
  export interface ProvidedContext {
    testServer: TestServerUrls
  }
}

function createTestServer() {
  const urls = inject('testServer')

  const createUrl = (protocol: keyof TestServerUrls) => {
    return (path = '/'): URL => {
      return new URL(path, urls[protocol])
    }
  }

  return {
    http: {
      href: urls.http,
      url: createUrl('http'),
    },
    https: {
      href: urls.https,
      url: createUrl('https'),
    },
    ws: {
      href: urls.ws,
      url: createUrl('ws'),
    },
  }
}

export type TestServer = ReturnType<typeof createTestServer>

const testServerTest = base.extend('testServer', { scope: 'worker' }, () => {
  return createTestServer()
})

export function defineNetwork(definition: NetworkDefinition = {}) {
  const test = testServerTest.extend(
    'network',
    { scope: 'file', auto: true },
    async ({}, { onCleanup }) => {
      const network = await startNetwork(definition)
      onCleanup(async () => {
        await stopNetwork(network)
      })
      return network
    },
  )

  test.beforeEach(async ({ network }) => {
    /**
     * @note Read the definition from the network, not from this closure.
     * The module-level `test` below registers this hook too, and hooks
     * run for every test in the file, including those created by another
     * `defineNetwork()` call with a different definition.
     */
    const networkDefinition = getNetworkDefinition(network)

    // A previous test may have stopped the network. Bring it back
    // so every test starts from the state the file was defined with.
    if (networkDefinition.enabled !== false && network.readyState === 0) {
      await enableNetwork(network, networkDefinition)
    }

    network.resetHandlers()
  })

  return test
}

export const test = defineNetwork()

export { expect }
