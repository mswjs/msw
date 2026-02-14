import { sse } from 'msw'
import { setupWorker } from 'msw/browser'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

globalThis.console = new Proxy(globalThis.console, {
  apply(target, thisArg, argArray) {
    process.stdout.write('console called!')
    process.stdout.write(new Error().stack!)
    return Reflect.apply(target as any, thisArg, argArray)
  },
})

test('makes the actual request when called "server.connect()"', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/stream', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('data: {"message": "hello"}\n\n'),
            )
            controller.close()
          },
        })

        return new Response(stream, {
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          },
        })
      })
    },
  })
  const url = server.http.url('/stream').href

  await page.evaluate(async (url) => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse(url, ({ server }) => {
        // Calling "server.connect()" establishes the actual connection.
        server.connect()
      }),
    )
    await worker.start()
  }, url)

  const openPromise = page.evaluate((url) => {
    return new Promise<void>((resolve, reject) => {
      const source = new EventSource(url)
      source.onopen = () => resolve()
      source.onerror = () => reject(new Error('EventSource connection failed'))
    })
  }, url)

  await expect(openPromise).resolves.toBeUndefined()
})

test('forwards message event from the server to the client automatically', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/stream', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('data: {"message": "hello"}\n\n'),
            )
          },
        })

        return new Response(stream, {
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          },
        })
      })
    },
  })
  const url = server.http.url('/stream').href

  await page.evaluate(async (url) => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse(url, ({ server }) => {
        server.connect()
      }),
    )
    await worker.start()
  }, url)

  const message = await page.evaluate((url) => {
    return new Promise<{ message: string }>((resolve, reject) => {
      const source = new EventSource(url)
      source.addEventListener('message', (event) => {
        resolve(JSON.parse(event.data))
      })
      source.onerror = () => reject(new Error('EventSource connection failed'))
    })
  }, url)

  expect(message).toEqual({ message: 'hello' })
})

test('forwards custom event from the server to the client automatically', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/stream', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'event: custom\ndata: {"message": "hello"}\n\n',
              ),
            )
          },
        })

        return new Response(stream, {
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          },
        })
      })
    },
  })
  const url = server.http.url('/stream').href

  await page.evaluate(async (url) => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse(url, ({ server }) => {
        server.connect()
      }),
    )
    await worker.start()
  }, url)

  const message = await page.evaluate((url) => {
    return new Promise<{ message: string }>((resolve, reject) => {
      const source = new EventSource(url)
      source.addEventListener('custom', (event) => {
        resolve(JSON.parse(event.data))
      })
      source.onerror = () => reject(new Error('EventSource connection failed'))
    })
  }, url)

  expect(message).toEqual({ message: 'hello' })
})

test('forwards error event from the server to the client automatically', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/stream', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.error()
          },
        })

        return new Response(stream, {
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          },
        })
      })
    },
  })
  const url = server.http.url('/stream').href

  await page.evaluate(async (url) => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse(url, ({ server }) => {
        server.connect()
      }),
    )
    await worker.start()
  }, url)

  const errorPromise = page.evaluate((url) => {
    return new Promise<void>((resolve, reject) => {
      const source = new EventSource(url)
      source.onerror = () => resolve()
      source.onmessage = () => reject(new Error('Must not receive a message'))
    })
  }, url)

  await expect(errorPromise).resolves.toBeUndefined()
})

test('forward custom stream errors from the original server to the client automatically', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/stream', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.error(new Error('Custom stream error'))
          },
        })

        return new Response(stream, {
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          },
        })
      })
    },
  })
  const url = server.http.url('/stream').href

  await page.evaluate(async (url) => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse(url, ({ server }) => {
        server.connect()
      }),
    )
    await worker.start()
  }, url)

  const errorPromise = page.evaluate((url) => {
    return new Promise<void>((resolve, reject) => {
      const source = new EventSource(url)
      source.onerror = () => resolve()
      source.onmessage = () => {
        reject(new Error('Must not receive a message'))
      }
    })
  }, url)

  await expect(errorPromise).resolves.toBeUndefined()
})
