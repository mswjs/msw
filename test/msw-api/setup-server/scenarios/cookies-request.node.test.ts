// @vitest-environment node
import https from 'https'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { waitForClientRequest } from '../../../support/utils'

/**
 * Custom HTTPS agent that allows requests to the test server
 * that uses a self-signed certificate.
 */
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('exposes request cookies', async () => {
  await using httpServer = await createTestHttpServer({
    protocols: ['http', 'https'],
    defineRoutes(router) {
      router.get('/user', () => {
        return Response.json({ works: false })
      })
    },
  })
  const endpointUrl = httpServer.https.url('/user').href

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
