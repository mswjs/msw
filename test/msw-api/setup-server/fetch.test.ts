import fetch, { Response } from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

describe('setupServer / fetch', () => {
  const server = setupServer(
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

  beforeAll(async () => {
    server.listen()
  })

  afterAll(() => {
    server.close()
  })

  describe('given I perform a fetch request', () => {
    let res: Response

    beforeAll(async () => {
      res = await fetch('http://test.msw.io')
    })

    it('should return mocked status code', async () => {
      expect(res.status).toEqual(401)
    })

    it('should return mocked headers', () => {
      expect(res.headers.get('content-type')).toEqual('application/json')
      expect(res.headers.get('x-header')).toEqual('yes')
    })

    it('should return mocked body', async () => {
      const body = await res.json()

      expect(body).toEqual({
        firstName: 'John',
        age: 32,
      })
    })
  })
})
