import fetch, { Response } from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

describe('setupServer / fetch', () => {
  const server = setupServer(
    rest.get('http://test.mswjs.io', (req, res, ctx) => {
      return res(
        ctx.status(401),
        ctx.set('x-header', 'yes'),
        ctx.json({
          firstName: 'John',
          age: 32,
        }),
      )
    }),
    rest.post('https://test.mswjs.io', (req, res, ctx) => {
      return res(
        ctx.status(403),
        ctx.set('x-header', 'yes'),
        ctx.json(req.body as Record<string, any>),
      )
    }),
  )

  beforeAll(() => {
    server.listen()
  })

  afterAll(() => {
    server.close()
  })

  describe('given I perform a GET request using fetch', () => {
    let res: Response

    beforeAll(async () => {
      res = await fetch('http://test.mswjs.io')
    })

    test('should return mocked status code', async () => {
      expect(res.status).toEqual(401)
    })

    test('should return mocked headers', () => {
      expect(res.headers.get('content-type')).toEqual('application/json')
      expect(res.headers.get('x-header')).toEqual('yes')
    })

    test('should return mocked body', async () => {
      const body = await res.json()

      expect(body).toEqual({
        firstName: 'John',
        age: 32,
      })
    })
  })

  describe('given I perform a POST request using fetch', () => {
    let res: Response

    beforeAll(async () => {
      res = await fetch('https://test.mswjs.io', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: 'info',
        }),
      })
    })

    test('should return mocked status code', () => {
      expect(res.status).toEqual(403)
    })

    test('should return mocked headers', () => {
      expect(res.headers.get('content-type')).toEqual('application/json')
      expect(res.headers.get('x-header')).toEqual('yes')
    })

    test('should return mocked and parsed JSON body', async () => {
      const body = await res.json()
      expect(body).toEqual({
        payload: 'info',
      })
    })
  })
})
