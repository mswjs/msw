/**
 * @vitest-environment jsdom
 */
import { getRequestCookies } from './getRequestCookies'
import { clearCookies } from '../../../../test/support/utils'

beforeAll(() => {
  // Emulate some `document.cookie` value.
  document.cookie = 'auth-token=abc-123;'
  document.cookie = 'custom-cookie=yes;'
  document.cookie = `encoded-cookie=${encodeURIComponent('测试')};`
})

afterAll(() => {
  clearCookies()
})

test('returns all document cookies given "include" credentials', () => {
  const cookies = getRequestCookies(
    new Request(new URL('/user', location.origin), {
      credentials: 'include',
    }),
  )

  expect(cookies).toEqual({
    'auth-token': 'abc-123',
    'custom-cookie': 'yes',
    'encoded-cookie': '测试',
  })
})

test('returns all document cookies given "same-origin" credentials and the same request origin', () => {
  const cookies = getRequestCookies(
    new Request(new URL('/user', location.origin), {
      credentials: 'same-origin',
    }),
  )

  expect(cookies).toEqual({
    'auth-token': 'abc-123',
    'custom-cookie': 'yes',
    'encoded-cookie': '测试',
  })
})

test('returns an empty object given "same-origin" credentials and a different request origin', () => {
  const cookies = getRequestCookies(
    new Request(new URL('https://test.mswjs.io/user'), {
      credentials: 'same-origin',
    }),
  )

  expect(cookies).toEqual({})
})

test('returns an empty object given "omit" credentials', () => {
  const cookies = getRequestCookies(
    new Request(new URL('/user', location.origin), {
      credentials: 'omit',
    }),
  )

  expect(cookies).toEqual({})
})
