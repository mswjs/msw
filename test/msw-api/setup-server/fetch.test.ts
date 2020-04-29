import fetch, { Response } from 'node-fetch'
import { setupServer, rest } from 'msw'

describe('Server / fetch', () => {
  let mock: ReturnType<typeof setupServer>

  beforeAll(async () => {
    mock = setupServer(
      rest.get('http://test.msw.io', (req, res, ctx) => {
        return res(
          ctx.status(401),
          ctx.json({
            firstName: 'John',
            age: 32,
          }),
        )
      }),
    )

    return mock.open()
  })

  afterAll(() => {
    return mock.close()
  })

  describe('given I perform a request in node environment', () => {
    let res: Response

    beforeAll(async () => {
      res = await fetch('http://test.msw.io')
    })

    it('should return a mocked status code', async () => {
      expect(res.status).toEqual(401)
    })

    it('should return proper mocked headers', () => {
      expect(res.headers.get('content-type')).toEqual('application/json')
    })

    it('should return a mocked response body', async () => {
      const body = await res.json()

      expect(body).toEqual({
        firstName: 'John',
        age: 32,
      })
    })
  })
})
