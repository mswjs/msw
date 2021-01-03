/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { sleep } from '../../support/utils'

const server = setupServer(
  rest.get('https://mswjs.io/user', (req, res, ctx) => {
    return res(ctx.text('response-body'))
  }),
  rest.post('https://mswjs.io/no-response', () => {
    return
  }),
)

const listener = jest.fn()

function getRequestId(requestStartListener: jest.Mock) {
  const { calls } = requestStartListener.mock
  const requestStartCall = calls.find((call) => {
    return call[0].startsWith('[request:start]')
  })

  return requestStartCall[0].split(' ')[3]
}

beforeAll(() => {
  server.listen()

  server.on('request:start', (req) => {
    listener(`[request:start] ${req.method} ${req.url.href} ${req.id}`)
  })

  server.on('request:match', (req) => {
    listener(`[request:match] ${req.method} ${req.url.href} ${req.id}`)
  })

  server.on('request:unhandled', (req) => {
    listener(`[request:unhandled] ${req.method} ${req.url.href} ${req.id}`)
  })

  server.on('request:end', (req) => {
    listener(`[request:end] ${req.method} ${req.url.href} ${req.id}`)
  })

  server.on('response:mocked', (res, reqId) => {
    listener(`[response:mocked] ${res.body} ${reqId}`)
  })

  server.on('response:bypass', (res, reqId) => {
    listener(`[response:bypass] ${res.headers.server} ${reqId}`)
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

afterAll(() => {
  server.close()
})

test('emits events for a handler request and mocked response', async () => {
  await fetch('https://mswjs.io/user')
  const requestId = getRequestId(listener)

  expect(listener.mock.calls).toEqual([
    [`[request:start] GET https://mswjs.io/user ${requestId}`],
    [`[request:match] GET https://mswjs.io/user ${requestId}`],
    [`[request:end] GET https://mswjs.io/user ${requestId}`],
    [`[response:mocked] response-body ${requestId}`],
  ])
})

test('emits events for a handled request with no response', async () => {
  await fetch('https://mswjs.io/no-response', { method: 'POST' })
  const requestId = getRequestId(listener)
  await sleep(500)

  expect(listener.mock.calls).toEqual([
    [`[request:start] POST https://mswjs.io/no-response ${requestId}`],
    [`[request:unhandled] POST https://mswjs.io/no-response ${requestId}`],
    [`[request:end] POST https://mswjs.io/no-response ${requestId}`],
    [`[response:bypass] Vercel ${requestId}`],
  ])
})

test('emits events for an unhandled request', async () => {
  await fetch('https://mswjs.io/unknown-route')
  const requestId = getRequestId(listener)

  expect(listener.mock.calls).toEqual([
    [`[request:start] GET https://mswjs.io/unknown-route ${requestId}`],
    [`[request:unhandled] GET https://mswjs.io/unknown-route ${requestId}`],
    [`[request:end] GET https://mswjs.io/unknown-route ${requestId}`],
  ])
})

test('stops emitting events once the server is stopped', async () => {
  server.close()
  await fetch('https://mswjs.io/user')

  expect(listener.mock.calls).toEqual([])
})
