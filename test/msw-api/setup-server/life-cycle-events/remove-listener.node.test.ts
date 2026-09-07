/**
 * @vitest-environment node
 */
import { HttpResponse, http } from 'msw'
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
    http.get(httpServer.http.url('/user'), () => {
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
    requestStart: vi.fn(),
    requestEnd: vi.fn(),
  }
  server.events.on('request:start', listeners.requestStart)
  server.events.on('request:end', listeners.requestEnd)

  server.events.removeListener('request:start', listeners.requestStart)

  await fetch(httpServer.http.url('/user'))
  expect(listeners.requestStart).not.toHaveBeenCalled()
  expect(listeners.requestEnd).toHaveBeenCalledTimes(1)
})
