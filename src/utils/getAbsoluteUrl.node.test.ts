/**
 * @jest-environment node
 */
import { getAbsoluteUrl } from './getAbsoluteUrl'

test('returns given relative URL as-is', () => {
  expect(getAbsoluteUrl('/reviews')).toBe('/reviews')
})

test('returns given absolute URL as-is', () => {
  expect(getAbsoluteUrl('https://api.mswjs.io/users')).toBe(
    'https://api.mswjs.io/users',
  )
})
