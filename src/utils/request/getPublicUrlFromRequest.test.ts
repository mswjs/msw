/**
 * @jest-environment jsdom
 */
import { getPublicUrlFromRequest } from './getPublicUrlFromRequest'
import { MockedRequest } from './MockedRequest'

test('returns an absolute URL string given its origin differs from the referrer', () => {
  const request = new MockedRequest(new URL('https://test.mswjs.io/path'), {
    referrer: 'http://localhost',
  })
  expect(getPublicUrlFromRequest(request)).toBe('https://test.mswjs.io/path')
})

test('returns a relative URL string given its origin matches the referrer', () => {
  const request = new MockedRequest(new URL('http://localhost/path'), {
    referrer: 'http://localhost',
  })
  expect(getPublicUrlFromRequest(request)).toBe('/path')
})
