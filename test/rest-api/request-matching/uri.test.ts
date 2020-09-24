import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'uri.mocks.ts'))
}

test('matches an exact string with the same request URL with a trailing slash', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://api.github.com/made-up/',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  return runtime.cleanup()
})

test('does not match an exact string with a different request URL with a trailing slash', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://api.github.com/other/'),
  )

  expect(res.status).not.toBe(200)

  return runtime.cleanup()
})

test('matches an exact string with the same request URL without a trailing slash', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://api.github.com/made-up',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  return runtime.cleanup()
})

test('does not match an exact string with a different request URL without a trailing slash', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://api.github.com/other'),
  )

  expect(res.status).not.toBe(200)

  return runtime.cleanup()
})

test('matches a mask against a matching request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://test.mswjs.io/messages/abc-123',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    messageId: 'abc-123',
  })

  return runtime.cleanup()
})

test('ignores query parameters when matching a mask against a matching request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://test.mswjs.io/messages/abc-123/items?hello=true',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    messageId: 'abc-123',
  })

  return runtime.cleanup()
})

test('does not match a mask against a non-matching request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://test.mswjs.io/users/def-456').catch(() => null),
  )

  expect(res).toBeNull()

  return runtime.cleanup()
})

test('matches a RegExp against a matching request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://mswjs.google.com/path',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  return runtime.cleanup()
})

test('does not match a RegExp against a non-matching request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://mswjs.google.com/other').catch(() => null),
  )

  expect(res).toBeNull()

  return runtime.cleanup()
})
