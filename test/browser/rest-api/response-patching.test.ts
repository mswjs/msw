import { matchRequestUrl } from 'msw'
import { HttpServer } from '@open-draft/test-server/lib/http.js'
import { test, expect } from '../playwright.extend'

const httpServer = new HttpServer((app) => {
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
      return res.status(403).json({ message: 'error' })
    }

    return res.status(200).json({ message: 'success' })
  })

  app.head('/posts', (req, res) => {
    res
      .status(200)
      .set({
        'Access-Control-Expose-Headers': 'X-Custom',
        'X-Custom': 'HEAD REQUEST PATCHED',
      })
      .end()
  })

  app.get('/posts', (req, res) => {
    res.status(200).json({ id: 101 })
  })

  app.post('/posts', (req, res) => {
    res
      .status(200)
      .set({
        'Access-Control-Expose-Headers': 'X-Custom',
        'X-Custom': 'POST REQUEST PATCHED',
      })
      .json({ id: 101 })
  })
})

test.beforeEach(async () => {
  await httpServer.listen()
})

test.afterEach(async () => {
  await httpServer.close()
})

test('responds with a combination of the mocked and original responses', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(new URL('./response-patching.mocks.ts', import.meta.url))

  const res = await fetch(httpServer.http.url('/user'))
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    name: 'The Octocat',
    location: 'San Francisco',
    mocked: true,
  })
})

test('bypasses the original request when it equals the mocked request', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(new URL('./response-patching.mocks.ts', import.meta.url))

  const res = await fetch(
    httpServer.http.url('/repos/mswjs/msw?mocked=true'),
    undefined,
    {
      waitForResponse(res) {
        return (
          // Await the response from MSW so that the original response
          // from the same URL would not interfere.
          matchRequestUrl(new URL(res.request().url()), res.url()).matches &&
          res.headers()['x-source'] === 'msw'
        )
      },
    },
  )

  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    name: 'msw',
    stargazers_count: 9999,
  })
})

test('forwards custom request headers to the original request', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(new URL('./response-patching.mocks.ts', import.meta.url))

  const requestPromise = fetch(httpServer.http.url('/headers'), {
    headers: {
      Authorization: 'token',
    },
  })
  const req = await page.waitForRequest(httpServer.http.url('/headers'))
  const res = await requestPromise

  expect(req.headers()).toHaveProperty('authorization', 'token')
  expect(req.headers()).not.toHaveProperty('_headers')
  expect(req.headers()).not.toHaveProperty('_names')

  const status = res.status()
  const body = await res.json()

  expect(status).toEqual(200)
  expect(body).toEqual({ message: 'success' })
})

test('supports patching a HEAD request', async ({ loadExample, fetch }) => {
  await loadExample(new URL('./response-patching.mocks.ts', import.meta.url))

  const res = await fetch(
    httpServer.http.url('/posts'),
    {
      method: 'HEAD',
    },
    {
      waitForResponse(res) {
        const headers = res.headers()

        return (
          headers['x-source'] === 'msw' && headers['x-msw-bypass'] !== 'true'
        )
      },
    },
  )

  const status = res.status()
  const headers = res.headers()

  expect(status).toBe(200)
  expect(headers).toEqual(
    expect.objectContaining({
      'x-source': 'msw',
      'x-custom': 'HEAD REQUEST PATCHED',
    }),
  )
})

test('supports patching a GET request', async ({
  loadExample,
  fetch,
  makeUrl,
}) => {
  await loadExample(new URL('./response-patching.mocks.ts', import.meta.url))

  const res = await fetch(
    httpServer.http.url('/posts'),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    {
      waitForResponse(res) {
        return (
          matchRequestUrl(new URL(makeUrl(res.request().url())), res.url())
            .matches && res.headers()['x-source'] === 'msw'
        )
      },
    },
  )
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({ id: 101, mocked: true })
})

test('supports patching a POST request', async ({
  loadExample,
  fetch,
  makeUrl,
}) => {
  await loadExample(new URL('./response-patching.mocks.ts', import.meta.url))

  const res = await fetch(
    httpServer.http.url('/posts'),
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
    {
      waitForResponse(res) {
        return (
          matchRequestUrl(new URL(makeUrl(res.request().url())), res.url())
            .matches && res.headers()['x-source'] === 'msw'
        )
      },
    },
  )
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(headers).toHaveProperty('x-custom', 'POST REQUEST PATCHED')
  expect(body).toEqual({
    id: 101,
    mocked: true,
  })
})
