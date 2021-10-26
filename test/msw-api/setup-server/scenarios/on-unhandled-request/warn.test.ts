/**
 * @jest-environment node
 */
import * as http from 'http'
import fetch from 'node-fetch'
import { setupServer } from 'msw/node'
import { ServerApi, createServer, httpsAgent } from '@open-draft/test-server'

const server = setupServer()
let httpServer: ServerApi

beforeAll(async () => {
  httpServer = await createServer((app) => {
    app.get('/resource', (req, res) => {
      res.status(500).end()
    })
  })

  server.listen({ onUnhandledRequest: 'warn' })
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

test('warns on unhandled request made via "node-fetch"', async () => {
  const url = httpServer.https.makeUrl('/resource')
  await fetch(url, { agent: httpsAgent })

  expect(console.warn).toHaveBeenCalledTimes(1)
  expect(console.warn).toHaveBeenCalledWith(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET ${url}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)
})

test('warns on unhandled requests made via "http"', (done) => {
  const url = httpServer.http.makeUrl('/resource')
  http.get(url, () => {
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET ${url}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`)

    done()
  })
})
