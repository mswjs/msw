// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { createTestHttpServer } from '@epic-web/test-server/http'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('removes a listener by the event name', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/user', () => {
        return new Response(null, { status: 500 })
      })
    },
  })
  server.use(
    http.get(httpServer.http.url('/user').href, () => {
      return HttpResponse.json({ firstName: 'John' })
    }),
  )

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
