import { resolveRelativeUrl } from './resolveRelativeUrl'

test('resolves relative URL against current location', () => {
  expect(resolveRelativeUrl('/reviews')).toBe('http://localhost/reviews')
})

test('leaves absolute URL intact', () => {
  expect(resolveRelativeUrl('https://api.mswjs.io/users')).toBe(
    'https://api.mswjs.io/users',
  )
})
