import { WebSocketHandler } from './websocket-handler'

describe('parse', () => {
  test('matches an exact url', () => {
    expect(
      new WebSocketHandler('ws://localhost:3000').parse({
        url: new URL('ws://localhost:3000'),
      }),
    ).toEqual({
      match: {
        matches: true,
        params: {},
      },
    })
  })

  test('ignores trailing slash', () => {
    expect(
      new WebSocketHandler('ws://localhost:3000').parse({
        url: new URL('ws://localhost:3000/'),
      }),
    ).toEqual({
      match: {
        matches: true,
        params: {},
      },
    })

    expect(
      new WebSocketHandler('ws://localhost:3000/').parse({
        url: new URL('ws://localhost:3000/'),
      }),
    ).toEqual({
      match: {
        matches: true,
        params: {},
      },
    })
  })

  test('supports path parameters', () => {
    expect(
      new WebSocketHandler('ws://localhost:3000/:serviceName').parse({
        url: new URL('ws://localhost:3000/auth'),
      }),
    ).toEqual({
      match: {
        matches: true,
        params: {
          serviceName: 'auth',
        },
      },
    })
  })

  test('ignores "/socket.io/" prefix in the client url', () => {
    expect(
      new WebSocketHandler('ws://localhost:3000').parse({
        url: new URL(
          'ws://localhost:3000/socket.io/?EIO=4&transport=websocket',
        ),
      }),
    ).toEqual({
      match: {
        matches: true,
        params: {},
      },
    })

    expect(
      new WebSocketHandler('ws://localhost:3000/non-matching').parse({
        url: new URL(
          'ws://localhost:3000/socket.io/?EIO=4&transport=websocket',
        ),
      }),
    ).toEqual({
      match: {
        matches: false,
        params: {},
      },
    })
  })

  test('preserves non-prefix "/socket.io/" path segment', () => {
    /**
     * @note It is highly unlikely but we still shouldn't modify the
     * WebSocket client URL if it contains a user-defined "socket.io" segment.
     */
    expect(
      new WebSocketHandler('ws://localhost:3000/clients/socket.io/123').parse({
        url: new URL('ws://localhost:3000/clients/socket.io/123'),
      }),
    ).toEqual({
      match: {
        matches: true,
        params: {},
      },
    })

    expect(
      new WebSocketHandler('ws://localhost:3000').parse({
        url: new URL('ws://localhost:3000/clients/socket.io/123'),
      }),
    ).toEqual({
      match: {
        matches: false,
        params: {},
      },
    })
  })

  test('supports a custom resolution context (base url)', () => {
    expect(
      new WebSocketHandler('/api/ws').parse({
        url: new URL('ws://localhost:3000/api/ws'),
        resolutionContext: {
          baseUrl: 'ws://localhost:3000/',
        },
      }),
    ).toEqual({
      match: {
        matches: true,
        params: {},
      },
    })
  })
})

describe('test', () => {
  test('returns true for a matching string', () => {
    expect(
      new WebSocketHandler('ws://localhost/ws').test('ws://localhost/ws'),
    ).toBe(true)
  })

  test('returns false for a non-matching string', () => {
    expect(
      new WebSocketHandler('ws://localhost/ws').test('ws://localhost/other'),
    ).toBe(false)
  })

  test('returns true for a relative matching string', () => {
    expect(
      new WebSocketHandler('ws://localhost/ws').test('/ws', {
        baseUrl: 'ws://localhost',
      }),
    ).toBe(true)
  })

  test('returns false for a relative non-matching string', () => {
    expect(
      new WebSocketHandler('ws://localhost/ws').test('/other', {
        baseUrl: 'ws://localhost',
      }),
    ).toBe(false)
  })

  test('returns true for a matching URL', () => {
    expect(
      new WebSocketHandler('ws://localhost/ws').test(
        new URL('ws://localhost/ws'),
      ),
    ).toBe(true)
  })

  test('returns false for a non-matching URL', () => {
    expect(
      new WebSocketHandler('ws://localhost/ws').test(
        new URL('ws://localhost/other'),
      ),
    ).toBe(false)
  })

  test('returns true for a matching HTTP url string', () => {
    expect(
      new WebSocketHandler('ws://localhost/ws').test('http://localhost/ws'),
    ).toBe(true)
  })

  test('returns false for a non-matching HTTP url string', () => {
    expect(
      new WebSocketHandler('ws://localhost/ws').test('http://localhost/other'),
    ).toBe(false)
  })
})
