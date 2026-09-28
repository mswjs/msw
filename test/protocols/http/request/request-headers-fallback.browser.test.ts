/**
 * @see https://github.com/mswjs/msw/issues/2751
 */
import { vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../setup/vitest-helpers'

/**
 * @note Remove the Service Worker API before the network starts
 * so that `setupWorker()` falls back to the in-page interceptors
 * (the same as visiting an app on an insecure origin like "http://my.dev.com").
 */
Reflect.deleteProperty(Navigator.prototype, 'serviceWorker')

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
]

const test = defineTestNetwork({ handlers })

test.afterEach(() => {
  document.cookie.split(';').forEach((cookie) => {
    const [name] = cookie.trim().split('=')
    document.cookie = `${name}=; Max-Age=0; Path=/`
  })
})

test('does not set the forbidden "cookie" header on XMLHttpRequest in fallback mode', async ({
  page,
}) => {
  expect('serviceWorker' in navigator).toBe(false)

  bakeCookies(['documentCookie=value'])

  // Chromium ignores forbidden request headers in `setRequestHeader()`
  // and logs 'Refused to set unsafe header "cookie"' instead of throwing.
  // Spy on the native method to observe that attempt.
  const setRequestHeader = vi.spyOn(
    XMLHttpRequest.prototype,
    'setRequestHeader',
  )

  const requestUrl = new URL('/cookies', location.href).href

  page.evaluate((url) => {
    const request = new XMLHttpRequest()
    request.open('GET', url)
    request.send()
  }, requestUrl)

  const response = await page.waitForResponse(requestUrl)

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    documentCookie: 'value',
  })
  expect(setRequestHeader).not.toHaveBeenCalledWith(
    'cookie',
    expect.any(String),
  )

  setRequestHeader.mockRestore()
})
