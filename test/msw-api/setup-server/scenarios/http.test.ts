/**
 * @jest-environment node
 */
import * as http from 'http'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'

describe('setupServer / http', () => {
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

  describe('given I perform a request using http.get', () => {
    let res: http.IncomingMessage
    let resBody = ''

    beforeAll((done) => {
      http.get('http://test.mswjs.io', (message) => {
        res = message
        res.setEncoding('utf8')
        res.on('data', (chunk) => (resBody += chunk))
        res.on('end', done)
      })
    })

    test('should return mocked status code', () => {
      expect(res.statusCode).toEqual(401)
    })

    test('should return mocked headers', () => {
      expect(res.headers).toHaveProperty('content-type', 'application/json')
      expect(res.headers).toHaveProperty('x-header', 'yes')
    })

    test('should return mocked body', () => {
      expect(resBody).toEqual('{"firstName":"John"}')
    })
  })

  describe('given I perform a request using http.request', () => {
    let res: http.IncomingMessage
    let resBody = ''

    beforeAll((done) => {
      const req = http.request('http://test.mswjs.io', (message) => {
        res = message
        res.setEncoding('utf8')
        res.on('data', (chunk) => (resBody += chunk))
        res.on('end', done)
      })

      req.end()
    })

    test('should return mocked status code', () => {
      expect(res.statusCode).toEqual(401)
    })

    test('should return mocked headers', () => {
      expect(res.headers).toHaveProperty('content-type', 'application/json')
      expect(res.headers).toHaveProperty('x-header', 'yes')
    })

    test('should return mocked body', () => {
      expect(resBody).toEqual('{"firstName":"John"}')
    })
  })
})
