import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Response patching', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(
      path.resolve(__dirname, 'response-patching.mocks.ts'),
    )
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given mocked and original requests differ', () => {
    it('should return a combination of mocked and original responses', async () => {
      const res = await test.request({
        url: 'https://test.msw.io/user',
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        name: 'The Octocat',
        location: 'San Francisco',
        mocked: true,
      })
    })
  })

  describe('given mocked and original requests are the same', () => {
    it('should bypass the original request', async () => {
      const res = await test.request({
        url: 'https://api.github.com/repos/open-draft/msw?mocked=true',
        responsePredicate(res, url) {
          return (
            // Await for the response from MSW, so that original response
            // from the same URL would not interfere.
            res.url() === url && res.headers()['x-powered-by'] === 'msw'
          )
        },
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        name: 'msw',
        stargazers_count: 9999,
      })
    })
  })

  describe('given a post request to be patched', () => {
    it('should be able to properly request and patch a post', async () => {
      const res = await test.request({
        url: 'https://jsonplaceholder.typicode.com/posts',
        fetchOptions: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'foo',
            body: 'bar',
            userId: 1,
          }),
        },
        responsePredicate(res, url) {
          return res.url() === url && res.headers()['x-powered-by'] === 'msw'
        },
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({
        id: 101,
        mocked: true,
      })
    })
  })
})
