// @vitest-environment node
import { createTestHttpServer } from '@epic-web/test-server/http'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

beforeEach(() => {
  vi.spyOn(global.console, 'error').mockImplementation(() => void 0)
  vi.spyOn(global.console, 'warn').mockImplementation(() => void 0)
})

afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})

afterAll(() => {
  vi.restoreAllMocks()
  server.close()
})

test('errors on unhandled request when using the "error" strategy', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/user', () => {
        return Response.json({ original: true })
      })
    },
  })
  server.use(
    http.get(httpServer.http.url('/user').href, () => {
      return HttpResponse.json({ mocked: true })
    }),
  )

  const endpointUrl = httpServer.http.url('/').href
  const makeRequest = () => {
    return fetch(endpointUrl)
      .then(() => {
        expect.fail('Request must not succeed')
      })
      .catch<Error>((error) => {
        return error
      })
  }

  const requestError = await makeRequest()

  expect.soft(requestError).toBeInstanceOf(TypeError)
  expect.soft(requestError.message).toBe('fetch failed')

  // The network-level error that failed the request is
  // forwarded as the "cause" of the fetch rejection.
  expect.soft(requestError.cause).toMatchObject({
    message:
      '[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledFrame" option.',
  })

  expect(console.error)
    .toHaveBeenCalledWith(`[MSW] Error: intercepted a request without a matching request handler:

  • GET ${endpointUrl}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`)
  expect(console.warn).not.toHaveBeenCalled()
})

test('does not error on request which handler explicitly returns no mocked response', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/explicit-return', () => {
        return new Response(null, { status: 500 })
      })
    },
  })
  server.use(
    http.post(httpServer.http.url('/explicit-return').href, () => {
      // Short-circuiting in a handler makes it perform the request as-is,
      // but still treats this request as handled.
      return
    }),
  )

  const makeRequest = () => {
    return fetch(httpServer.http.url('/explicit-return'), {
      method: 'POST',
    })
  }
  await makeRequest()

  expect(console.error).not.toHaveBeenCalled()
})

test('does not error on request which handler implicitly returns no mocked response', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/implicit-return', () => {
        return new Response(null, { status: 500 })
      })
    },
  })
  server.use(
    http.post(httpServer.http.url('/implicit-return').href, () => {
      // The handler that has no return value so it falls through any
      // other matching handlers (whicbh are none). In the end,
      // the request is performed as-is and is still considered handled.
    }),
  )

  const makeRequest = () => {
    return fetch(httpServer.http.url('/implicit-return'), {
      method: 'POST',
    })
  }
  await makeRequest()

  expect(console.error).not.toHaveBeenCalled()
})

test(
  'ignores common static assets when using the "error" strategy',
  { timeout: 8000 },
  async () => {
    await fetch('http://localhost:3000/styles/main.css').catch(() => void 0)

    expect(console.error).not.toHaveBeenCalled()
  },
)
