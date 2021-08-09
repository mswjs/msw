import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'uri.mocks.ts'),
  })
}

test('matches an exact string with the same request URL with a trailing slash', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('https://api.github.com/made-up/')

  expect(res.status()).toEqual(200)
  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(await res.json()).toEqual({
    mocked: true,
  })
})

test('does not match an exact string with a different request URL with a trailing slash', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://api.github.com/other/'),
  )

  expect(res.status).not.toBe(200)
})

test('matches an exact string with the same request URL without a trailing slash', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('https://api.github.com/made-up')

  expect(res.status()).toEqual(200)
  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(await res.json()).toEqual({
    mocked: true,
  })
})

test('does not match an exact string with a different request URL without a trailing slash', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://api.github.com/other'),
  )

  expect(res.status).not.toBe(200)
})

test('matches a mask against a matching request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('https://test.mswjs.io/messages/abc-123')

  expect(res.status()).toEqual(200)
  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(await res.json()).toEqual({
    messageId: 'abc-123',
  })
})

test('ignores query parameters when matching a mask against a matching request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request(
    'https://test.mswjs.io/messages/abc-123/items?hello=true',
  )

  expect(res.status()).toEqual(200)
  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(await res.json()).toEqual({
    messageId: 'abc-123',
  })
})

test('does not match a mask against a non-matching request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://test.mswjs.io/users/def-456').catch(() => null),
  )

  expect(res).toBeNull()
})

test('matches a RegExp against a matching request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('https://mswjs.google.com/path')

  expect(res.status()).toEqual(200)
  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(await res.json()).toEqual({
    mocked: true,
  })
})

test('does not match a RegExp against a non-matching request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://mswjs.google.com/other').catch(() => null),
  )

  expect(res).toBeNull()
})

test.only('supports escaped parentheses in the request URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request(`/resource('id')`)

  expect(res.status()).toEqual(200)
  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(await res.json()).toEqual({
    mocked: true,
  })
})
