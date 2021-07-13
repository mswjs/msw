/**
 * @jest-environment jsdom
 */
import { getAbsoluteUrl } from './getAbsoluteUrl'

test('returns an absolute URL from the given relative URL', () => {
  expect(getAbsoluteUrl('/reviews')).toBe('http://localhost/reviews')
})

test('returns given absolute URL as-is', () => {
  expect(getAbsoluteUrl('https://api.mswjs.io/users')).toBe(
    'https://api.mswjs.io/users',
  )
})
