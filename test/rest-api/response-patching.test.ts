import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import { match } from 'node-match-path'

describe('REST: Response patching', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(
      path.resolve(__dirname, 'response-patching.mocks.ts'),
      {
        withRoutes(app) {
          app.post('/headers-proxy', (req, res) => {
            const { authorization } = req.headers

            if (!authorization) {
              return res.status(403).json({ message: 'error' }).end()
            }

            return res.status(200).json({ message: 'success' }).end()
          })

          app.post('/posts', (req, res) => {
            res.status(200).json({ id: 101 }).end()
          })

          app.get('/posts', (req, res) => {
            res.status(200).json({ id: 101 }).end()
          })

          app.head('/posts', (req, res) => {
            res.status(200).end()
          })
        },
      },
    )
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given mocked and original requests differ', () => {
    it('should return a combination of mocked and original responses', async () => {
      const res = await test.request({
        url: 'https://test.mswjs.io/user',
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
            match(url, res.url()).matches &&
            res.headers()['x-powered-by'] === 'msw'
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

  describe('given a mocked request with custom headers', () => {
    it('should forward the headers to the original request', async () => {
      const res = await test.request({
        url: 'https://test.mswjs.io/headers',
        fetchOptions: {
          headers: {
            Authorization: 'token',
          },
        },
      })
      const status = res.status()
      const body = await res.json()

      expect(status).toEqual(200)
      expect(body).toEqual({ message: 'success' })
    })
  })

  describe('given a post request to be patched', () => {
    it('should be able to properly request and patch the response', async () => {
      const res = await test.request({
        url: '/posts',
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
          return (
            match(test.origin + url, res.url()).matches &&
            res.headers()['x-powered-by'] === 'msw'
          )
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

  describe('given a GET request to be patched', () => {
    it('should be able to properly request and patch the response', async () => {
      const res = await test.request({
        url: '/posts',
        fetchOptions: {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        responsePredicate(res, url) {
          return (
            match(test.origin + url, res.url()).matches &&
            res.headers()['x-powered-by'] === 'msw'
          )
        },
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual({ id: 101, mocked: true })
    })
  })

  describe('given a HEAD request to be patched', () => {
    it('should be able to properly request and patch the response', async () => {
      const res = await test.request({
        url: '/posts',
        fetchOptions: {
          method: 'HEAD',
        },
        responsePredicate(res, url) {
          return (
            match(test.origin + url, res.url()).matches &&
            res.headers()['x-powered-by'] === 'msw'
          )
        },
      })

      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(body).toEqual(null)
    })
  })
})
