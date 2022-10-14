import fetch, { Response } from 'node-fetch'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'

describe('setupServer / fetch', () => {
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
    rest.post('https://test.mswjs.io', async ({ request }) => {
      return HttpResponse.json(await request.json(), {
        status: 403,
        headers: {
          'X-Header': 'yes',
        },
      })
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
