/**
 * @jest-environment node
 */
import { resolveRelativeUrl } from './resolveRelativeUrl'

test('leaves relative URL intact', () => {
  expect(resolveRelativeUrl('/reviews')).toBe('/reviews')
})

test('leaves absolute URL intact', () => {
  expect(resolveRelativeUrl('https://api.mswjs.io/users')).toBe(
    'https://api.mswjs.io/users',
  )
})
