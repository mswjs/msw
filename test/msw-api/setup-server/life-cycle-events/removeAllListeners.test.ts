/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { createServer, ServerApi } from '@open-draft/test-server'

let httpServer: ServerApi
const server = setupServer()

beforeAll(async () => {
  httpServer = await createServer((app) => {
    app.get('/user', (req, res) => {
      res.status(500).end()
    })
  })

  server.use(
    rest.get(httpServer.http.makeUrl('/user'), (req, res, ctx) => {
      return res(ctx.json({ firstName: 'John' }))
    }),
  )
  server.listen()
})

afterEach(() => {
  jest.restoreAllMocks()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('removes all listeners attached to the server instance', async () => {
  const listeners = {
    requestStart: jest.fn(),
    requestEnd: jest.fn(),
  }
  server.events.on('request:start', listeners.requestStart)
  server.events.on('request:end', listeners.requestEnd)

  await fetch(httpServer.http.makeUrl('/user'))
  expect(listeners.requestStart).toHaveBeenCalledTimes(1)
  expect(listeners.requestEnd).toHaveBeenCalledTimes(1)
  listeners.requestStart.mockReset()
  listeners.requestEnd.mockReset()

  server.events.removeAllListeners()

  await fetch(httpServer.http.makeUrl('/user'))
  expect(listeners.requestStart).not.toHaveBeenCalled()
  expect(listeners.requestEnd).not.toHaveBeenCalled()
})

test('removes of the listeners by the event name', async () => {
  const listeners = {
    requestStart: jest.fn(),
    requestEnd: jest.fn(),
  }
  server.events.on('request:start', listeners.requestStart)
  server.events.on('request:start', listeners.requestStart)
  server.events.on('request:start', listeners.requestStart)
  server.events.on('request:end', listeners.requestEnd)
  server.events.removeAllListeners('request:start')

  await fetch(httpServer.http.makeUrl('/user'))
  expect(listeners.requestStart).not.toHaveBeenCalled()
  expect(listeners.requestEnd).toHaveBeenCalledTimes(1)
})

test('does not remove the internal listeners', async () => {
  const listeners = {
    requestStart: jest.fn(),
    responseMocked: jest.fn(),
  }

  server.events.on('request:start', listeners.requestStart)
  server.events.removeAllListeners()
  // The "response:*" events in Node.js are propagated from the interceptors library.
  // MSW adds an internal listener to react to those events from the interceptors.
  server.events.on('response:mocked', listeners.responseMocked)

  await fetch(httpServer.http.makeUrl('/user'))
  expect(listeners.requestStart).not.toHaveBeenCalled()
  expect(listeners.responseMocked).toHaveBeenCalledTimes(1)
})
