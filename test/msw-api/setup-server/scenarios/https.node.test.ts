// @vitest-environment node
import https from 'https'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
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

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('returns a mocked response to an "https.get" request', async () => {
  await using httpServer = await createTestHttpServer({
    protocols: ['http', 'https'],
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original-response', { status: 500 })
      })
    },
  })
  server.use(
    http.get(httpServer.https.url('/resource').href, () => {
      return HttpResponse.json(
        {
          firstName: 'John',
        },
        {
          status: 401,
          headers: {
            'X-Header': 'yes',
          },
        },
      )
    }),
  )

  const request = https.get(httpServer.https.url('/resource'), {
    agent: httpsAgent,
  })
  const { response, responseText } = await waitForClientRequest(request)

  expect(response.statusCode).toBe(401)
  expect(response.headers).toEqual(
    expect.objectContaining({
      'content-type': 'application/json',
      'x-header': 'yes',
    }),
  )
  expect(responseText).toBe('{"firstName":"John"}')
})

test('returns a mocked response to an "https.request" request', async () => {
  await using httpServer = await createTestHttpServer({
    protocols: ['http', 'https'],
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original-response', { status: 500 })
      })
    },
  })
  server.use(
    http.get(httpServer.https.url('/resource').href, () => {
      return HttpResponse.json(
        {
          firstName: 'John',
        },
        {
          status: 401,
          headers: {
            'X-Header': 'yes',
          },
        },
      )
    }),
  )

  const request = https.request(httpServer.https.url('/resource'), {
    agent: httpsAgent,
  })
  request.end()
  const { response, responseText } = await waitForClientRequest(request)

  expect(response.statusCode).toBe(401)
  expect(response.headers).toEqual(
    expect.objectContaining({
      'content-type': 'application/json',
      'x-header': 'yes',
    }),
  )
  expect(responseText).toBe('{"firstName":"John"}')
})
