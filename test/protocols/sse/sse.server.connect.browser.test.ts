import { sse } from 'msw'
import type { Network } from '../../setup/network'
import { test, expect } from '../../setup/vitest-helpers'

function connectUpstream(network: Network, url: string): void {
  network.use(
    sse(url, ({ server }) => {
      server.connect()
    }),
  )
}

function waitForOpen(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const source = new EventSource(url)
    source.onopen = () => {
      source.close()
      resolve()
    }
    source.onerror = () => {
      source.close()
      reject(new Error('EventSource connection failed'))
    }
  })
}

test('makes the actual request when called "server.connect()"', async ({
  network,
  testServer,
}) => {
  const url = testServer.http.url('/sse/upstream/message').href
  connectUpstream(network, url)

  await expect(waitForOpen(url)).resolves.toBeUndefined()
})

test('forwards message event from the server to the client automatically', async ({
  network,
  testServer,
}) => {
  const url = testServer.http.url('/sse/upstream/message').href
  connectUpstream(network, url)

  const message = await new Promise<{ message: string }>((resolve, reject) => {
    const source = new EventSource(url)
    source.addEventListener('message', (event) => {
      source.close()
      resolve(JSON.parse(event.data))
    })
    source.onerror = () => {
      source.close()
      reject(new Error('EventSource connection failed'))
    }
  })

  expect(message).toEqual({ message: 'hello' })
})

test('forwards custom event from the server to the client automatically', async ({
  network,
  testServer,
}) => {
  const url = testServer.http.url('/sse/upstream/custom').href
  connectUpstream(network, url)

  const message = await new Promise<{ message: string }>((resolve, reject) => {
    const source = new EventSource(url)
    source.addEventListener('custom', (event) => {
      source.close()
      resolve(JSON.parse(event.data))
    })
    source.onerror = () => {
      source.close()
      reject(new Error('EventSource connection failed'))
    }
  })

  expect(message).toEqual({ message: 'hello' })
})

for (const path of ['/sse/upstream/error', '/sse/upstream/custom-error']) {
  test(`forwards the upstream error from ${path}`, async ({
    network,
    testServer,
  }) => {
    const url = testServer.http.url(path).href
    connectUpstream(network, url)

    const errorPromise = new Promise<void>((resolve, reject) => {
      const source = new EventSource(url)
      source.onerror = () => {
        source.close()
        resolve()
      }
      source.onmessage = () => {
        source.close()
        reject(new Error('Must not receive a message'))
      }
    })

    await expect(errorPromise).resolves.toBeUndefined()
  })
}
