import { test, expect } from '../../../playwright.extend'

test('matches an exact string with the same request URL with a trailing slash', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const res = await fetch('https://api.github.com/made-up/')

  expect(res.status()).toEqual(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(await res.json()).toEqual({
    mocked: true,
  })
})

test('does not match an exact string with a different request URL with a trailing slash', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const res = await page.evaluate(() => fetch('https://api.github.com/other/'))

  expect(res.status).not.toBe(200)
})

test('matches an exact string with the same request URL without a trailing slash', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const res = await fetch('https://api.github.com/made-up')

  expect(res.status()).toEqual(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(await res.json()).toEqual({
    mocked: true,
  })
})

test('does not match an exact string with a different request URL without a trailing slash', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const res = await page.evaluate(() => fetch('https://api.github.com/other'))

  expect(res.status).not.toBe(200)
})

test('matches a mask against a matching request URL', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const res = await fetch('https://test.mswjs.io/messages/abc-123')

  expect(res.status()).toEqual(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(await res.json()).toEqual({
    messageId: 'abc-123',
  })
})

test('ignores query parameters when matching a mask against a matching request URL', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const res = await fetch(
    'https://test.mswjs.io/messages/abc-123/items?hello=true',
  )

  expect(res.status()).toEqual(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(await res.json()).toEqual({
    messageId: 'abc-123',
  })
})

test('does not match a mask against a non-matching request URL', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const res = await page.evaluate(() =>
    fetch('https://test.mswjs.io/users/def-456').catch(() => null),
  )

  expect(res).toBeNull()
})

test('matches a RegExp against a matching request URL', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const res = await fetch('https://mswjs.google.com/path')

  expect(res.status()).toEqual(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(await res.json()).toEqual({
    mocked: true,
  })
})

test('does not match a RegExp against a non-matching request URL', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const res = await page.evaluate(() =>
    fetch('https://mswjs.google.com/other').catch(() => null),
  )

  expect(res).toBeNull()
})

test('supports escaped parentheses in the request URL', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const res = await fetch(`/resource('id')`)

  expect(res.status()).toEqual(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(await res.json()).toEqual({
    mocked: true,
  })
})

test('matches a relative URL starting with search parameters', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./uri.mocks.ts'))

  const response = await fetch('?resourceId=abc-123')

  expect(response.status()).toEqual(200)
  expect(response.fromServiceWorker()).toBe(true)
  expect(await response.json()).toEqual({
    mocked: true,
  })
})
