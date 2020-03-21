import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Query parameters', () => {
  let api: TestAPI

  beforeAll(async () => {
    api = await runBrowserWith(path.resolve(__dirname, 'query.mocks.ts'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  describe('given a single query parameter', () => {
    it('should retrieve parameters from the URI', async () => {
      const REQUEST_URL = 'https://test.msw.io/api/books?id=abc-123'
      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(res.status()).toBe(200)
      expect(body).toEqual({
        bookId: 'abc-123',
      })
    })
  })

  describe('given multiple query parameters', () => {
    it('should return the list of values by parameter name', async () => {
      const REQUEST_URL = 'https://test.msw.io/products?id=1&id=2&id=3'
      api.page.evaluate((url) => fetch(url, { method: 'POST' }), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(res.status()).toBe(200)
      expect(body).toEqual({
        productIds: ['1', '2', '3'],
      })
    })
  })
})
