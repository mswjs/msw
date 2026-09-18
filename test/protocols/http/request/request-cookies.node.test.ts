// @vitest-environment node
import { vi } from 'vitest'
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

test.afterEach(() => {
  vi.unstubAllGlobals()
})

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

  await fetch('http://localhost/session', { method: 'POST' })
  const response = await fetch('http://localhost/session')

  await expect(response.json()).resolves.toEqual({
    cookies: {},
    cookieHeader: null,
  })
  expect(readCookie).not.toHaveBeenCalled()
  expect(writeCookie).not.toHaveBeenCalled()
})
