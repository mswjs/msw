/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, rest } from 'msw'
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
    rest.get(httpServer.http.makeUrl('/user'), () => {
      return HttpResponse.json({ firstName: 'John' })
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

  await fetch(httpServer.http.makeUrl('/user'))
  expect(listeners.requestStart).not.toHaveBeenCalled()
  expect(listeners.requestEnd).toHaveBeenCalledTimes(1)
})
