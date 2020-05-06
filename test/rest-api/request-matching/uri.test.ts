import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'

describe('REST: Request matching (URI)', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'uri.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given exact string for request URI', () => {
    describe('given the actual URI with trailing slash', () => {
      it('should match a request with the exact URI', async () => {
        const res = await test.request({
          url: 'https://api.github.com/made-up/',
        })
        const status = res.status()
        const headers = res.headers()
        const body = await res.json()

        expect(status).toBe(200)
        expect(headers).toHaveProperty('x-powered-by', 'msw')
        expect(body).toEqual({
          mocked: true,
        })
      })

      it('should not match a request with different URI', async () => {
        const res = await test.page.evaluate(() =>
          fetch('https://api.github.com/other/'),
        )

        expect(res.status).not.toBe(200)
      })
    })

    describe('given the actual URL without a trailing slash', () => {
      it('should match a request with the exact URI', async () => {
        const res = await test.request({
          url: 'https://api.github.com/made-up',
        })
        const status = res.status()
        const headers = res.headers()
        const body = await res.json()

        expect(status).toBe(200)
        expect(headers).toHaveProperty('x-powered-by', 'msw')
        expect(body).toEqual({
          mocked: true,
        })
      })

      it('should not match a request with different URI', async () => {
        const res = await test.page.evaluate(() =>
          fetch('https://api.github.com/other'),
        )

        expect(res.status).not.toBe(200)
      })
    })
  })

  describe('given mask for request URI', () => {
    it('should match a request that matches the mask', async () => {
      const res = await test.request({
        url: 'https://test.msw.io/messages/abc-123',
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        messageId: 'abc-123',
      })
    })

    it('should not match a request that does not match the mask', async () => {
      const res = await test.page.evaluate(() =>
        fetch('https://test.msw.io/users/def-456').catch(() => null),
      )

      expect(res).toBeNull()
    })

    it('should match a request with query parameters that matches the mask', async () => {
      const res = await test.request({
        url: 'https://test.msw.io/messages/abc-123/items?hello=true',
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        messageId: 'abc-123',
      })
    })

    it('should match a request with a hash that matches the mask', async () => {
      const res = await test.request({
        url: 'https://test.msw.io/messages/abc-123/items#hello',
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        messageId: 'abc-123',
      })
    })
  })

  describe('given RegExp for request URI', () => {
    it('should match a request URI matching the expression', async () => {
      const res = await test.request({
        url: 'https://msw.google.com/path',
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        mocked: true,
      })
    })

    it('should not match a request URI not matching the expression', async () => {
      const res = await test.page.evaluate(() =>
        fetch('https://msw.google.com/other').catch(() => null),
      )

      expect(res).toBeNull()
    })
  })
})
