import { sse } from 'msw'
import { test, expect } from '../../setup/vitest-helpers'

test('stops reconnecting to the upstream when the consumer closes mid-backoff', async ({
  network,
  testServer,
}) => {
  await fetch(testServer.http.url('/sse/upstream/reset'), { method: 'POST' })

  const url = testServer.http.url('/sse/upstream/retry').href
  network.use(
    sse(url, ({ server }) => {
      server.connect()
    }),
  )

  await new Promise<void>((resolve, reject) => {
    const source = new EventSource(url)
    source.addEventListener('message', () => {
      source.close()
      resolve()
    })
    source.onerror = () => {
      source.close()
      reject(new Error('EventSource connection failed'))
    }
  })

  await new Promise((resolve) => {
    setTimeout(resolve, 600)
  })

  const response = await fetch(testServer.http.url('/sse/upstream/count'))
  const result: { count: number } = await response.json()
  expect(result.count).toBe(1)
})
