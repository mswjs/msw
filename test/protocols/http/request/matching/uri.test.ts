import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('https://api.github.com/made-up', () => {
    return HttpResponse.json({ mocked: true })
  }),
  http.get('https://test.mswjs.io/messages/:messageId', ({ params }) => {
    const { messageId } = params
    return HttpResponse.json({ messageId })
  }),
  http.get('https://test.mswjs.io/messages/:messageId/items', ({ params }) => {
    const { messageId } = params
    return HttpResponse.json({ messageId })
  }),
  http.get(/(.+?)\.google\.com\/path/, () => {
    return HttpResponse.json({ mocked: true })
  }),
  http.get(`*/resource\\('id'\\)`, () => {
    return HttpResponse.json({ mocked: true })
  }),
  http.get(
    ({ request }) => {
      return new URL(request.url).pathname === '/'
    },
    ({ request }) => {
      const url = new URL(request.url)

      if (url.searchParams.has('resourceId')) {
        return HttpResponse.json({ mocked: true })
      }
    },
  ),
]

const test = defineNetwork({ handlers })

test('matches an exact string with the same request URL with a trailing slash', async ({
  fetch,
}) => {
  const response = await fetch('https://api.github.com/made-up/')

  expect(response.status()).toEqual(200)
  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({
    mocked: true,
  })
})

test('does not match an exact string with a different request URL with a trailing slash', async ({
  fetch,
  testServer,
}) => {
  const response = await fetch(testServer.http.url('/other/'))

  expect(response.isMocked()).toBe(false)
})

test('matches an exact string with the same request URL without a trailing slash', async ({
  fetch,
}) => {
  const response = await fetch('https://api.github.com/made-up')

  expect(response.status()).toEqual(200)
  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({
    mocked: true,
  })
})

test('does not match an exact string with a different request URL without a trailing slash', async ({
  fetch,
  testServer,
}) => {
  const response = await fetch(testServer.http.url('/other'))

  expect(response.isMocked()).toBe(false)
})

test('matches a mask against a matching request URL', async ({ fetch }) => {
  const response = await fetch('https://test.mswjs.io/messages/abc-123')

  expect(response.status()).toEqual(200)
  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({
    messageId: 'abc-123',
  })
})

test('ignores query parameters when matching a mask against a matching request URL', async ({
  fetch,
}) => {
  const response = await fetch(
    'https://test.mswjs.io/messages/abc-123/items?hello=true',
  )

  expect(response.status()).toEqual(200)
  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({
    messageId: 'abc-123',
  })
})

test('does not match a mask against a non-matching request URL', async ({
  fetch,
  testServer,
}) => {
  const response = await fetch(testServer.http.url('/users/def-456'))

  expect(response.isMocked()).toBe(false)
})

test('matches a RegExp against a matching request URL', async ({ fetch }) => {
  const response = await fetch('https://mswjs.google.com/path')

  expect(response.status()).toEqual(200)
  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({
    mocked: true,
  })
})

test('does not match a RegExp against a non-matching request URL', async ({
  fetch,
  testServer,
}) => {
  const response = await fetch(testServer.http.url('/other'))

  expect(response.isMocked()).toBe(false)
})

test('supports escaped parentheses in the request URL', async ({ fetch }) => {
  const response = await fetch(`/resource('id')`)

  expect(response.status()).toEqual(200)
  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({
    mocked: true,
  })
})

test('matches a relative URL starting with search parameters', async ({
  fetch,
}) => {
  const response = await fetch('?resourceId=abc-123')

  expect(response.status()).toEqual(200)
  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({
    mocked: true,
  })
})
