// @vitest-environment jsdom
import { matchRequestUrl } from './matchRequestUrl'

describe(matchRequestUrl, () => {
  test('returns true when matches against an exact URL', () => {
    expect(
      matchRequestUrl(
        new URL('https://test.mswjs.io'),
        'https://test.mswjs.io',
      ),
    ).toEqual({
      matches: true,
      params: {},
    })
  })

  test('returns true when matched against a wildcard', () => {
    expect(matchRequestUrl(new URL('https://test.mswjs.io'), '*')).toEqual({
      matches: true,
      params: {
        '0': 'https://test.mswjs.io/',
      },
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

  test('returns path parameters when matched', () => {
    expect(
      matchRequestUrl(
        new URL('https://test.mswjs.io/user/abc-123'),
        'https://test.mswjs.io/user/:userId',
      ),
    ).toEqual({
      matches: true,
      params: {
        userId: 'abc-123',
      },
    })
  })

  test('decodes path parameters', () => {
    const url = 'http://example.com:5001/example'

    expect(
      matchRequestUrl(
        new URL(`https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`),
        'https://test.mswjs.io/reflect-url/:url',
      ),
    ).toEqual({
      matches: true,
      params: {
        url,
      },
    })
  })

  test('returns false when does not match against the request URL', () => {
    expect(
      matchRequestUrl(new URL('https://test.mswjs.io'), 'https://google.com'),
    ).toEqual({
      matches: false,
      params: {},
    })
  })

  test('returns true when matching optional path parameters', () => {
    expect(
      matchRequestUrl(
        new URL('https://test.mswjs.io/user/123'),
        'https://test.mswjs.io/user/:userId?',
      ),
    ).toEqual({
      matches: true,
      params: {
        userId: '123',
      },
    })
  })

  test('returns true when matching URLs with wildcard ports', () => {
    expect
      .soft(
        matchRequestUrl(new URL('http://localhost:3000'), 'http://localhost:*'),
      )
      .toEqual({
        matches: true,
        params: {
          '0': '3000/',
        },
      })

    expect
      .soft(
        matchRequestUrl(
          new URL('http://localhost:3000'),
          'http://localhost:*/',
        ),
      )
      .toEqual({
        matches: true,
        params: {
          '0': '3000',
        },
      })
  })

  test('returns true when matching URLs with wildcard ports and pathnames', () => {
    expect(
      matchRequestUrl(
        new URL('http://localhost:3000/resource'),
        'http://localhost:*/resource',
      ),
    ).toEqual({
      matches: true,
      params: {
        '0': '3000',
      },
    })
  })

  test('matches wildcard ports with other wildcard parameters', () => {
    expect(
      matchRequestUrl(
        new URL('http://subdomain.localhost:3000/user/settings'),
        'http://*.localhost:*/user/*',
      ),
    ).toEqual({
      matches: true,
      params: {
        '0': 'subdomain',
        '1': '3000',
        '2': 'settings',
      },
    })
  })

  test('matches wildcard ports that also match a part of the pathname', () => {
    expect(
      matchRequestUrl(
        new URL('http://localhost:3000/user/settings'),
        'http://localhost:*/settings',
      ),
    ).toEqual({
      matches: true,
      params: {
        '0': '3000/user',
      },
    })
  })

  test('returns true for matching WebSocket URL', () => {
    expect(
      matchRequestUrl(new URL('ws://test.mswjs.io'), 'ws://test.mswjs.io'),
    ).toEqual({
      matches: true,
      params: {},
    })
    expect(
      matchRequestUrl(new URL('wss://test.mswjs.io'), 'wss://test.mswjs.io'),
    ).toEqual({
      matches: true,
      params: {},
    })
  })

  test('returns false for non-matching WebSocket URL', () => {
    expect(
      matchRequestUrl(new URL('ws://test.mswjs.io'), 'ws://foo.mswjs.io'),
    ).toEqual({
      matches: false,
      params: {},
    })
    expect(
      matchRequestUrl(new URL('wss://test.mswjs.io'), 'wss://completely.diff'),
    ).toEqual({
      matches: false,
      params: {},
    })
  })

  test('returns path parameters when matched a WebSocket URL', () => {
    expect(
      matchRequestUrl(
        new URL('wss://test.mswjs.io'),
        'wss://:service.mswjs.io',
      ),
    ).toEqual({
      matches: true,
      params: {
        service: 'test',
      },
    })
  })

  test('returns true for matching WebSocket URLs with wildcard ports', () => {
    expect(
      matchRequestUrl(new URL('ws://localhost:3000'), 'ws://localhost:*'),
    ).toEqual({
      matches: true,
      params: {
        '0': '3000/',
      },
    })
  })
})
