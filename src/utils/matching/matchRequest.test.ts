/**
 * @jest-environment jsdom
 */
import { matchRequestUrl } from './matchRequest'

test('returns true when matched against a wildcard', () => {
  const match = matchRequestUrl(new URL('https://test.mswjs.io'), '*')
  expect(match).toHaveProperty('matches', true)
  expect(match).toHaveProperty('params', null)
})

test('returns true when matches against an exact URL', () => {
  const match = matchRequestUrl(
    new URL('https://test.mswjs.io'),
    'https://test.mswjs.io',
  )
  expect(match).toHaveProperty('matches', true)
  expect(match).toHaveProperty('params', null)
})

test('returns true when matched against a RegExp', () => {
  const match = matchRequestUrl(
    new URL('https://test.mswjs.io'),
    /test\.mswjs\.io/,
  )
  expect(match).toHaveProperty('matches', true)
  expect(match).toHaveProperty('params', null)
})

test('returns request parameters when matched', () => {
  const match = matchRequestUrl(
    new URL('https://test.mswjs.io/user/abc-123'),
    'https://test.mswjs.io/user/:userId',
  )
  expect(match).toHaveProperty('matches', true)
  expect(match).toHaveProperty('params', {
    userId: 'abc-123',
  })
})

test('returns false when does not match against the request URL', () => {
  const match = matchRequestUrl(
    new URL('https://test.mswjs.io'),
    'https://google.com',
  )
  expect(match).toHaveProperty('matches', false)
  expect(match).toHaveProperty('params', null)
})
