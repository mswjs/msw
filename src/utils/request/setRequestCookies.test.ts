/**
 * @jest-environment jsdom
 */
import { Headers } from 'headers-polyfill/lib'
import { setRequestCookies } from './setRequestCookies'
import { clearCookies, createMockedRequest } from '../../../test/support/utils'

beforeAll(() => {
  clearCookies()
})

afterEach(() => {
  clearCookies()
})

test('preserves request cookies when there are no document cookies to infer', () => {
  const request = createMockedRequest({
    headers: new Headers({
      Cookie: 'token=abc-123',
    }),
  })
  setRequestCookies(request)

  expect(request.cookies).toEqual({
    token: 'abc-123',
  })
  expect(request.headers.get('cookie')).toEqual('token=abc-123')
})

test('infers document cookies for request with "same-origin" credentials', () => {
  // Emulate cookies already present on the document.
  document.cookie = 'documentCookie=yes'

  const request = createMockedRequest({
    // Make the request to the same origin as the document location.
    url: new URL('/resource', location.href),
    headers: new Headers({
      Cookie: 'token=abc-123',
    }),
    credentials: 'same-origin',
  })
  setRequestCookies(request)

  expect(request.headers.get('cookie')).toEqual(
    'token=abc-123, documentCookie=yes',
  )
  expect(request.cookies).toEqual({
    // Cookies present in the document must be forwarded.
    documentCookie: 'yes',
    token: 'abc-123',
  })
})

test('does not infer document cookies for request with "same-origin" credentials made to extraneous origin', () => {
  // Emulate cookies already present on the document.
  document.cookie = 'documentCookie=yes'

  const request = createMockedRequest({
    // Make the request to a different origin as the document location.
    url: new URL('/resource', 'https://example.com'),
    headers: new Headers({
      Cookie: 'token=abc-123',
    }),
    credentials: 'same-origin',
  })
  setRequestCookies(request)

  expect(request.headers.get('cookie')).toEqual('token=abc-123')
  expect(request.cookies).toEqual({
    token: 'abc-123',
  })
})

test('infers document cookies for request with "include" credentials', () => {
  // Emulate cookies already present on the document.
  document.cookie = 'documentCookie=yes'

  const request = createMockedRequest({
    // Make the request to a different origin as the document location.
    url: new URL('/resource', location.href),
    headers: new Headers({
      Cookie: 'token=abc-123',
    }),
    credentials: 'include',
  })
  setRequestCookies(request)

  expect(request.headers.get('cookie')).toEqual(
    'token=abc-123, documentCookie=yes',
  )
  expect(request.cookies).toEqual({
    // Cookies present in the document must be forwarded regardless.
    documentCookie: 'yes',
    token: 'abc-123',
  })
})

test('infers document cookies for request with "include" credentials made to extraneous origin', () => {
  // Emulate cookies already present on the document.
  document.cookie = 'documentCookie=yes'

  const request = createMockedRequest({
    // Make the request to a different origin as the document location.
    url: new URL('/resource', 'https://example.com'),
    headers: new Headers({
      Cookie: 'token=abc-123',
    }),
    credentials: 'include',
  })
  setRequestCookies(request)

  expect(request.headers.get('cookie')).toEqual(
    'token=abc-123, documentCookie=yes',
  )
  expect(request.cookies).toEqual({
    // Cookies present in the document must be forwarded regardless.
    documentCookie: 'yes',
    token: 'abc-123',
  })
})
