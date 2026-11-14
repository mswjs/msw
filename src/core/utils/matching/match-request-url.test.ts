// @vitest-environment jsdom
import { matchRequestUrl } from './match-request-url'

test('returns true when matched against a string URL', () => {
  expect(
    matchRequestUrl(new URL('https://test.mswjs.io'), 'https://test.mswjs.io'),
  ).toEqual({
    matches: true,
    params: {},
  })
})

test('returns false when a string URL does not match', () => {
  expect(
    matchRequestUrl(new URL('https://test.mswjs.io'), 'https://google.com'),
  ).toEqual({
    matches: false,
    params: {},
  })
})

test('returns true when matched against a RegExp', () => {
  expect(
    matchRequestUrl(new URL('https://test.mswjs.io'), /test\.mswjs\.io/),
  ).toEqual({
    matches: true,
    params: {},
  })
})

test('returns false when a RegExp does not match', () => {
  expect(matchRequestUrl(new URL('https://test.mswjs.io'), /foo\.bar/)).toEqual(
    {
      matches: false,
      params: {},
    },
  )

  expect(
    matchRequestUrl(new URL('https://test.mswjs.io'), /foo\.bar/g),
  ).toEqual({
    matches: false,
    params: {},
  })

  expect(matchRequestUrl(new URL('https://test.mswjs.io'), /foo(.+)/)).toEqual({
    matches: false,
    params: {},
  })

  expect(matchRequestUrl(new URL('https://test.mswjs.io'), /foo(.+)/g)).toEqual(
    {
      matches: false,
      params: {},
    },
  )
})

test('ignores query parameters when matching against a RegExp', () => {
  expect(
    matchRequestUrl(new URL('https://test.mswjs.io/path?foo=bar'), /\/path$/),
  ).toEqual({
    matches: true,
    params: {},
  })
})

test('parses matching RegExp groups into index-based parameters', () => {
  expect(
    matchRequestUrl(new URL('https://test.mswjs.io/path'), /(.+)\.mswjs\.io/g),
  ).toEqual({
    matches: true,
    params: {
      0: 'https://test',
    },
  })

  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/path'),
      /https:\/\/(.+)\.mswjs\.io\/(.+)/g,
    ),
  ).toEqual({
    matches: true,
    params: {
      0: 'test',
      1: 'path',
    },
  })
})

test('returns true when matching optional path parameters in the middle of the path', () => {
  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/user/abc-123/settings'),
      'https://test.mswjs.io/user/:userId?/settings',
    ),
  ).toEqual({
    matches: true,
    params: {
      userId: 'abc-123',
    },
  })

  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/user/settings'),
      'https://test.mswjs.io/user/:userId?/settings',
    ),
  ).toEqual({
    matches: true,
    params: {},
  })

  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/user/abc-123'),
      'https://test.mswjs.io/user/:userId?/settings',
    ),
  ).toEqual({
    matches: false,
    params: {},
  })
})

test('returns true when matching optional path parameters separated by a dot', () => {
  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/files/report.pdf'),
      'https://test.mswjs.io/files/:name?.:ext?',
    ),
  ).toEqual({
    matches: true,
    params: {
      name: 'report',
      ext: 'pdf',
    },
  })
})
