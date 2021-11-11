/**
 * @jest-environment jsdom
 */
import { coercePath, matchRequestUrl } from './matchRequestUrl'

test('returns true when matched against a wildcard', () => {
  const match = matchRequestUrl(new URL('https://test.mswjs.io'), '*')
  expect(match).toHaveProperty('matches', true)
  expect(match).toHaveProperty('params', {
    '0': 'https://test.mswjs.io/',
  })
})

test('returns true when matches against an exact URL', () => {
  const match = matchRequestUrl(
    new URL('https://test.mswjs.io'),
    'https://test.mswjs.io',
  )
  expect(match).toHaveProperty('matches', true)
  expect(match).toHaveProperty('params', {})
})

test('returns true when matched against a RegExp', () => {
  const match = matchRequestUrl(
    new URL('https://test.mswjs.io'),
    /test\.mswjs\.io/,
  )
  expect(match).toHaveProperty('matches', true)
  expect(match).toHaveProperty('params', {})
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

test('decodes request parameters', () => {
  const url = 'http://example.com:5001/example'
  const match = matchRequestUrl(
    new URL(`https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`),
    'https://test.mswjs.io/reflect-url/:url',
  )
  expect(match).toHaveProperty('matches', true)
  expect(match).toHaveProperty('params', {
    url,
  })
})

test('returns false when does not match against the request URL', () => {
  const match = matchRequestUrl(
    new URL('https://test.mswjs.io'),
    'https://google.com',
  )
  expect(match).toHaveProperty('matches', false)
  expect(match).toHaveProperty('params', {})
})

describe('coercePath', () => {
  test('escapes semicolor in a protocol', () => {
    expect(coercePath('https://example.com')).toEqual('https\\://example.com')
    expect(coercePath('https://example.com/:userId')).toEqual(
      'https\\://example.com/:userId',
    )
    expect(coercePath('http://localhost:3000')).toEqual(
      'http\\://localhost:3000',
    )
  })

  test('replaces wildcard with an unnnamed capturing group', () => {
    expect(coercePath('*')).toEqual('(.*)')
    expect(coercePath('**')).toEqual('(.*)')
    expect(coercePath('/user/*')).toEqual('/user/(.*)')
    expect(coercePath('https://example.com/user/*')).toEqual(
      'https\\://example.com/user/(.*)',
    )
  })

  test('preserves "*" parameter modifier', () => {
    expect(coercePath(':name*')).toEqual(':name*')
    expect(coercePath('/foo/:name*')).toEqual('/foo/:name*')
    expect(coercePath('/foo/**:name*')).toEqual('/foo/(.*):name*')
    expect(coercePath('**/foo/*/:name*')).toEqual('(.*)/foo/(.*)/:name*')
  })
})
