/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'

const httpServer = new HttpServer((app) => {
  app.get('/user', (req, res) => {
    res.status(500).end()
  })
})

const server = setupServer()

beforeAll(async () => {
  await httpServer.listen()

  server.use(
    rest.get(httpServer.http.url('/user'), (req, res, ctx) => {
      return res(ctx.json({ firstName: 'John' }))
    }),
  )
  server.listen()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('removes a listener by the event name', async () => {
  const listeners = {
    requestStart: jest.fn(),
    requestEnd: jest.fn(),
  }
  server.events.on('request:start', listeners.requestStart)
  server.events.on('request:end', listeners.requestEnd)

  server.events.removeListener('request:start', listeners.requestStart)

  await fetch(httpServer.http.url('/user'))
  expect(listeners.requestStart).not.toHaveBeenCalled()
  expect(listeners.requestEnd).toHaveBeenCalledTimes(1)
})
