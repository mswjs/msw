/**
 * @jest-environment node
 */
import * as https from 'https'
import { IncomingMessage } from 'http'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'

describe('setupServer / https', () => {
  const server = setupServer(
    rest.get('https://test.mswjs.io', () => {
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

  describe('given I perform a request using https.get', () => {
    let res: IncomingMessage
    let resBody = ''

    beforeAll((done) => {
      https.get('https://test.mswjs.io', (message) => {
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

  describe('given I perform a request using https.request', () => {
    let res: IncomingMessage
    let resBody = ''

    beforeAll((done) => {
      const req = https.request('https://test.mswjs.io', (message) => {
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
