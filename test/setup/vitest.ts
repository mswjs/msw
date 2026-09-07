import { expect, inject, test as base } from 'vitest'
import { startNetwork, stopNetwork, type NetworkDefinition } from './network'

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

  test.beforeEach(({ network }) => {
    network.resetHandlers()
  })

  return test
}

export const test = defineNetwork()

export { expect }
