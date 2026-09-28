// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../setup/vitest-helpers'

const test = defineTestNetwork({
  handlers: [
    http.post('http://localhost/session', () => {
      return new HttpResponse(null, {
        headers: { 'Set-Cookie': 'sessionId=stored-session' },
      })
    }),
    http.get('http://localhost/session', ({ cookies, request }) => {
      return HttpResponse.json({
        cookies,
        cookieHeader: request.headers.get('cookie'),
      })
    }),
  ],
})

/**
 * @note Node.js has no cookie jar. Unlike the browser, mocked "Set-Cookie"
 * response headers are not remembered and never resolve on later requests.
 * The environment-agnostic expectations live in "request-credentials.test.ts".
 */
test('does not inherit response cookies with same-origin credentials', async () => {
  await fetch('http://localhost/session', {
    method: 'POST',
    credentials: 'same-origin',
  })

  const response = await fetch('http://localhost/session', {
    credentials: 'same-origin',
  })
  await expect(response.json()).resolves.toEqual({
    cookies: {},
    cookieHeader: null,
  })
})

test('does not inherit response cookies with included credentials', async () => {
  await fetch('http://localhost/session', {
    method: 'POST',
    credentials: 'include',
  })

  const response = await fetch('http://localhost/session', {
    credentials: 'include',
  })
  await expect(response.json()).resolves.toEqual({
    cookies: {},
    cookieHeader: null,
  })
})

test('preserves explicit request cookies with omitted credentials', async () => {
  await fetch('http://localhost/session', { method: 'POST' })

  const response = await fetch('http://localhost/session', {
    credentials: 'omit',
    headers: { Cookie: 'sessionId=explicit-session; userId=123' },
  })
  await expect(response.json()).resolves.toEqual({
    cookies: { sessionId: 'explicit-session', userId: '123' },
    cookieHeader: 'sessionId=explicit-session; userId=123',
  })
})

test('preserves explicit request cookies with same-origin credentials', async () => {
  await fetch('http://localhost/session', { method: 'POST' })

  const response = await fetch('http://localhost/session', {
    credentials: 'same-origin',
    headers: { Cookie: 'sessionId=explicit-session; userId=123' },
  })
  await expect(response.json()).resolves.toEqual({
    cookies: { sessionId: 'explicit-session', userId: '123' },
    cookieHeader: 'sessionId=explicit-session; userId=123',
  })
})

test('preserves explicit request cookies with included credentials', async () => {
  await fetch('http://localhost/session', { method: 'POST' })

  const response = await fetch('http://localhost/session', {
    credentials: 'include',
    headers: { Cookie: 'sessionId=explicit-session; userId=123' },
  })
  await expect(response.json()).resolves.toEqual({
    cookies: { sessionId: 'explicit-session', userId: '123' },
    cookieHeader: 'sessionId=explicit-session; userId=123',
  })
})
