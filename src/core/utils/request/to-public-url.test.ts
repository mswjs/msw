// @vitest-environment jsdom
import { toPublicUrl } from './to-public-url'

test('returns an absolute request URL without search params', () => {
  expect(toPublicUrl(new URL('https://test.mswjs.io/path'))).toBe(
    'https://test.mswjs.io/path',
  )

  expect(toPublicUrl(new URL('http://localhost/path'))).toBe('/path')

  expect(toPublicUrl(new URL('http://localhost/path?foo=bar'))).toBe('/path')
})

test('returns a relative URL given the request to the same origin', () => {
  expect(toPublicUrl('http://localhost/user')).toBe('/user')
})
