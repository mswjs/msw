/**
 * @jest-environment node
 */
import * as https from 'https'
import { IncomingMessage } from 'http'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

describe('setupServer / https', () => {
  const mock = setupServer(
    rest.get('https://test.msw.io', (req, res, ctx) => {
      return res(
        ctx.status(401),
        ctx.set('x-header', 'yes'),
        ctx.json({
          firstName: 'John',
        }),
      )
    }),
  )

  beforeAll(() => {
    mock.open()
  })

  afterAll(() => {
    mock.close()
  })

  describe('given I perform a request using https.get', () => {
    let res: IncomingMessage
    let resBody: string = ''

    beforeAll((done) => {
      https.get('https://test.msw.io', (message) => {
        res = message
        res.setEncoding('utf8')
        res.on('data', (chunk) => (resBody += chunk))
        res.on('end', done)
      })
    })

    it('should return mocked status code', () => {
      expect(res.statusCode).toEqual(401)
    })

    it('should return mocked headers', () => {
      expect(res.headers).toHaveProperty('content-type', 'application/json')
      expect(res.headers).toHaveProperty('x-header', 'yes')
    })

    it('should return mocked body', () => {
      expect(resBody).toEqual('{"firstName":"John"}')
    })
  })

  describe('given I perform a request using https.request', () => {
    let res: IncomingMessage
    let resBody: string = ''

    beforeAll((done) => {
      const req = https.request('https://test.msw.io', (message) => {
        res = message
        res.setEncoding('utf8')
        res.on('data', (chunk) => (resBody += chunk))
        res.on('end', done)
      })

      req.end()
    })

    it('should return mocked status code', () => {
      expect(res.statusCode).toEqual(401)
    })

    it('should return mocked headers', () => {
      expect(res.headers).toHaveProperty('content-type', 'application/json')
      expect(res.headers).toHaveProperty('x-header', 'yes')
    })

    it('should return mocked body', () => {
      expect(resBody).toEqual('{"firstName":"John"}')
    })
  })
})
