import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { stringToHeaders } from 'headers-utils'

describe('setupServer / XHR', () => {
  const mock = setupServer(
    rest.get('http://test.msw.io', (req, res, ctx) => {
      return res(
        ctx.status(401),
        ctx.set('x-header', 'yes'),
        ctx.json({
          firstName: 'John',
          age: 32,
        }),
      )
    }),
  )

  beforeAll(() => {
    return mock.open()
  })

  afterAll(() => {
    return mock.close()
  })

  describe('given I perform an XMLHttpRequest', () => {
    let statusCode: number
    let headers: Headers
    let body: string

    beforeAll((done) => {
      const req = new XMLHttpRequest()
      req.open('GET', 'http://test.msw.io')
      req.onload = function () {
        statusCode = this.status
        body = JSON.parse(this.response)
        headers = stringToHeaders(this.getAllResponseHeaders())
        done()
      }
      req.send()
    })

    it('should return mocked status code', () => {
      expect(statusCode).toEqual(401)
    })

    it('should return mocked headers', () => {
      expect(headers.get('content-type')).toEqual('application/json')
      expect(headers.get('x-header')).toEqual('yes')
    })

    it('should return mocked body', () => {
      expect(body).toEqual({
        firstName: 'John',
        age: 32,
      })
    })
  })
})
