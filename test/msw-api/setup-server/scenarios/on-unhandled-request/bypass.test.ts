/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { createServer, ServerApi } from '@open-draft/test-server'
import { setupServer } from 'msw/node'
import { HttpResponse, rest } from 'msw'

let httpServer: ServerApi
const server = setupServer()

beforeAll(async () => {
  httpServer = await createServer((app) => {
    app.get('/', (req, res) => {
      res.send('root')
    })
    app.get('/user', (req, res) => {
      res.json({ firstName: 'Miranda' })
    })
  })

  server.use(
    rest.get(httpServer.http.makeUrl('/user'), () => {
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
  const res = await fetch(httpServer.http.makeUrl('/'))

  // Request should be performed as-is
  expect(res.status).toEqual(200)
  expect(await res.text()).toEqual('root')

  // No warnings/errors should be printed
  expect(console.error).not.toBeCalled()
  expect(console.warn).not.toBeCalled()
})
