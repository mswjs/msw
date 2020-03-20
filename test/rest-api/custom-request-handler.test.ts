import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Custom request handler', () => {
  let api: TestAPI

  beforeAll(async () => {
    api = await runBrowserWith(
      path.resolve(__dirname, 'custom-request-handler.mocks.ts'),
    )
  })

  afterAll(() => {
    return api.cleanup()
  })

  describe('given a request handler with default context', () => {
    it('should intercept request by a custom handler', async () => {
      const REQUEST_URL = 'https://test.msw.io/url/matters/not'
      api.page.evaluate(
        (url) =>
          fetch(url, {
            headers: {
              'x-custom-header': 'true',
            },
          }),
        REQUEST_URL,
      )
      const res = await api.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(res.status()).toBe(401)
      expect(body).toEqual({
        error: 'Hey, this is a mocked error',
      })
    })
  })

  describe('given a request handler with custom context', () => {
    it('should mock the response according to custom context', async () => {
      const REQUEST_URL = 'https://test.url/'
      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(res.status()).toBe(200)
      expect(res.headers()).toHaveProperty(
        'content-type',
        'application/hal+json',
      )
      expect(body).toEqual({
        firstName: 'John',
        age: 42,
      })
    })
  })
})
