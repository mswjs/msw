// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { createTestHttpServer } from '@epic-web/test-server/http'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

afterAll(() => {
  server.close()
})

test('removes all listeners attached to the server instance', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/user', () => {
        return new Response(null, { status: 500 })
      })
    },
  })

  server.use(
    http.get(httpServer.http.url('/user').href, () => {
      return HttpResponse.json({ firstName: 'John' })
    }),
  )

  const listeners = {
    requestStart: vi.fn(),
    requestEnd: vi.fn(),
  }
  server.events.on('request:start', listeners.requestStart)
  server.events.on('request:end', listeners.requestEnd)

  await fetch(httpServer.http.url('/user'))
  expect(listeners.requestStart).toHaveBeenCalledTimes(1)
  expect(listeners.requestEnd).toHaveBeenCalledTimes(1)
  listeners.requestStart.mockReset()
  listeners.requestEnd.mockReset()

  server.events.removeAllListeners()

  await fetch(httpServer.http.url('/user'))
  expect(listeners.requestStart).not.toHaveBeenCalled()
  expect(listeners.requestEnd).not.toHaveBeenCalled()
})

test('removes all the listeners by the event name', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/user', () => {
        return new Response(null, { status: 500 })
      })
    },
  })

  server.use(
    http.get(httpServer.http.url('/user').href, () => {
      return HttpResponse.json({ firstName: 'John' })
    }),
  )

  const listeners = {
    requestStart: vi.fn(),
    requestEnd: vi.fn(),
  }
  server.events.on('request:start', listeners.requestStart)
  server.events.on('request:start', listeners.requestStart)
  server.events.on('request:start', listeners.requestStart)
  server.events.on('request:end', listeners.requestEnd)
  server.events.removeAllListeners('request:start')

  await fetch(httpServer.http.url('/user'))
  expect(listeners.requestStart).not.toHaveBeenCalled()
  expect(listeners.requestEnd).toHaveBeenCalledTimes(1)
})

test('does not remove the internal listeners', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/user', () => {
        return new Response(null, { status: 500 })
      })
    },
  })

  server.use(
    http.get(httpServer.http.url('/user').href, () => {
      return HttpResponse.json({ firstName: 'John' })
    }),
  )

  const listeners = {
    requestStart: vi.fn(),
    responseMocked: vi.fn(),
  }

  server.events.on('request:start', listeners.requestStart)
  server.events.removeAllListeners()
  // The "response:*" events in Node.js are propagated from the interceptors library.
  // MSW adds an internal listener to react to those events from the interceptors.
  server.events.on('response:mocked', listeners.responseMocked)

  await fetch(httpServer.http.url('/user'))
  expect(listeners.requestStart).not.toHaveBeenCalled()
  expect(listeners.responseMocked).toHaveBeenCalledTimes(1)
})
