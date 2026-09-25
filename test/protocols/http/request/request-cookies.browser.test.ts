import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../setup/vitest-helpers'

function bakeCookies(cookies: Array<string>): void {
  document.cookie.split(';').forEach((cookie) => {
    const [name] = cookie.trim().split('=')
    document.cookie = `${name}=; Max-Age=0; Path=/`
  })

  cookies.forEach((cookie) => {
    document.cookie = cookie
  })
}

const handlers = [
  http.get('*/cookies', ({ cookies }) => {
    return HttpResponse.json(cookies)
  }),
  http.post('/set-cookies', async ({ request }) => {
    new HttpResponse(null, {
      headers: {
        'Set-Cookie': 'must-not=be-set',
      },
    })

    return new HttpResponse(null, {
      headers: {
        'Set-Cookie': await request.clone().text(),
      },
    })
  }),
]

const test = defineTestNetwork({ handlers })

test.afterEach(async () => {
  await fetch('/set-cookies', {
    method: 'POST',
    body: 'mockedCookie=; Max-Age=0; Path=/',
  })
  document.cookie.split(';').forEach((cookie) => {
    const [name] = cookie.trim().split('=')
    document.cookie = `${name}=; Max-Age=0; Path=/`
  })
})

test('returns empty object if document has no cookies', async ({
  fetch,
  page,
}) => {
  const response = await fetch('/cookies')
  const documentCookies = await page.evaluate(() => document.cookie)

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({})
  expect(documentCookies).toBe('')
})

test('inherits mocked cookies', async ({ fetch, page }) => {
  bakeCookies(['documentCookie=value'])

  // Make a request that sends mocked cookies.
  await fetch('/set-cookies', {
    method: 'POST',
    body: 'mockedCookie=mockedValue',
  })
  const response = await fetch('/cookies', {
    credentials: 'include',
  })

  expect.soft(response.status()).toBe(200)
  await expect.soft(response.json()).resolves.toEqual({
    documentCookie: 'value',
    mockedCookie: 'mockedValue',
  })
})

test('inherits mocked "HttpOnly" cookies', async ({ fetch, page }) => {
  bakeCookies(['documentCookie=value'])

  await fetch('/set-cookies', {
    method: 'POST',
    body: 'mockedCookie=mockedValue; HttpOnly',
  })
  const response = await fetch('/cookies', {
    credentials: 'include',
  })

  expect.soft(response.status()).toBe(200)
  await expect.soft(response.json()).resolves.toEqual({
    documentCookie: 'value',
    mockedCookie: 'mockedValue',
  })
})

test('respects cookie "Path" when exposing cookies', async ({ fetch }) => {
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

test('deletes a cookie when sending "max-age=0" in a mocked response', async ({
  fetch,
}) => {
  // First, set the cookie.
  await fetch('/set-cookies', {
    method: 'POST',
    body: `mockedCookie=mockedValue`,
  })

  // Must forward the mocked cookied to the matching request.
  await expect(
    fetch('/cookies').then((response) => response.json()),
  ).resolves.toEqual({
    mockedCookie: 'mockedValue',
  })

  // Next, delete the cookie by setting "max-age=0".
  await fetch('/set-cookies', {
    method: 'POST',
    body: `mockedCookie=mockedValue; max-age=0`,
  })

  // Must NOT have any cookies on the matching request.
  await expect(
    fetch('/cookies').then((response) => response.json()),
  ).resolves.toEqual({})
})
