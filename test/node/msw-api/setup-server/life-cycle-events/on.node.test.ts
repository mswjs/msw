/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'
import { waitFor } from '../../../../support/waitFor'

const httpServer = new HttpServer((app) => {
  app.get('/user', (req, res) => res.status(500).end())
  app.post('/no-response', (req, res) => res.send('original-response'))
  app.get('/unknown-route', (req, res) => res.send('majestic-unknown'))
})

const server = setupServer()

const listener = jest.fn()

function getRequestId(requestStartListener: jest.Mock) {
  const { calls } = requestStartListener.mock
  const requestStartCall = calls.find((call) => {
    return call[0].startsWith('[request:start]')
  })

  return requestStartCall[0].split(' ')[3]
}

beforeAll(async () => {
  await httpServer.listen()

  server.use(
    rest.get(httpServer.http.url('/user'), (req, res, ctx) => {
      return res(ctx.text('response-body'))
    }),
    rest.post(httpServer.http.url('/no-response'), () => {
      return
    }),
    rest.get(httpServer.http.url('/unhandled-exception'), () => {
      throw new Error('Unhandled resolver error')
    }),
  )
  server.listen()

  server.events.on('request:start', (req) => {
    listener(`[request:start] ${req.method} ${req.url.href} ${req.id}`)
  })

  server.events.on('request:match', (req) => {
    listener(`[request:match] ${req.method} ${req.url.href} ${req.id}`)
  })

  server.events.on('request:unhandled', (req) => {
    listener(`[request:unhandled] ${req.method} ${req.url.href} ${req.id}`)
  })

  server.events.on('request:end', (req) => {
    listener(`[request:end] ${req.method} ${req.url.href} ${req.id}`)
  })

  server.events.on('response:mocked', (res, requestId) => {
    listener(`[response:mocked] ${res.body} ${requestId}`)
  })

  server.events.on('response:bypass', (res, requestId) => {
    listener(`[response:bypass] ${res.body} ${requestId}`)
  })

  server.events.on('unhandledException', (error, req) => {
    listener(
      `[unhandledException] ${req.method} ${req.url.href} ${req.id} ${error.message}`,
    )
  })
})

beforeEach(() => {
  // Supress "Expected a mocking resolver function to return a mocked response"
  // warnings. Using intentional explicit empty resolver.
  jest.spyOn(global.console, 'warn').mockImplementation()
})

afterEach(() => {
  jest.restoreAllMocks()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('emits events for a handler request and mocked response', async () => {
  const url = httpServer.http.url('/user')
  await fetch(url)
  const requestId = getRequestId(listener)

  expect(listener).toHaveBeenNthCalledWith(
    1,
    `[request:start] GET ${url} ${requestId}`,
  )
  expect(listener).toHaveBeenNthCalledWith(
    2,
    `[request:match] GET ${url} ${requestId}`,
  )
  expect(listener).toHaveBeenNthCalledWith(
    3,
    `[request:end] GET ${url} ${requestId}`,
  )
  expect(listener).toHaveBeenNthCalledWith(
    4,
    `[response:mocked] response-body ${requestId}`,
  )
  expect(listener).toHaveBeenCalledTimes(4)
})

test('emits events for a handled request with no response', async () => {
  const url = httpServer.http.url('/no-response')
  await fetch(url, { method: 'POST' })
  const requestId = getRequestId(listener)

  await waitFor(() => {
    expect(listener).toHaveBeenCalledWith(
      expect.stringContaining('[response:bypass]'),
    )
  })

  expect(listener).toHaveBeenNthCalledWith(
    1,
    `[request:start] POST ${url} ${requestId}`,
  )
  expect(listener).toHaveBeenNthCalledWith(
    2,
    `[request:end] POST ${url} ${requestId}`,
  )
  expect(listener).toHaveBeenNthCalledWith(
    3,
    `[response:bypass] original-response ${requestId}`,
  )
  expect(listener).toHaveBeenCalledTimes(3)
})

test('emits events for an unhandled request', async () => {
  const url = httpServer.http.url('/unknown-route')
  await fetch(url)
  const requestId = getRequestId(listener)

  await waitFor(() => {
    expect(listener).toHaveBeenCalledWith(
      expect.stringContaining('[response:bypass]'),
    )
  })

  expect(listener).toHaveBeenNthCalledWith(
    1,
    `[request:start] GET ${url} ${requestId}`,
  )
  expect(listener).toHaveBeenNthCalledWith(
    2,
    `[request:unhandled] GET ${url} ${requestId}`,
  )
  expect(listener).toHaveBeenNthCalledWith(
    3,
    `[request:end] GET ${url} ${requestId}`,
  )
  expect(listener).toHaveBeenNthCalledWith(
    4,
    `[response:bypass] majestic-unknown ${requestId}`,
  )
})

test('emits unhandled exceptions in the request handler', async () => {
  const url = httpServer.http.url('/unhandled-exception')
  await fetch(url).catch(() => undefined)
  const requestId = getRequestId(listener)

  expect(listener).toHaveBeenCalledWith(
    `[unhandledException] GET ${url} ${requestId} Unhandled resolver error`,
  )
})

test('stops emitting events once the server is stopped', async () => {
  server.close()
  await fetch(httpServer.http.url('/user'))

  expect(listener).not.toHaveBeenCalled()
})
