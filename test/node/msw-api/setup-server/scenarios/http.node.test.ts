/**
 * @jest-environment node
 */
import nodeHttp from 'http'
import { HttpServer } from '@open-draft/test-server/http'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { waitForClientRequest } from '../../../../support/utils'

const httpServer = new HttpServer((app) => {
  app.get('/resource', (_, res) => {
    return res.status(500).send('original-response')
  })
})

const server = setupServer()

beforeAll(async () => {
  await httpServer.listen()
  server.listen()
})

beforeEach(() => {
  server.use(
    http.get(httpServer.http.url('/resource'), () => {
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
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

it('returns a mocked response to an "http.get" request', async () => {
  const request = nodeHttp.get(httpServer.http.url('/resource'))
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

it('returns a mocked response to an "http.request" request', async () => {
  const request = nodeHttp.request(httpServer.http.url('/resource'))
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
