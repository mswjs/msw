import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../setup/vitest-helpers'

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
]

const test = defineNetwork({ handlers })

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
