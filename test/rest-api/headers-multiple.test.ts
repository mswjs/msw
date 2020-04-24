import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Multiple headers with the same name', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(
      path.resolve(__dirname, 'headers-multiple.mocks.ts'),
    )
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given handling a request header with multiple values', () => {
    it('should receive all the headers', async () => {
      const REQUEST_URL = 'https://test.msw.io/'
      test.page.evaluate((url) => {
        const headers = new Headers()
        headers.append('accept', 'application/json')
        headers.append('accept', 'image/png')

        return fetch(url, {
          method: 'POST',
          headers,
        })
      }, REQUEST_URL)
      const res = await test.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(res.status()).toEqual(200)
      expect(body).toEqual({
        accept: 'application/json, image/png',
      })
    })
  })

  describe('given mocking a header with multiple values', () => {
    it('should receive all the headers', async () => {
      const REQUEST_URL = 'https://test.msw.io/'
      test.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await test.page.waitForResponse(REQUEST_URL)
      const headers = res.headers()
      const body = await res.json()

      expect(res.status()).toEqual(200)
      expect(headers).toHaveProperty('accept', 'application/json, image/png')
      expect(body).toEqual({
        mocked: true,
      })
    })
  })
})
