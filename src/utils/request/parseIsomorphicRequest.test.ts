/**
 * @jest-environment jsdom
 */
import { Headers } from 'headers-polyfill/lib'
import { parseIsomorphicRequest } from './parseIsomorphicRequest'
import { createIsomorphicRequest } from '../../../test/support/utils'
import { MockedRequest, passthrough } from '../../handlers/RequestHandler'

test('parses an isomorphic request', () => {
  const request = parseIsomorphicRequest(
    createIsomorphicRequest({
      id: 'request-1',
      method: 'POST',
      url: new URL('https://example.com/resource'),
      headers: new Headers({
        'Content-Type': 'application/json',
        Cookie: 'token=abc-123',
      }),
      body: JSON.stringify({
        id: 'user-1',
      }),
    }),
  )

  expect(request).toStrictEqual<MockedRequest>({
    id: 'request-1',
    method: 'POST',
    url: new URL('https://example.com/resource'),
    headers: new Headers({
      'Content-Type': 'application/json',
      Cookie: 'token=abc-123',
    }),
    cookies: {
      token: 'abc-123',
    },
    destination: 'document',
    credentials: 'same-origin',
    referrer: '',
    referrerPolicy: 'no-referrer',
    mode: 'cors',
    keepalive: false,
    integrity: '',
    redirect: 'manual',
    cache: 'default',
    bodyUsed: false,
    body: {
      id: 'user-1',
    },
    passthrough,
  })
})

test('preserves cookies for request with "same-origin" credentials', () => {
  const request = parseIsomorphicRequest(
    createIsomorphicRequest({
      credentials: 'same-origin',
      headers: new Headers({
        Cookie: 'foo=bar',
      }),
    }),
  )

  expect(request).toMatchObject<Partial<MockedRequest>>({
    credentials: 'same-origin',
    cookies: { foo: 'bar' },
  })
})

test('preserves cookies for request with "include" credentials', () => {
  const request = parseIsomorphicRequest(
    createIsomorphicRequest({
      credentials: 'include',
      headers: new Headers({
        Cookie: 'foo=bar',
      }),
    }),
  )

  expect(request).toMatchObject<Partial<MockedRequest>>({
    credentials: 'include',
    cookies: { foo: 'bar' },
  })
})

test('sets request "credentials" to "same-origin" when no credentials were provided', () => {
  const request = parseIsomorphicRequest(
    createIsomorphicRequest({
      credentials: undefined,
    }),
  )

  expect(request).toMatchObject<Partial<MockedRequest>>({
    credentials: 'same-origin',
  })
})
