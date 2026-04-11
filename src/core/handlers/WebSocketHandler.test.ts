import {
  WebSocketHandler,
  createStopPropagationListener,
} from './WebSocketHandler'

describe('createStopPropagationListener', () => {
  it('does not crash when event.stopPropagation is undefined (Hermes polyfill)', () => {
    const handler = new WebSocketHandler('ws://localhost')

    // Simulate a Hermes-like Event where stopPropagation is not defined.
    const event = {
      type: 'message',
    } as unknown as Event

    expect(event.stopPropagation).toBeUndefined()

    const listener = createStopPropagationListener(handler)
    expect(() => listener(event)).not.toThrow()
  })

  it('patches stopPropagation on a standard Event', () => {
    const handler = new WebSocketHandler('ws://localhost')
    const event = new Event('message')

    const listener = createStopPropagationListener(handler)
    listener(event)

    // stopPropagation should be patched and still callable.
    expect(() => event.stopPropagation()).not.toThrow()
    // Verify the patched side effect was applied.
    expect(Reflect.get(event, 'kPropagationStoppedAt')).toBe(handler.id)
  })
})

describe('parse', () => {
  it('matches an exact url', () => {
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

  it('ignores trailing slash', () => {
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

  it('supports path parameters', () => {
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

  it('ignores "/socket.io/" prefix in the client url', () => {
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

  it('preserves non-prefix "/socket.io/" path segment', () => {
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

  it('supports a custom resolution context (base url)', () => {
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
