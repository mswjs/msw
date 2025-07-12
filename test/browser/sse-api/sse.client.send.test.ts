import { setupWorker, sse } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

test('sends a mock message event', async ({ loadExample, page }) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          data: { username: 'john' },
        })
      }),
    )
    await worker.start()
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.onerror = () => reject()

      source.addEventListener('message', (event) => {
        resolve(`${event.type}:${event.data}`)
      })
    })
  })

  expect(message).toBe('message:{"username":"john"}')
})

test('sends a mock custom event', async ({ loadExample, page }) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse<{ userconnect: { username: string } }>(
        'http://localhost/stream',
        ({ client }) => {
          client.send({
            event: 'userconnect',
            data: { username: 'john' },
          })
        },
      ),
    )
    await worker.start()
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.addEventListener('userconnect', (event) => {
        resolve(`${event.type}:${event.data}`)
      })
      source.onerror = () => reject()
    })
  })

  expect(message).toEqual('userconnect:{"username":"john"}')
})

test('sends a mock message event with custom id', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse<{ userconnect: { username: string } }>(
        'http://localhost/stream',
        ({ client }) => {
          client.send({
            id: 'abc-123',
            event: 'userconnect',
            data: { username: 'john' },
          })
        },
      ),
    )
    await worker.start()
  })

  const message = await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.addEventListener('userconnect', (event) => {
        resolve(`${event.type}:${event.lastEventId}:${event.data}`)
      })
      source.onerror = () => reject()
    })
  })

  expect(message).toBe('userconnect:abc-123:{"username":"john"}')
})

test('errors the connected source', async ({ loadExample, page }) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream-error', ({ client }) => {
        queueMicrotask(() => client.error())
      }),
    )
    await worker.start()
  })

  const readyState = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const source = new EventSource('http://localhost/stream-error')
      source.onerror = () => resolve(source.readyState)
      source.onopen = () => console.log('OPEN?')
    })
  })

  // EventSource must be closed.
  expect(readyState).toBe(2)

  /**
   * @note That erroring the stream does not throw any errors.
   */
})
