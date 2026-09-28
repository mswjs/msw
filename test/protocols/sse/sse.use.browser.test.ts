import { sse } from 'msw'
import { test, expect } from '../../setup/vitest-helpers'

test('supports server-sent event handler overrides', async ({
  network,
  page,
}) => {
  await page.evaluate(() => {
    network.use(
      sse('http://localhost/stream', ({ client }) => {
        client.send({ data: 'happy-path' })
      }),
    )
  })

  await page.evaluate(() => {
    network.use(
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
  })

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
