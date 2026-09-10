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

test.afterEach(() => {
  vi.unstubAllGlobals()
})

test('does not inherit response cookies with omitted credentials', async () => {
  await fetch('http://localhost/session', {
    method: 'POST',
    credentials: 'omit',
  })

  const response = await fetch('http://localhost/session', {
    credentials: 'omit',
  })
  await expect(response.json()).resolves.toEqual({
    cookies: {},
    cookieHeader: null,
  })
})

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
