import type { Page } from '@playwright/test'
import { test, expect } from '../../playwright.extend'

async function bakeCookies(page: Page, cookies: Array<string>) {
  await page.evaluate((cookies) => {
    cookies.forEach((cookie) => {
      document.cookie = cookie
    })
  }, cookies)
}

test('returns empty object if document has no cookies', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))
  const response = await fetch('/cookies')
  const documentCookies = await page.evaluate(() => document.cookie)

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({})
  expect(documentCookies).toBe('')
})

test('returns empty object for request with "credentials: omit"', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))
  await bakeCookies(page, ['documentCookie=value'])
  const response = await fetch('/cookies', { credentials: 'omit' })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({})
})

test('returns empty object for cross-origin request with "credentials: same-origin"', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))
  await bakeCookies(page, ['documentCookie=value'])
  const response = await fetch('https://example.com/cookies', {
    credentials: 'same-origin',
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({})
})

test('returns cookies for same-origin request with "credentials: same-origin"', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))
  await bakeCookies(page, ['documentCookie=value'])
  const response = await fetch('/cookies', {
    credentials: 'same-origin',
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    documentCookie: 'value',
  })
})

test('returns cookies for same-origin request with "credentials: include"', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))
  await bakeCookies(page, ['firstCookie=value', 'secondCookie=anotherValue'])
  const response = await fetch('/cookies', {
    credentials: 'include',
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    firstCookie: 'value',
    secondCookie: 'anotherValue',
  })
})

test('returns cookies for cross-origin request with "credentials: include"', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))
  await bakeCookies(page, ['documentCookie=value'])
  const response = await fetch('https://example.com/cookies', {
    credentials: 'include',
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    documentCookie: 'value',
  })
})

test('inherits mocked cookies', async ({ loadExample, fetch, page }) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))
  await bakeCookies(page, ['documentCookie=value'])

  // Make a request that sends mocked cookies.
  await fetch('/set-cookies', {
    method: 'POST',
    body: 'mockedCookie=mockedValue',
  })
  const response = await fetch('/cookies', {
    credentials: 'include',
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    documentCookie: 'value',
    mockedCookie: 'mockedValue',
  })
})

test('inherits mocked cookies after page reload', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))
  await bakeCookies(page, ['documentCookie=value'])

  await fetch('/set-cookies', {
    method: 'POST',
    body: 'mockedCookie=mockedValue',
  })
  // Reload the page to ensure that the mocked cookies persist.
  await page.reload({ waitUntil: 'networkidle' })

  const response = await fetch('/cookies', {
    credentials: 'include',
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    documentCookie: 'value',
    mockedCookie: 'mockedValue',
  })
})

test('inherits mocked "HttpOnly" cookies', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))
  await bakeCookies(page, ['documentCookie=value'])

  await fetch('/set-cookies', {
    method: 'POST',
    body: 'mockedCookie=mockedValue; HttpOnly',
  })
  await page.reload({ waitUntil: 'networkidle' })

  const response = await fetch('/cookies', {
    credentials: 'include',
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    documentCookie: 'value',
    mockedCookie: 'mockedValue',
  })
})

test('respects cookie "Path" when exposing cookies', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))

  /**
   * @note I tried including the `document.cookie` with
   * a specific `Path` but it behaves differently. It doesn't
   * even expose the cookie unless the PAGE path matches the
   * cookie path (reproducible in the browser).
   */

  await fetch('/set-cookies', {
    method: 'POST',
    body: `mockedCookie=mockedValue; Path=/dashboard`,
  })

  const nonMatchingResponse = await fetch('/cookies')
  // Must not return cookies for the request under a different path.
  await expect(nonMatchingResponse.json()).resolves.toEqual({})

  // Must return the mocked cookie for a request with a matching path.
  const matchingResponse = await fetch('/dashboard/cookies')
  await expect(matchingResponse.json()).resolves.toEqual({
    mockedCookie: 'mockedValue',
  })
})

test('deletes a cookie when received "max-age=0" in a mocked response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./request-cookies.mocks.ts'))

  // First, set the cookie.
  await fetch('/set-cookies', {
    method: 'POST',
    body: `mockedCookie=mockedValue`,
  })

  // Must forward the mocked cookied to the matching request.
  await expect(fetch('/cookies').then((res) => res.json())).resolves.toEqual({
    mockedCookie: 'mockedValue',
  })

  // Next, delete the cookie by setting "max-age=0".
  await fetch('/set-cookies', {
    method: 'POST',
    body: `mockedCookie=mockedValue; max-age=0`,
  })

  // Must NOT have any cookies on the matching request.
  await expect(fetch('/cookies').then((res) => res.json())).resolves.toEqual({})
})
