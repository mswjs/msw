// @vitest-environment node
import nodeHttp from 'http'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { waitForClientRequest } from '../../../support/utils'

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

test('returns a mocked response to an "http.get" request', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original-response', { status: 500 })
      })
    },
  })
  server.use(
    http.get(httpServer.http.url('/resource').href, () => {
      return HttpResponse.json(
        { firstName: 'John' },
        {
          status: 401,
          headers: {
            'x-header': 'yes',
          },
        },
      )
    }),
  )

  const request = nodeHttp.get(httpServer.http.url('/resource').href)
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

test('returns a mocked response to an "http.request" request', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original-response', { status: 500 })
      })
    },
  })
  server.use(
    http.get(httpServer.http.url('/resource').href, () => {
      return HttpResponse.json(
        { firstName: 'John' },
        {
          status: 401,
          headers: {
            'x-header': 'yes',
          },
        },
      )
    }),
  )

  const request = nodeHttp.request(httpServer.http.url('/resource').href)
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
