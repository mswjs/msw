import * as path from 'path'
import { pageWith } from 'page-with'
import { matchRequestUrl } from 'msw'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'response-patching.mocks.ts'),
    routes(app) {
      app.get('/user', (req, res) => {
        res.status(200).json({
          name: 'The Octocat',
          location: 'San Francisco',
        })
      })

      app.get('/repos/:owner/:name', (req, res) => {
        res.status(200).json({ name: req.params.name })
      })

      app.post('/headers-proxy', (req, res) => {
        if (!req.headers.authorization) {
          return res.status(403).json({ message: 'error' }).end()
        }

        return res.status(200).json({ message: 'success' }).end()
      })

      app.head('/posts', (req, res) => {
        res.status(200).header('x-custom', 'HEAD REQUEST PATCHED').end()
      })

      app.post('/posts', (req, res) => {
        res
          .status(200)
          .header('x-custom', 'POST REQUEST PATCHED')
          .json({ id: 101 })
          .end()
      })

      app.get('/posts', (req, res) => {
        res.status(200).json({ id: 101 }).end()
      })
    },
  })
}

test('responds with a combination of the mocked and original responses', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/user')
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    name: 'The Octocat',
    location: 'San Francisco',
    mocked: true,
  })
})

test('bypasses the original request when it equals the mocked request', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request(
    '/repos/mswjs/msw?mocked=true',
    undefined,
    (res, url) => {
      return (
        // Await the response from MSW so that the original response
        // from the same URL would not interfere.
        matchRequestUrl(new URL(url), res.url()).matches &&
        res.headers()['x-powered-by'] === 'msw'
      )
    },
  )
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    name: 'msw',
    stargazers_count: 9999,
  })
})

test('forwards custom request headers to the original request', async () => {
  const runtime = await createRuntime()
  const requestPromise = runtime.request('/headers', {
    headers: {
      Authorization: 'token',
    },
  })

  const req = await runtime.page.waitForRequest(runtime.makeUrl('/headers'))
  const res = await requestPromise

  expect(req.headers()).toHaveProperty('authorization', 'token')
  expect(req.headers()).not.toHaveProperty('_headers')
  expect(req.headers()).not.toHaveProperty('_names')

  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual({ message: 'success' })
})

test('supports patching a HEAD request', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request(
    '/posts',
    {
      method: 'HEAD',
    },
    (res, url) => {
      return (
        matchRequestUrl(new URL(runtime.makeUrl(url)), res.url()).matches &&
        res.headers()['x-powered-by'] === 'msw'
      )
    },
  )

  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).toHaveProperty('x-custom', 'HEAD REQUEST PATCHED')
  expect(body).toEqual({ mocked: true })
})

test('supports patching a GET request', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request(
    '/posts',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    (res, url) => {
      return (
        matchRequestUrl(new URL(runtime.makeUrl(url)), res.url()).matches &&
        res.headers()['x-powered-by'] === 'msw'
      )
    },
  )
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({ id: 101, mocked: true })
})

test('supports patching a POST request', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request(
    '/posts',
    {
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
    (res, url) => {
      return (
        matchRequestUrl(new URL(runtime.makeUrl(url)), res.url()).matches &&
        res.headers()['x-powered-by'] === 'msw'
      )
    },
  )
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).toHaveProperty('x-custom', 'POST REQUEST PATCHED')
  expect(body).toEqual({
    id: 101,
    mocked: true,
  })
})
