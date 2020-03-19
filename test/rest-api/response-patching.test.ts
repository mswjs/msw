import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Response patching', () => {
  let api: TestAPI

  beforeAll(async () => {
    api = await runBrowserWith(
      path.resolve(__dirname, 'response-patching.mocks.ts'),
    )
  })

  afterAll(() => {
    return api.cleanup()
  })

  describe('given mocked and original requests differ', () => {
    it('should return a combination of mocked and original responses', async () => {
      const REQUEST_URL = 'https://test.msw.io/user'
      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(res.status()).toBe(200)
      expect(body).toEqual({
        name: 'The Octocat',
        location: 'San Francisco',
        mocked: true,
      })
    })
  })

  describe('given mocked and original requests are the same', () => {
    it('should bypass the original request', async () => {
      const REQUEST_URL =
        'https://api.github.com/repos/open-draft/msw?mocked=true'
      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse((res) => {
        return (
          // Await for the response from MSW, so that original response
          // from the same URL would not interfere.
          res.url() === REQUEST_URL && res.headers()['x-powered-by'] === 'msw'
        )
      })
      const body = await res.json()

      expect(res.status()).toBe(200)
      expect(body).toEqual({
        name: 'msw',
        stargazers_count: 9999,
      })
    })
  })
})
