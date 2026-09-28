// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { type SetupServer, setupServer } from 'msw/node'
import { createTestHttpServer } from '@epic-web/test-server/http'

const server = setupServer()

function spyOnEvents(server: SetupServer) {
  const listener = vi.fn()
  const wrapListener = (eventName: string, listener: any) => {
    return (...args: Array<unknown>) => listener(eventName, ...args)
  }

  server.events.on('request:start', wrapListener('request:start', listener))
  server.events.on('request:match', wrapListener('request:match', listener))
  server.events.on(
    'request:unhandled',
    wrapListener('request:unhandled', listener),
  )
  server.events.on('request:end', wrapListener('request:end', listener))
  server.events.on('response:mocked', wrapListener('response:mocked', listener))
  server.events.on('response:bypass', wrapListener('response:bypass', listener))
  server.events.on(
    'unhandledException',
    wrapListener('unhandledException', listener),
  )

  return listener
}

beforeAll(async () => {
  // Supress "Expected a mocking resolver function to return a mocked response"
  // warnings when hitting intentionally empty resolver.
  vi.spyOn(global.console, 'warn').mockImplementation(() => void 0)

  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('emits events for a handled request and mocked response', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/user', () => {
        return new Response(null, { status: 500 })
      })
    },
  })
  const url = httpServer.http.url('/user').href
  server.use(
    http.get(url, () => {
      return HttpResponse.text('response-body')
    }),
  )

  const listener = spyOnEvents(server)
  await fetch(url)

  expect(listener).toHaveBeenNthCalledWith(
    1,
    'request:start',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId: expect.any(String),
    }),
  )

  const { requestId } = listener.mock.calls[0][1]

  expect(listener).toHaveBeenNthCalledWith(
    2,
    'request:match',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId,
    }),
  )
  expect(listener).toHaveBeenNthCalledWith(
    3,
    'request:end',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId,
    }),
  )
  expect(listener).toHaveBeenNthCalledWith(
    4,
    'response:mocked',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId,
      response: expect.objectContaining({ status: 200 }),
    }),
  )

  const { response } = listener.mock.calls[3][1]
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  await expect(response.text()).resolves.toBe('response-body')

  expect(listener).toHaveBeenCalledTimes(4)
})

test('emits events for a handled request with no response', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/no-response', () => {
        return new Response('original-response')
      })
    },
  })
  const url = httpServer.http.url('/no-response').href
  server.use(
    http.post(url, () => {
      return
    }),
  )

  const listener = spyOnEvents(server)
  await fetch(url, { method: 'POST' })

  expect(listener).toHaveBeenNthCalledWith(
    1,
    'request:start',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'POST',
        url,
      }),
      requestId: expect.any(String),
    }),
  )

  const { requestId } = listener.mock.calls[0][1]

  expect(listener).toHaveBeenNthCalledWith(
    2,
    'request:match',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'POST',
        url,
      }),
      requestId,
    }),
  )
  expect(listener).toHaveBeenNthCalledWith(
    3,
    'request:end',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'POST',
        url,
      }),
      requestId,
    }),
  )
  expect(listener).toHaveBeenNthCalledWith(
    4,
    'response:bypass',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'POST',
        url,
      }),
      requestId,
      response: expect.objectContaining({ status: 200 }),
    }),
  )

  const { response } = listener.mock.calls[3][1]
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  await expect(response.text()).resolves.toBe('original-response')

  expect(listener).toHaveBeenCalledTimes(4)
})

test('emits events for an unhandled request', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/unknown-route', () => {
        return new Response('majestic-unknown')
      })
    },
  })
  const url = httpServer.http.url('/unknown-route').href

  const listener = spyOnEvents(server)
  await fetch(url)

  expect(listener).toHaveBeenNthCalledWith(
    1,
    'request:start',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId: expect.any(String),
    }),
  )

  const { requestId } = listener.mock.calls[0][1]

  expect(listener).toHaveBeenNthCalledWith(
    2,
    'request:unhandled',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId,
    }),
  )
  expect(listener).toHaveBeenNthCalledWith(
    3,
    'request:end',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId,
    }),
  )

  expect(listener).toHaveBeenNthCalledWith(
    4,
    'response:bypass',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId,
      response: expect.objectContaining({ status: 200 }),
    }),
  )

  const { response } = listener.mock.calls[3][1]
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  await expect(response.text()).resolves.toBe('majestic-unknown')

  expect(listener).toHaveBeenCalledTimes(4)
})

test('emits unhandled exceptions in the request handler', async () => {
  await using httpServer = await createTestHttpServer()
  const url = httpServer.http.url('/unhandled-exception').href
  server.use(
    http.get(url, () => {
      throw new Error('Unhandled resolver error')
    }),
  )

  const listener = spyOnEvents(server)
  await fetch(url).catch(() => undefined)

  expect(listener).toHaveBeenNthCalledWith(
    1,
    'request:start',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId: expect.any(String),
    }),
  )

  const { requestId } = listener.mock.calls[0][1]

  expect(listener).toHaveBeenNthCalledWith(
    2,
    'unhandledException',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId,
      error: new Error('Unhandled resolver error'),
    }),
  )

  /**
   * @note The fallback 500 response still counts as a mocked response.
   * I'm torn on this but I believe we should indicate that the request
   * (a) received a response; (b) that response was mocked.
   */
  expect(listener).toHaveBeenNthCalledWith(
    3,
    'response:mocked',
    expect.objectContaining({
      request: expect.objectContaining({
        method: 'GET',
        url,
      }),
      requestId,
      response: expect.objectContaining({ status: 500 }),
    }),
  )

  const { response } = listener.mock.calls[2][1]
  expect(response.status).toBe(500)
  expect(response.statusText).toBe('Unhandled Exception')

  expect(listener).toHaveBeenCalledTimes(3)
})

test('stops emitting events once the server is stopped', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/user', () => {
        return new Response(null, { status: 500 })
      })
    },
  })

  const listener = spyOnEvents(server)
  server.close()

  await fetch(httpServer.http.url('/user'))

  expect(listener).not.toHaveBeenCalled()

  // Restore the server so the "afterAll" hook can close it.
  server.listen()
})
