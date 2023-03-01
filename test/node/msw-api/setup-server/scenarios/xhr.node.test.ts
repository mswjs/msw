/**
 * @jest-environment jsdom
 */
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { stringToHeaders } from 'headers-polyfill'

const server = setupServer(
  rest.get('http://test.mswjs.io', ({ request }) => {
    return new Response(
      JSON.stringify({
        firstName: 'John',
        age: 32,
      }),
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: {
          'Content-Type': 'application/json',
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

describe('given I perform an XMLHttpRequest', () => {
  let statusCode: number
  let headers: Headers
  let body: string

  beforeAll((done) => {
    const req = new XMLHttpRequest()
    req.open('GET', 'http://test.mswjs.io')
    req.onload = function () {
      statusCode = this.status
      body = JSON.parse(this.response)
      headers = stringToHeaders(this.getAllResponseHeaders())
      done()
    }
    req.send()
  })

  test('returns mocked status code', () => {
    expect(statusCode).toEqual(401)
  })

  test('returns mocked headers', () => {
    expect(headers.get('content-type')).toEqual('application/json')
    expect(headers.get('x-header')).toEqual('yes')
  })

  test('returns mocked body', () => {
    expect(body).toEqual({
      firstName: 'John',
      age: 32,
    })
  })
})
