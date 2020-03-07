import * as path from 'path'
import { BootstrapApi, bootstrap } from '../../support/bootstrap'

describe('REST: Request matching (URI)', () => {
  let api: BootstrapApi

  beforeAll(async () => {
    api = await bootstrap(path.resolve(__dirname, 'uri.client'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  describe('given exact string for request URI', () => {
    it('should match a request with the exact URI', async () => {
      const REQUEST_URL = 'https://api.github.com/made-up'

      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)

      expect(res.status()).toBe(200)

      const responseBody = await res.json()
      expect(responseBody).toEqual({
        mocked: true,
      })
    })

    it('should not match a request with different URI', async () => {
      const res = await api.page.evaluate(() =>
        fetch('https://api.github.com/other'),
      )

      expect(res.status).not.toBe(200)
    })
  })

  describe('given mask for request URI', () => {
    it('should match a request that matches the mask', async () => {
      const REQUEST_URL = 'https://test.msw.io/messages/abc-123'

      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)

      expect(res.status()).toBe(200)

      const responseBody = await res.json()
      expect(responseBody).toEqual({
        messageId: 'abc-123',
      })
    })

    it('should not match a request that does not match the mask', async () => {
      const res = await api.page.evaluate(() =>
        fetch('https://test.msw.io/users/def-456').catch(() => null),
      )

      expect(res).toBeNull()
    })
  })

  describe('given RegExp for request URI', () => {
    it('should match a request URI matching the expression', async () => {
      const REQUEST_URL = 'https://msw.google.com/path'
      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)

      expect(res.status()).toBe(200)

      const responseBody = await res.json()
      expect(responseBody).toEqual({
        mocked: true,
      })
    })

    it('should not match a request URI not matching the expression', async () => {
      const res = await api.page.evaluate(() =>
        fetch('https://msw.google.com/other').catch(() => null),
      )

      expect(res).toBeNull()
    })
  })
})
