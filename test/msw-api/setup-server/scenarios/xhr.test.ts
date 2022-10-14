import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'
import { stringToHeaders } from 'headers-polyfill'

const server = setupServer(
  rest.get('http://test.mswjs.io', () => {
    return HttpResponse.json(
      {
        firstName: 'John',
        age: 32,
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

it('returns a mocked response to an XMLHttpRequest', async () => {
  let statusCode: number
  let headers: Headers
  let body: string

  await new Promise<void>((resolve) => {
    const req = new XMLHttpRequest()
    req.open('GET', 'http://test.mswjs.io')
    req.onload = function () {
      statusCode = this.status
      body = JSON.parse(this.response)
      headers = stringToHeaders(this.getAllResponseHeaders())
      resolve()
    }
    req.send()
  })

  expect(statusCode).toBe(401)
  expect(headers.get('content-type')).toBe('application/json')
  expect(headers.get('x-header')).toBe('yes')
  expect(body).toEqual({
    firstName: 'John',
    age: 32,
  })
})
