/**
 * @vitest-environment node
 */
import { HttpServer } from '@open-draft/test-server/http'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const httpServer = new HttpServer((app) => {
  app.get('/user', (req, res) => {
    res.status(200).json({ original: true })
  })
  app.post('/explicit-return', (req, res) => {
    res.status(500).end()
  })
  app.post('/implicit-return', (req, res) => {
    res.status(500).end()
  })
})
const server = setupServer()

beforeAll(async () => {
  await httpServer.listen()

  server.use(
    http.get(httpServer.http.url('/user'), () => {
      return HttpResponse.json({ mocked: true })
    }),
    http.post(httpServer.http.url('/explicit-return'), () => {
      // Short-circuiting in a handler makes it perform the request as-is,
      // but still treats this request as handled.
      return
    }),
    http.post(httpServer.http.url('/implicit-return'), () => {
      // The handler that has no return value so it falls through any
      // other matching handlers (whicbh are none). In the end,
      // the request is performed as-is and is still considered handled.
    }),
  )
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  vi.spyOn(global.console, 'error').mockImplementation(() => void 0)
  vi.spyOn(global.console, 'warn').mockImplementation(() => void 0)
})

afterEach(() => {
  vi.resetAllMocks()
})

afterAll(async () => {
  vi.restoreAllMocks()
  server.close()
  await httpServer.close()
})

test('errors on unhandled request when using the "error" strategy', async () => {
  const endpointUrl = httpServer.http.url('/')
  const makeRequest = () => {
    return fetch(endpointUrl)
      .then(() => {
        throw new Error('Must not resolve')
      })
      .catch<Error>((error) => {
        return error
      })
  }

  const requestError = await makeRequest()

  expect(requestError).toEqual(
    new Error(
      '[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.',
    ),
  )

  expect(console.error)
    .toHaveBeenCalledWith(`[MSW] Error: intercepted a request without a matching request handler:

  • GET ${endpointUrl}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
  expect(console.warn).not.toHaveBeenCalled()
})

test('does not error on request which handler explicitly returns no mocked response', async () => {
  const makeRequest = () => {
    return fetch(httpServer.http.url('/explicit-return'), {
      method: 'POST',
    })
  }
  await makeRequest()

  expect(console.error).not.toHaveBeenCalled()
})

test('does not error on request which handler implicitly returns no mocked response', async () => {
  const makeRequest = () => {
    return fetch(httpServer.http.url('/implicit-return'), {
      method: 'POST',
    })
  }
  await makeRequest()

  expect(console.error).not.toHaveBeenCalled()
})
