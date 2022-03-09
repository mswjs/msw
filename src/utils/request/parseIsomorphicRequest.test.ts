/**
 * @jest-environment jsdom
 */
import { IsomorphicRequest } from '@mswjs/interceptors'
import { Headers } from 'headers-polyfill/lib'
import { parseIsomorphicRequest } from './parseIsomorphicRequest'

function createIsomorphicRequest(
  overrides: Partial<IsomorphicRequest> = {},
): IsomorphicRequest {
  return {
    id: overrides.id ?? '1',
    url: overrides.url ?? new URL(location.origin),
    method: overrides.method ?? 'GET',
    headers: overrides.headers ?? new Headers([]),
    credentials: overrides.credentials ?? 'same-origin',
  }
}

test('returns an mocked request with credentials=same-origin', () => {
  const request = createIsomorphicRequest({
    credentials: 'same-origin',
    headers: new Headers({
      Cookie: 'foo=bar',
    }),
  })
  expect(parseIsomorphicRequest(request).credentials).toBe('same-origin')
  expect(parseIsomorphicRequest(request).cookies).toEqual({ foo: 'bar' })
})

test('returns an mocked request with credentials=include', () => {
  const request = createIsomorphicRequest({
    credentials: 'include',
    headers: new Headers({
      Cookie: 'foo=bar',
    }),
  })
  expect(parseIsomorphicRequest(request).credentials).toBe('include')
  expect(parseIsomorphicRequest(request).cookies).toEqual({ foo: 'bar' })
})
