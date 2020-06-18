import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Query parameters', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'query.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given a single query parameter', () => {
    it('should retrieve parameters from the URI', async () => {
      const res = await test.request({
        url: 'https://test.mswjs.io/api/books?id=abc-123',
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        bookId: 'abc-123',
      })
    })
  })

  describe('given multiple query parameters', () => {
    it('should return the list of values by parameter name', async () => {
      const res = await test.request({
        url: 'https://test.mswjs.io/products?id=1&id=2&id=3',
        fetchOptions: {
          method: 'POST',
        },
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        productIds: ['1', '2', '3'],
      })
    })
  })
})
