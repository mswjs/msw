/**
 * @jest-environment jsdom
 */
import { MockedRequest } from '../../handlers/requestHandler'
import { getRequestCookies } from './getRequestCookies'

beforeAll(() => {
  // Emulate some `document.cookie` value.
  document.cookie = 'auth-token=abc-123;'
  document.cookie = 'custom-cookie=yes;'
})

afterAll(() => {
  // Clean up the `document.cookie` value.
  document.cookie = ''
})

test('returns all document cookies given "include" credentials', () => {
  const cookies = getRequestCookies({
    url: new URL(`${location.origin}/user`),
    credentials: 'include',
  } as MockedRequest)

  expect(cookies).toEqual({
    'auth-token': 'abc-123',
    'custom-cookie': 'yes',
  })
})

test('returns all document cookies given "same-origin" credentials and the same request origin', () => {
  const cookies = getRequestCookies({
    url: new URL(`${location.origin}/user`),
    credentials: 'same-origin',
  } as MockedRequest)

  expect(cookies).toEqual({
    'auth-token': 'abc-123',
    'custom-cookie': 'yes',
  })
})

test('returns an empty object given "same-origin" credentials and a different request origin', () => {
  const cookies = getRequestCookies({
    url: new URL(`https://test.mswjs.io/user`),
    credentials: 'same-origin',
  } as MockedRequest)

  expect(cookies).toEqual({})
})

test('returns an empty object given "omit" credentials', () => {
  const cookies = getRequestCookies({
    url: new URL(`${location.origin}/user`),
    credentials: 'omit',
  } as MockedRequest)

  expect(cookies).toEqual({})
})
