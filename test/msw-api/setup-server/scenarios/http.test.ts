/**
 * @jest-environment node
 */
import * as http from 'http'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('http://test.mswjs.io', () => {
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

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('returns a mocked response to a http.get request', async () => {
  let res: http.IncomingMessage
  let resBody = ''

  await new Promise<void>((resolve) => {
    http.get('http://test.mswjs.io', (message) => {
      res = message
      res.setEncoding('utf8')
      res.on('data', (chunk) => (resBody += chunk))
      res.on('end', () => resolve())
    })
  })

  expect(res.statusCode).toEqual(401)
  expect(res.headers).toHaveProperty('content-type', 'application/json')
  expect(res.headers).toHaveProperty('x-header', 'yes')
  expect(resBody).toEqual('{"firstName":"John"}')
})

it('returns a mocked response to a http.request request', async () => {
  let res: http.IncomingMessage
  let resBody = ''

  await new Promise<void>((resolve) => {
    http
      .request('http://test.mswjs.io', (message) => {
        res = message
        res.setEncoding('utf8')
        res.on('data', (chunk) => (resBody += chunk))
        res.on('end', () => resolve())
      })
      .end()
  })

  expect(res.statusCode).toEqual(401)
  expect(res.headers).toHaveProperty('content-type', 'application/json')
  expect(res.headers).toHaveProperty('x-header', 'yes')
  expect(resBody).toEqual('{"firstName":"John"}')
})
