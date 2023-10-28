/**
 * @vitest-environment node
 */
import fetch from 'node-fetch'
import { HttpServer } from '@open-draft/test-server/http'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'

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

  jest.spyOn(global.console, 'error').mockImplementation()
  jest.spyOn(global.console, 'warn').mockImplementation()
})

afterAll(async () => {
  jest.restoreAllMocks()
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
