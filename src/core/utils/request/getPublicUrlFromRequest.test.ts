/**
 * @vitest-environment jsdom
 */
import { getPublicUrlFromRequest } from './getPublicUrlFromRequest'

test('returns an absolute request URL withouth search params', () => {
  expect(
    getPublicUrlFromRequest(new Request(new URL('https://test.mswjs.io/path'))),
  ).toBe('https://test.mswjs.io/path')

  expect(
    getPublicUrlFromRequest(new Request(new URL('http://localhost/path'))),
  ).toBe('/path')

  expect(
    getPublicUrlFromRequest(
      new Request(new URL('http://localhost/path?foo=bar')),
    ),
  ).toBe('/path')
})

it('returns a relative URL given the request to the same origin', () => {
  expect(getPublicUrlFromRequest(new Request('http://localhost/user'))).toBe(
    '/user',
  )
})
