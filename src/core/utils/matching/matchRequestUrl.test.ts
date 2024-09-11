// @vitest-environment jsdom
import { Match, matchRequestUrl } from './matchRequestUrl'

test('supports RegExp', () => {
  expect(
    matchRequestUrl(new URL('https://test.mswjs.io'), /test\.mswjs\.io/),
  ).toEqual<Match>({
    matches: true,
    params: {},
  })

  expect(
    matchRequestUrl(new URL('https://example.com'), /test\.mswjs\.io/),
  ).toEqual<Match>({
    matches: false,
    params: {},
  })
})

test('supports exact URL', () => {
  expect(
    matchRequestUrl(new URL('https://test.mswjs.io'), 'https://test.mswjs.io'),
  ).toEqual<Match>({
    matches: true,
    params: {},
  })

  // Must not match completely different URLs.
  expect(
    matchRequestUrl(new URL('https://example.com'), 'https://test.mswjs.io'),
  ).toEqual<Match>({
    matches: false,
    params: {},
  })
})

test('supports relative URLs', () => {
  /**
   * @note This only works because this test suite is using JSDOM,
   * and MSW rebases relative URLs in JSDOM against the document's base URI.
   */
  expect(matchRequestUrl(new URL('http://localhost'), '/foo')).toEqual<Match>({
    matches: false,
    params: {},
  })

  expect(
    matchRequestUrl(new URL('http://localhost/foo'), '/foo'),
  ).toEqual<Match>({
    matches: true,
    params: {},
  })

  expect(
    matchRequestUrl(new URL('http://localhost/foo'), './foo'),
  ).toEqual<Match>({
    matches: true,
    params: {},
  })
})

test('ignores trailing slashes for root-level URLs', () => {
  expect(
    matchRequestUrl(new URL('https://test.mswjs.io'), 'https://test.mswjs.io/'),
  ).toEqual<Match>({
    matches: true,
    params: {},
  })
})

test('respects trailing slashes for pathnames', () => {
  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/foo'),
      'https://test.mswjs.io/foo/',
    ),
  ).toEqual<Match>({
    matches: false,
    params: {},
  })
  expect(
    matchRequestUrl(
      new URL('https://api.github.com/made-up'),
      'https://api.github.com/made-up/',
    ),
  ).toEqual<Match>({
    matches: false,
    params: {},
  })
  expect(
    matchRequestUrl(
      new URL('https://api.github.com/made-up/'),
      'https://api.github.com/made-up',
    ),
  ).toEqual<Match>({
    matches: false,
    params: {},
  })
})

test('supports leading a wildcard as the entire pattern', () => {
  expect(matchRequestUrl(new URL('https://test.mswjs.io'), '*')).toEqual<Match>(
    {
      matches: true,
      params: { '0': 'https://test.mswjs.io/' },
    },
  )

  expect(
    matchRequestUrl(new URL('https://test.mswjs.io/path/here'), '*'),
  ).toEqual<Match>({
    matches: true,
    params: { '0': 'https://test.mswjs.io/path/here' },
  })
})

test('supports a leading wildcard', async () => {
  expect(
    matchRequestUrl(new URL('http://localhost/cookies'), '*/cookies'),
  ).toEqual<Match>({
    matches: true,
    params: { 0: 'http://localhost' },
  })

  expect(
    matchRequestUrl(new URL('http://localhost/dashboard/cookies'), '*/cookies'),
  ).toEqual<Match>({
    matches: true,
    params: { 0: 'http://localhost/dashboard' },
  })
})

test('supports a leading wildcard and path with a single unnamed group', () => {
  expect(
    matchRequestUrl(new URL('https://test.mswjs.io/user/123'), '*/user/*'),
  ).toEqual<Match>({
    matches: true,
    params: { '0': 'https://test.mswjs.io', '1': '123' },
  })

  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/user/123/456/789'),
      '*/user/*',
    ),
  ).toEqual<Match>({
    matches: true,
    params: { '0': 'https://test.mswjs.io', '1': '123/456/789' },
  })
})

test('supports a wildcard and path with multiple unnamed groups', () => {
  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/user/123/bar/456'),
      '*/user/*/bar/*',
    ),
  ).toEqual<Match>({
    matches: true,
    params: { '0': 'https://test.mswjs.io', '1': '123', '2': '456' },
  })
})

test('supports a leading wildcard and a path with wildcards and a single named group', () => {
  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/user/john/bar/456'),
      '*/user/:name/bar/*',
    ),
  ).toEqual<Match>({
    matches: true,
    params: {
      '0': 'https://test.mswjs.io',
      name: 'john',
      '1': '456',
    },
  })
})

test('supports a leading wildcard and a path with wildcards and a multiple named group', () => {
  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/user/foo/john/bar/456'),
      '*/user/*/:name/bar/*',
    ),
  ).toEqual<Match>({
    matches: true,
    params: {
      '0': 'https://test.mswjs.io',
      '1': 'foo',
      name: 'john',
      '2': '456',
    },
  })
})

test('decodes group matches', () => {
  const url = 'http://example.com:5001/example'
  expect(
    matchRequestUrl(
      new URL(`https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`),
      'https://test.mswjs.io/reflect-url/:url',
    ),
  ).toEqual<Match>({
    matches: true,
    params: { url },
  })
})

test('supports optional groups', () => {
  // Must match the URL if the optional parameter is present.
  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/user/abc-123'),
      'https://test.mswjs.io/user/:userId?',
    ),
  ).toEqual<Match>({
    matches: true,
    params: {
      userId: 'abc-123',
    },
  })

  // Must match the URL if the optional parameter is missing.
  expect(
    matchRequestUrl(
      new URL('https://test.mswjs.io/user'),
      'https://test.mswjs.io/user/:userId?',
    ),
  ).toEqual<Match>({
    matches: true,
    params: {
      // The optional parameter key must still be present,
      // with its value being undefined.
      userId: undefined,
    },
  })
})

test('supports repeated groups', () => {
  // Must match a single repeated group.
  expect(
    matchRequestUrl(
      new URL('https://example.com/product/one'),
      'https://example.com/product/:action+',
    ),
  ).toEqual<Match>({
    matches: true,
    params: {
      action: 'one',
    },
  })

  // Must match on multiple repeated groups.
  expect(
    matchRequestUrl(
      new URL('https://example.com/product/one/two/three'),
      'https://example.com/product/:action+',
    ),
  ).toEqual<Match>({
    matches: true,
    params: {
      /**
       * @note The whole match is a single string.
       * @see https://github.com/whatwg/urlpattern/issues/146
       */
      action: 'one/two/three',
    },
  })

  // Must match a repeated group within the path.
  expect(
    matchRequestUrl(
      new URL('https://example.com/product/one/two/end'),
      'https://example.com/product/:action+/end',
    ),
  ).toEqual<Match>({
    matches: true,
    params: {
      action: 'one/two',
    },
  })
})

test('supports in-component matches', () => {
  expect(
    matchRequestUrl(
      new URL('https://example.com/product/one.two'),
      'https://example.com/product/:first.:second',
    ),
  ).toEqual<Match>({
    matches: true,
    params: {
      first: 'one',
      second: 'two',
    },
  })
})
