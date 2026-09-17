import { http, HttpResponse, bypass } from 'msw'
import { matchRequestUrl } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/user', async ({ request }) => {
    const originalResponse = await fetch(bypass(request.url))
    const body = await originalResponse.json()

    return HttpResponse.json(
      {
        name: body.name,
        location: body.location,
        mocked: true,
      },
      {
        headers: {
          'X-Source': 'msw',
        },
      },
    )
  }),
  http.get('*/repos/:owner/:repoName', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))
    const body = await originalResponse.json()

    return HttpResponse.json(
      {
        name: body.name,
        stargazers_count: 9999,
      },
      {
        headers: {
          'X-Source': 'msw',
        },
      },
    )
  }),
  http.get('*/headers', async ({ request }) => {
    const proxyUrl = new URL('/headers-proxy', request.url)
    const originalResponse = await fetch(
      bypass(proxyUrl, {
        method: 'POST',
        headers: request.headers,
      }),
    )
    const body = await originalResponse.json()

    return HttpResponse.json(body, {
      headers: {
        'X-Source': 'msw',
      },
    })
  }),
  http.post('*/posts', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))
    const body = await originalResponse.json()

    return HttpResponse.json(
      {
        ...body,
        mocked: true,
      },
      {
        headers: {
          'X-Source': 'msw',
          'X-Custom': originalResponse.headers.get('x-custom') || '',
        },
      },
    )
  }),
  http.get('*/posts', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))
    const body = await originalResponse.json()

    return HttpResponse.json(
      {
        ...body,
        mocked: true,
      },
      {
        headers: {
          'X-Source': 'msw',
        },
      },
    )
  }),
  http.head('*/posts', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))

    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers: {
          'X-Source': 'msw',
          'X-Custom': originalResponse.headers.get('x-custom') || '',
        },
      },
    )
  }),
]

const test = defineNetwork({ handlers })

test('responds with a combination of the mocked and original responses', async ({
  fetch,
  testServer,
}) => {
  const res = await fetch(testServer.http.url('/user'))
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
  fetch,
  testServer,
}) => {
  const res = await fetch(
    testServer.http.url('/repos/mswjs/msw?mocked=true'),
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
  fetch,
  page,
  testServer,
}) => {
  const requestPromise = fetch(testServer.http.url('/headers'), {
    headers: {
      Authorization: 'token',
    },
  })
  const req = await page.waitForRequest(testServer.http.url('/headers'))
  const res = await requestPromise

  expect(req.headers()).toHaveProperty('authorization', 'token')
  expect(req.headers()).not.toHaveProperty('_headers')
  expect(req.headers()).not.toHaveProperty('_names')

  const status = res.status()
  const body = await res.json()

  expect(status).toEqual(200)
  expect(body).toEqual({ message: 'success' })
})

test('supports patching a HEAD request', async ({ fetch, testServer }) => {
  const res = await fetch(
    testServer.http.url('/head/posts'),
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
  fetch,
  makeUrl,
  testServer,
}) => {
  const res = await fetch(
    testServer.http.url('/posts'),
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
  fetch,
  makeUrl,
  testServer,
}) => {
  const res = await fetch(
    testServer.http.url('/posts'),
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
