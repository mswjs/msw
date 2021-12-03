/**
 * @jest-environment jsdom
 */
import { getAbsoluteUrl } from './getAbsoluteUrl'

test('rebases a relative URL against the current "baseURI" (default)', () => {
  expect(getAbsoluteUrl('/reviews')).toEqual('http://localhost/reviews')
})

test('rebases a relative URL against a custom base URL', () => {
  expect(getAbsoluteUrl('/user', 'https://api.github.com')).toEqual(
    'https://api.github.com/user',
  )
})

test('returns a given absolute URL as-is', () => {
  expect(getAbsoluteUrl('https://api.mswjs.io/users')).toEqual(
    'https://api.mswjs.io/users',
  )
})
