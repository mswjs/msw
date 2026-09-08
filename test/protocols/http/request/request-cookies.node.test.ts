// @vitest-environment node
import { vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../setup/vitest-helpers'

const test = defineNetwork({
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

test.for<RequestCredentials>(['omit', 'same-origin', 'include'])(
  'does not inherit response cookies with credentials: %s',
  async (credentials) => {
    const response = await fetch('http://localhost/session', {
      method: 'POST',
      credentials,
    })
    expect(response.headers.getSetCookie()).toEqual([
      'sessionId=stored-session',
    ])

    const nextResponse = await fetch('http://localhost/session', {
      credentials,
    })
    expect(await nextResponse.json()).toEqual({
      cookies: {},
      cookieHeader: null,
    })

    const explicitResponse = await fetch('http://localhost/session', {
      credentials,
      headers: { Cookie: 'sessionId=explicit-session; userId=123' },
    })
    expect(await explicitResponse.json()).toEqual({
      cookies: { sessionId: 'explicit-session', userId: '123' },
      cookieHeader: 'sessionId=explicit-session; userId=123',
    })
  },
)

test('does not emulate document cookies when browser globals exist', async () => {
  const readCookie = vi.fn(() => 'documentCookie=value')
  const writeCookie = vi.fn()
  vi.stubGlobal('document', {
    get cookie() {
      return readCookie()
    },
    set cookie(value: string) {
      writeCookie(value)
    },
  })
  vi.stubGlobal('location', new URL('http://localhost'))

  try {
    await fetch('http://localhost/session', { method: 'POST' })
    const response = await fetch('http://localhost/session')

    expect(await response.json()).toEqual({
      cookies: {},
      cookieHeader: null,
    })
    expect(readCookie).not.toHaveBeenCalled()
    expect(writeCookie).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})
