import { sse } from 'msw'
import { setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

test('supports mocking the retry time', async ({ loadExample, page }) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          retry: 2000,
        })

        // Simulate the connection closure.
        // This will trigger the client to reconnect.
        queueMicrotask(() => client.close())
      }),
    )
    await worker.start()
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
