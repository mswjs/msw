import { getPublicUrlFromRequest } from './getPublicUrlFromRequest'
import { MockedRequest } from '../../handlers/requestHandler'

test('returns an absolute URL string given its origin differs from the referrer', () => {
  const request = {
    url: new URL('https://test.mswjs.io/path'),
    referrer: 'http://localhost',
  } as MockedRequest
  expect(getPublicUrlFromRequest(request)).toBe('https://test.mswjs.io/path')
})

test('returns a relative URL string given its origin matches the referrer', () => {
  const request = {
    url: new URL('http://localhost/path'),
    referrer: 'http://localhost',
  } as MockedRequest
  expect(getPublicUrlFromRequest(request)).toBe('/path')
})
