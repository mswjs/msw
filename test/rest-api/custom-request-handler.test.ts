import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Custom request handler', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(
      path.resolve(__dirname, 'custom-request-handler.mocks.ts'),
    )
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given a request handler with default context', () => {
    it('should intercept request by a custom handler', async () => {
      const res = await test.request({
        url: 'https://test.msw.io/url/matters/not',
        fetchOptions: {
          headers: {
            'x-custom-header': 'true',
          },
        },
      })
      const body = await res.json()
      const headers = res.headers()

      expect(res.status()).toBe(401)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        error: 'Hey, this is a mocked error',
      })
    })
  })

  describe('given a request handler with custom context', () => {
    it('should mock the response according to custom context', async () => {
      const res = await test.request({ url: 'https://test.url/' })
      const body = await res.json()
      const headers = res.headers()

      expect(res.status()).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(headers).toHaveProperty('content-type', 'application/hal+json')
      expect(body).toEqual({
        firstName: 'John',
        age: 42,
      })
    })
  })
})
