import { setupWorker, sse } from 'msw/browser'
import { HttpServer } from '@open-draft/test-server/http'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const httpServer = new HttpServer((app) => {
  app.get('/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    res.write('data: {"message": "hello"}\n\n')
  })
})

test.beforeAll(async () => {
  await httpServer.listen()
})

test.afterAll(async () => {
  await httpServer.close()
})

test('sends a mock message event', async ({ loadExample, page }) => {
  await loadExample(require.resolve('./sse.mocks.ts'), {
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
    return new Promise((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.addEventListener('message', (event) => {
        resolve(`${event.type}:${event.data}`)
      })
      source.onerror = reject
    })
  })

  expect(message).toBe('message:{"username":"john"}')
})

test('sends a mock custom event', async ({ loadExample, page }) => {
  await loadExample(require.resolve('./sse.mocks.ts'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          event: 'userconnect',
          data: { username: 'john' },
        })
      }),
    )
    await worker.start()
  })

  const message = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.addEventListener('userconnect', (event) => {
        resolve(`${event.type}:${event.data}`)
      })
      source.onerror = reject
    })
  })

  expect(message).toEqual('userconnect:{"username":"john"}')
})

test('sends a mock message event with custom id', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./sse.mocks.ts'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          id: 'abc-123',
          event: 'userconnect',
          data: { username: 'john' },
        })
      }),
    )
    await worker.start()
  })

  const message = await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.addEventListener('userconnect', (event) => {
        console.log(event)
        resolve(`${event.type}:${event.lastEventId}:${event.data}`)
      })
      source.onerror = reject
    })
  })

  expect(message).toBe('userconnect:abc-123:{"username":"john"}')
})

test('errors the connected source', async ({ loadExample, page, waitFor }) => {
  await loadExample(require.resolve('./sse.mocks.ts'), {
    skipActivation: true,
  })

  const pageErrors: Array<string> = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        queueMicrotask(() => client.error())
      }),
    )
    await worker.start()
  })

  const readyState = await page.evaluate(() => {
    return new Promise((resolve) => {
      const source = new EventSource('http://localhost/stream')
      source.addEventListener('error', (event) => {
        console.log('ERROR!', event, source.readyState)
        resolve(source.readyState)
      })
    })
  })

  // EventSource must be closed.
  expect(readyState).toBe(2)

  await waitFor(() => {
    // Must error with "Failed to fetch" (default EventSource behavior).
    expect(pageErrors).toContain('Failed to fetch')
  })
})

test.only('forwards original server message events to the client', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./sse.mocks.ts'), {
    skipActivation: true,
  })
  const url = httpServer.http.url('/stream')

  await page.evaluate(async (url) => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse(url, async ({ server }) => {
        const source = server.connect()

        source.addEventListener('message', (event) => {
          event.preventDefault()
        })
      }),
    )
    await worker.start()
  }, url)

  await page.evaluate((url) => {
    const source = new EventSource(url)
    source.addEventListener('message', (event) => {
      console.warn('client received:', event)
    })
  }, url)

  await page.pause()
})
