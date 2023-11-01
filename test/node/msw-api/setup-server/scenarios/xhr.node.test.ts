/**
 * @vitest-environment jsdom
 */
import { http } from 'msw'
import { setupServer } from 'msw/node'
import { stringToHeaders } from 'headers-polyfill'

const server = setupServer(
  http.get('http://localhost:3001/resource', ({ request }) => {
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

  beforeAll(async () => {
    const req = new XMLHttpRequest()
    req.open('GET', 'http://localhost:3001/resource')

    const requestFinishPromise = new Promise<void>((resolve, reject) => {
      req.onload = function () {
        statusCode = this.status
        body = JSON.parse(this.response)
        headers = stringToHeaders(this.getAllResponseHeaders())
        resolve()
      }
      req.onerror = reject.bind(req)
    })
    req.send()

    await requestFinishPromise
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
