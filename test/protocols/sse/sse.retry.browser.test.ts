import { sse } from 'msw'
import { test, expect } from '../../setup/vitest-helpers'

test('supports mocking the retry time', async ({ network, page }) => {
  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          retry: 2000,
        })

        // Simulate the connection closure.
        // This will trigger the client to reconnect.
        queueMicrotask(() => client.close())
      }),
    )
  })

  const reconnectionTime = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const source = new EventSource('http://localhost/stream')

      source.onerror = () => {
        const errorAt = Date.now()

        console.assert(
          source.readyState === EventSource.CONNECTING,
          'Expected the connection to be in CONNECTING state but got %d',
          source.readyState,
        )

        source.addEventListener('open', () => {
          const reconnectAt = Date.now()
          resolve(reconnectAt - errorAt)
        })
      }
    })
  })

  expect(reconnectionTime).toBeGreaterThanOrEqual(2000)
})
