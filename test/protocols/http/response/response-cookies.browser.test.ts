import { vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../setup/vitest-helpers'

const handlers = [
  http.get('/single-cookie', () => {
    return new HttpResponse(null, {
      headers: {
        'Set-Cookie': 'myCookie=value',
      },
    })
  }),
  http.get('/multiple-cookies', () => {
    return new HttpResponse(null, {
      headers: [
        ['Set-Cookie', 'firstCookie=yes'],
        ['Set-Cookie', 'secondCookie=no; Max-Age=1000'],
        ['Set-Cookie', 'thirdCookie=1,2,3'],
      ],
    })
  }),
  http.get('/cookies-via-headers', () => {
    const headers = new Headers({
      'Set-Cookie': 'myCookie=value',
    })

    return new HttpResponse(null, { headers })
  }),
  http.get('/cookies', ({ cookies }) => {
    return HttpResponse.json(cookies)
  }),
]

const test = defineTestNetwork({ handlers })

test.afterEach(() => {
  document.cookie.split(';').forEach((cookie) => {
    const [name] = cookie.trim().split('=')
    document.cookie = `${name}=; Max-Age=0; Path=/`
  })
})

test('supports mocking a single response cookie', async ({ fetch, page }) => {
  const response = await fetch('/single-cookie')
  const documentCookies = await page.evaluate(() => document.cookie)

  expect(response.status()).toBe(200)
  // Must not expose the forbidden "Set-Cookie" header.
  expect(await response.allHeaders()).not.toHaveProperty('set-cookie')
  // Must set the mocked cookie onto the document.
  expect(documentCookies).toBe('myCookie=value')
})

test('supports mocking multiple response cookies', async ({ fetch, page }) => {
  const response = await fetch('/multiple-cookies')
  const documentCookies = await page.evaluate(() => document.cookie)

  expect(response.status()).toBe(200)
  expect(await response.allHeaders()).not.toHaveProperty('set-cookie')
  /**
   * @note The `Max-Age` attribute is not propagated onto the document.
   * If that's unexpected, raise an issue.
   */
  expect(documentCookies).toBe(
    'firstCookie=yes; secondCookie=no; thirdCookie=1,2,3',
  )
})

test('supports mocking cookies via a standalone Headers instance', async ({
  fetch,
  page,
}) => {
  const response = await fetch('/cookies-via-headers')
  const documentCookies = await page.evaluate(() => document.cookie)

  expect(response.status()).toBe(200)
  expect(await response.allHeaders()).not.toHaveProperty('set-cookie')
  expect(documentCookies).toBe('myCookie=value')
})

/**
 * @see https://github.com/mswjs/msw/issues/2750
 */
test('keeps mocked cookies in memory when persisting them exceeds the storage quota', async ({
  fetch,
}) => {
  const originalSetItem = Storage.prototype.setItem
  const setItem = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(function (this: Storage, key, value) {
      // Fail only the cookie store writes so the test runner's own storage keeps working.
      if (key === '__msw-cookie-store__') {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
      }

      return originalSetItem.call(this, key, value)
    })

  const response = await fetch('/single-cookie')
  expect(response.status()).toBe(200)

  // Must still resolve the mocked cookie on subsequent requests.
  const cookiesResponse = await fetch('/cookies', { credentials: 'include' })
  await expect(cookiesResponse.json()).resolves.toHaveProperty(
    'myCookie',
    'value',
  )

  setItem.mockRestore()
})
