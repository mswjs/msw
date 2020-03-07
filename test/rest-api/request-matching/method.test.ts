import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'

describe('REST: Request matching (method)', () => {
  let api: TestAPI

  beforeAll(async () => {
    api = await runBrowserWith(path.resolve(__dirname, 'method.mocks.ts'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  describe('given mocked a POST request to "https://api.github.com/users/:username"', () => {
    it('should mock a POST request to the matched URL', async () => {
      const REQUEST_URL = 'https://api.github.com/users/octocat'
      api.page.evaluate((url) => fetch(url, { method: 'POST' }), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(res.status()).toBe(200)
      expect(body).toEqual({
        mocked: true,
      })
    })

    it('should not mock a GET request to the matched URL', async () => {
      const REQUEST_URL = 'https://api.github.com/users/octocat'
      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(res.status()).toBe(200)
      expect(body).not.toHaveProperty('mocked', true)
    })
  })
})
