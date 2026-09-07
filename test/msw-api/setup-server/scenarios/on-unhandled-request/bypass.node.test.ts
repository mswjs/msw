/**
 * @vitest-environment node
 */
import { HttpServer } from '@open-draft/test-server/http'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const httpServer = new HttpServer((app) => {
  app.get('/', (req, res) => {
    res.send('root')
  })
  app.get('/user', (req, res) => {
    res.json({ firstName: 'Miranda' })
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
  server.listen({ onUnhandledRequest: 'bypass' })

  vi.spyOn(global.console, 'error').mockImplementation(() => void 0)
  vi.spyOn(global.console, 'warn').mockImplementation(() => void 0)
})

afterAll(async () => {
  vi.restoreAllMocks()
  server.close()
  await httpServer.close()
})

test('bypasses unhandled requests', async () => {
  const res = await fetch(httpServer.http.url('/'))

  // Request should be performed as-is
  expect(res.status).toBe(200)
  expect(await res.text()).toEqual('root')

  // No warnings/errors should be printed
  expect(console.error).not.toBeCalled()
  expect(console.warn).not.toBeCalled()
})
