import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../setup/vitest-helpers'

const test = defineTestNetwork({
  handlers: [
    http.post('*/session', () => {
      return new HttpResponse(null, {
        headers: { 'Set-Cookie': 'sessionId=stored-session' },
      })
    }),
    http.get('*/session', ({ cookies, request }) => {
      return HttpResponse.json({
        cookies,
        cookieHeader: request.headers.get('cookie'),
      })
    }),
    http.post('*/session/clear', () => {
      return new HttpResponse(null, {
        headers: { 'Set-Cookie': 'sessionId=; Max-Age=0; Path=/' },
      })
    }),
  ],
})

test.afterEach(async ({ fetch }) => {
  await fetch('/session/clear', { method: 'POST' })
})

/**
 * @note The "cookie" request header is a forbidden header name in the browser
 * and is never exposed on the request. Node.js has no cookie jar, so MSW does
 * not emulate one. In both environments, the "cookie" request header must only
 * reflect what the client explicitly sent, never the cookies MSW resolves.
 */
test('does not resolve any cookies with omitted credentials', async ({
  fetch,
}) => {
  await fetch('/session', { method: 'POST', credentials: 'omit' })

  const response = await fetch('/session', { credentials: 'omit' })
  await expect(response.json()).resolves.toEqual({
    cookies: {},
    cookieHeader: null,
  })
})

test('does not expose emulated cookies via the "cookie" request header with same-origin credentials', async ({
  fetch,
}) => {
  await fetch('/session', { method: 'POST', credentials: 'same-origin' })

  const response = await fetch('/session', { credentials: 'same-origin' })
  await expect(response.json()).resolves.toMatchObject({
    cookieHeader: null,
  })
})

test('does not expose emulated cookies via the "cookie" request header with included credentials', async ({
  fetch,
}) => {
  await fetch('/session', { method: 'POST', credentials: 'include' })

  const response = await fetch('/session', { credentials: 'include' })
  await expect(response.json()).resolves.toMatchObject({
    cookieHeader: null,
  })
})
