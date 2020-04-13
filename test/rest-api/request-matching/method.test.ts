import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'

describe('REST: Request matching (method)', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'method.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given mocked a POST request', () => {
    it('should mock a POST request to the matched URL', async () => {
      const res = await test.request({
        url: 'https://api.github.com/users/octocat',
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
        mocked: true,
      })
    })

    it('should not mock a GET request to the matched URL', async () => {
      const res = await test.request({
        url: 'https://api.github.com/users/octocat',
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).not.toHaveProperty('x-powered-by', 'msw')
      expect(body).not.toHaveProperty('mocked', true)
    })
  })
})
