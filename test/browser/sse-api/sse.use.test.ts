import { setupWorker, sse } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

test('supports server-sent event handler overrides', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  const workerRef = await page.evaluateHandle(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({ data: 'happy-path' })
      }),
    )
    await worker.start()
    return worker
  })

  await page.evaluate((worker) => {
    const { sse } = window.msw

    worker.use(
      // Adding this runtime request handler will make it
      // take precedence over the happy path handler above.
      sse('http://localhost/stream', ({ client }) => {
        // Queue the data for the next tick to rule out
        // the happy path handler from executing.
        queueMicrotask(() => {
          client.send({ data: 'override' })
        })
      }),
    )
  }, workerRef)

  const message = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.addEventListener('message', (event) => {
        resolve(event.data)
      })
      source.onerror = reject
    })
  })

  expect(message).toBe('override')
})
