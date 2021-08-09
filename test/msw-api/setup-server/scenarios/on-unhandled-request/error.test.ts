/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { createServer, ServerApi } from '@open-draft/test-server'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

let httpServer: ServerApi
const server = setupServer()

beforeAll(async () => {
  httpServer = await createServer((app) => {
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

  server.use(
    rest.get(httpServer.http.makeUrl('/user'), (req, res, ctx) => {
      return res(ctx.json({ mocked: true }))
    }),
    rest.post(httpServer.http.makeUrl('/explicit-return'), () => {
      // Short-circuiting in a handler makes it perform the request as-is,
      // but still treats this request as handled.
      return
    }),
    rest.post(httpServer.http.makeUrl('/implicit-return'), () => {
      // The handler that has no return also performs the request as-is,
      // still treating this request as handled.
    }),
  )
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  jest.spyOn(global.console, 'error').mockImplementation()
  jest.spyOn(global.console, 'warn').mockImplementation()
})

afterEach(() => {
  jest.resetAllMocks()
})

afterAll(async () => {
  jest.restoreAllMocks()
  server.close()
  await httpServer.close()
})

test('errors on unhandled request when using the "error" value', async () => {
  const endpointUrl = httpServer.http.makeUrl('/')
  const makeRequest = () => fetch(endpointUrl)

  await expect(() => makeRequest()).rejects.toThrow(
    `request to ${endpointUrl} failed, reason: Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.`,
  )
  expect(console.error)
    .toHaveBeenCalledWith(`[MSW] Error: captured a request without a matching request handler:

  • GET ${endpointUrl}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
  expect(console.warn).not.toHaveBeenCalled()
})

test('does not error on request which handler explicitly returns no mocked response', async () => {
  const makeRequest = () => {
    return fetch(httpServer.http.makeUrl('/explicit-return'), {
      method: 'POST',
    })
  }
  await makeRequest()

  expect(console.error).not.toHaveBeenCalled()
})

test('does not error on request which handler implicitly returns no mocked response', async () => {
  const makeRequest = () => {
    return fetch(httpServer.http.makeUrl('/implicit-return'), {
      method: 'POST',
    })
  }
  await makeRequest()

  expect(console.error).not.toHaveBeenCalled()
})
