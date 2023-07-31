/**
 * @jest-environment node
 */
import https from 'https'
import { http, HttpResponse } from 'msw'
import { setupServer, SetupServerApi } from 'msw/node'
import { httpsAgent, HttpServer } from '@open-draft/test-server/http'
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
  const endpointUrl = httpServer.https.url('/user')

  server.use(
    http.get(endpointUrl, ({ cookies }) => {
      return HttpResponse.json({ cookies })
    }),
  )

  const url = new URL(endpointUrl)

  const request = https.get({
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    port: url.port,
    headers: {
      Cookie: 'auth-token=abc-123',
    },
    agent: httpsAgent,
  })
  const { responseText } = await waitForClientRequest(request)

  expect(responseText).toBe('{"cookies":{"auth-token":"abc-123"}}')
})
