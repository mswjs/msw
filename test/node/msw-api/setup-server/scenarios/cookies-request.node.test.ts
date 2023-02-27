/**
 * @jest-environment node
 */
import https from 'https'
import { rest, HttpResponse } from 'msw'
import { setupServer, SetupServerApi } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'
import { waitForClientRequest } from '../../../../support/utils'

const httpServer = new HttpServer((app) => {
  app.get('/user', (req, res) => {
    res.json({ works: false })
  })
})

const server = setupServer()

beforeAll(async () => {
  await httpServer.listen()
  server.listen()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('has access to request cookies', async () => {
  server.use(
    rest.get(httpServer.https.url('/user'), ({ cookies }) => {
      return HttpResponse.json({ cookies })
    }),
  )

  const url = new URL(httpServer.https.url('/user'))

  const request = https.get({
    protocol: url.protocol,
    host: url.host,
    path: url.pathname,
    headers: {
      Cookie: 'auth-token=abc-123',
    },
  })
  const { responseText } = await waitForClientRequest(request)

  expect(responseText).toBe('{"cookies":{"auth-token":"abc-123"}}')
})
