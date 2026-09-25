// @vitest-environment node
import { HttpServer } from '@open-draft/test-server/http'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const httpServer = new HttpServer((app) => {
  app.get('/', (req, response) => {
    response.send('root')
  })
  app.get('/user', (req, response) => {
    response.json({ firstName: 'Miranda' })
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
  server.listen({ onUnhandledFrame: 'bypass' })

  vi.spyOn(global.console, 'error').mockImplementation(() => void 0)
  vi.spyOn(global.console, 'warn').mockImplementation(() => void 0)
})

afterAll(async () => {
  vi.restoreAllMocks()
  server.close()
  await httpServer.close()
})

test('bypasses unhandled requests', async () => {
  const response = await fetch(httpServer.http.url('/'))

  // Request should be performed as-is
  expect(response.status).toBe(200)
  expect(await response.text()).toEqual('root')

  // No warnings/errors should be printed
  expect(console.error).not.toBeCalled()
  expect(console.warn).not.toBeCalled()
})
