/**
 * @jest-environment node
 */
import http from 'http'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'
import { ServerApi, createServer } from '@open-draft/test-server'
import { waitForClientRequest } from '../../../support/utils'

let httpServer: ServerApi
const server = setupServer()

beforeAll(async () => {
  server.listen()

  httpServer = await createServer((app) => {
    app.get('/resource', (_, res) => {
      return res.status(500).send('original-response')
    })
  })
})

beforeEach(() => {
  server.use(
    rest.get(httpServer.http.makeUrl('/resource'), () => {
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
  const request = http.get(httpServer.http.makeUrl('/resource'))
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
  const request = http.request(httpServer.http.makeUrl('/resource'))
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
